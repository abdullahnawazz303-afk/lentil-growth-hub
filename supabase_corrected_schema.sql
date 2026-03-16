-- ============================================================
-- LPFMS - Lentil Packaging Factory Management System
-- CORRECTED SUPABASE SCHEMA v2.1
-- Ensures all dependencies exist before creating tables/functions.
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. BASE TABLES (No Foreign Keys pointing to later tables)
-- ============================================================

-- Vendors Table
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendors_name ON vendors(name);
CREATE INDEX idx_vendors_is_active ON vendors(is_active);

-- Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit_limit NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- Users Table
-- Supabase automatically provides the auth.users schema, ensuring `auth.users(id)` exists.
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'viewer' 
    CHECK (role IN ('admin', 'manager', 'cashier', 'viewer', 'customer')),
  account_type TEXT NOT NULL DEFAULT 'staff' 
    CHECK (account_type IN ('staff', 'customer')),
  customer_id UUID REFERENCES customers(id), -- Linked to customers table now that it exists
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_account_type ON users(account_type);
CREATE INDEX idx_users_customer_id ON users(customer_id);

-- Auto-create user profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'),
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'staff')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safely drop the trigger if it exists before recreating
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 2. SEQUENCES
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS batch_ref_seq;
CREATE SEQUENCE IF NOT EXISTS purchase_ref_seq;
CREATE SEQUENCE IF NOT EXISTS booking_ref_seq;
CREATE SEQUENCE IF NOT EXISTS process_ref_seq;
CREATE SEQUENCE IF NOT EXISTS order_ref_seq;
CREATE SEQUENCE IF NOT EXISTS sale_ref_seq;


-- ============================================================
-- 3. SECONDARY TABLES (Depending on Base Tables)
-- ============================================================

-- Vendor Purchases Table (Before Inventory Batches because `source_id` could reference it)
CREATE TABLE vendor_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_ref TEXT NOT NULL UNIQUE DEFAULT '',
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(15,2) NOT NULL,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  outstanding NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_terms_days INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  payment_method TEXT CHECK (payment_method IN ('Cash', 'Bank', 'Cheque', 'Other')),
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' 
    CHECK (payment_status IN ('Paid', 'Partially Paid', 'Unpaid')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vendor_purchases_vendor ON vendor_purchases(vendor_id);
CREATE INDEX idx_vendor_purchases_due_date ON vendor_purchases(due_date);
CREATE INDEX idx_vendor_purchases_status ON vendor_purchases(payment_status);

CREATE OR REPLACE FUNCTION generate_purchase_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.purchase_ref IS NULL OR NEW.purchase_ref = '' THEN
    NEW.purchase_ref := 'PUR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' 
      || LPAD(NEXTVAL('purchase_ref_seq')::TEXT, 4, '0');
  END IF;
  IF NEW.payment_terms_days > 0 AND NEW.due_date IS NULL THEN
    NEW.due_date := NEW.purchase_date + NEW.payment_terms_days;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_purchase_ref
  BEFORE INSERT ON vendor_purchases
  FOR EACH ROW EXECUTE FUNCTION generate_purchase_ref();


-- Advance Bookings Table
CREATE TABLE advance_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_ref TEXT NOT NULL UNIQUE DEFAULT '',
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE NOT NULL,
  total_value NUMERIC(15,2) NOT NULL DEFAULT 0,
  advance_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(15,2) GENERATED ALWAYS AS (total_value - advance_paid) STORED,
  status TEXT NOT NULL DEFAULT 'Booked' 
    CHECK (status IN ('Booked', 'Partially Paid', 'Fully Paid', 
                      'Delivered', 'Completed', 'Cancelled')),
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_vendor ON advance_bookings(vendor_id);

CREATE OR REPLACE FUNCTION generate_booking_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_ref IS NULL OR NEW.booking_ref = '' THEN
    NEW.booking_ref := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' 
      || LPAD(NEXTVAL('booking_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_ref
  BEFORE INSERT ON advance_bookings
  FOR EACH ROW EXECUTE FUNCTION generate_booking_ref();

-- Create placeholder for processing records since inventory_batches references it and vice versa
-- To fix cyclical dependency, we remove the `processing_id` foreign key check from inventory_batches,
-- we'll rely on app-level logic or UUID typing. We keep references but drop constraints if cyclical.

-- Inventory Batches Table
CREATE TABLE inventory_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_ref TEXT NOT NULL UNIQUE DEFAULT '',
  item_name TEXT NOT NULL,
  grade TEXT NOT NULL CHECK (grade IN ('A+', 'A', 'B', 'C')),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  purchase_price_per_kg NUMERIC(10,2) NOT NULL,
  quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
  remaining_qty_kg NUMERIC(12,2) NOT NULL,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'direct' 
    CHECK (source IN ('direct', 'booking', 'processing')),
  booking_id UUID REFERENCES advance_bookings(id),       
  purchase_id UUID REFERENCES vendor_purchases(id),      
  processing_id UUID, -- Deliberately no FK to avoid processing_records cycle
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT remaining_not_negative CHECK (remaining_qty_kg >= 0),
  CONSTRAINT remaining_not_exceed CHECK (remaining_qty_kg <= quantity_kg)
);

CREATE INDEX idx_batches_item_grade ON inventory_batches(item_name, grade);
CREATE INDEX idx_batches_remaining ON inventory_batches(remaining_qty_kg);

CREATE OR REPLACE FUNCTION generate_batch_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.batch_ref IS NULL OR NEW.batch_ref = '' THEN
    NEW.batch_ref := 'BT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' 
      || LPAD(NEXTVAL('batch_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_batch_ref
  BEFORE INSERT ON inventory_batches
  FOR EACH ROW EXECUTE FUNCTION generate_batch_ref();


-- ============================================================
-- 4. TERTIARY TABLES (Depending on Secondary Tables)
-- ============================================================

-- Inventory Movements Table
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES inventory_batches(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT')),
  quantity_kg NUMERIC(12,2) NOT NULL,
  reference_type TEXT CHECK (reference_type IN 
    ('SALE', 'BOOKING', 'DIRECT_PURCHASE', 'PROCESSING', 'WASTE_SALE', 'MANUAL')),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendor Purchase Items
CREATE TABLE vendor_purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID NOT NULL REFERENCES vendor_purchases(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  grade TEXT NOT NULL CHECK (grade IN ('A+', 'A', 'B', 'C')),
  quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
  price_per_kg NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED
);

-- Vendor Payments
CREATE TABLE vendor_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Bank', 'Cheque', 'Other')),
  reference_type TEXT CHECK (reference_type IN ('booking', 'purchase', 'general')),
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Booking Items
CREATE TABLE booking_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES advance_bookings(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  grade TEXT NOT NULL CHECK (grade IN ('A+', 'A', 'B', 'C')),
  quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
  agreed_price_per_kg NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantity_kg * agreed_price_per_kg) STORED
);

-- Booking Payments
CREATE TABLE booking_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES advance_bookings(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'Cash' 
    CHECK (payment_method IN ('Cash', 'Bank', 'Cheque', 'Other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Processing Records
CREATE TABLE processing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_ref TEXT NOT NULL UNIQUE DEFAULT '',
  source_batch_id UUID NOT NULL REFERENCES inventory_batches(id),
  process_date DATE NOT NULL DEFAULT CURRENT_DATE,
  raw_quantity_kg NUMERIC(12,2) NOT NULL CHECK (raw_quantity_kg > 0),
  clean_quantity_kg NUMERIC(12,2) NOT NULL CHECK (clean_quantity_kg > 0),
  waste_quantity_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
  output_batch_id UUID REFERENCES inventory_batches(id),
  output_item_name TEXT NOT NULL,
  output_grade TEXT NOT NULL CHECK (output_grade IN ('A+', 'A', 'B', 'C')),
  output_price_per_kg NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qty_check CHECK (clean_quantity_kg + waste_quantity_kg <= raw_quantity_kg)
);

CREATE OR REPLACE FUNCTION generate_process_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.process_ref IS NULL OR NEW.process_ref = '' THEN
    NEW.process_ref := 'PRC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' 
      || LPAD(NEXTVAL('process_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_process_ref
  BEFORE INSERT ON processing_records
  FOR EACH ROW EXECUTE FUNCTION generate_process_ref();

-- Now safe to link Processing ID in Inventory Batches
ALTER TABLE inventory_batches ADD CONSTRAINT fk_processing FOREIGN KEY (processing_id) REFERENCES processing_records(id);


-- Waste Records
CREATE TABLE waste_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  processing_id UUID NOT NULL REFERENCES processing_records(id),
  waste_quantity_kg NUMERIC(12,2) NOT NULL,
  is_sold BOOLEAN NOT NULL DEFAULT FALSE,
  sale_price_per_kg NUMERIC(10,2),
  sale_amount NUMERIC(15,2),
  sold_to TEXT,  
  sold_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sale and Online Orders

-- Online Orders
CREATE TABLE online_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_ref TEXT NOT NULL UNIQUE DEFAULT '',
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending' 
    CHECK (status IN ('Pending', 'Confirmed', 'Processing', 
                      'Delivered', 'Cancelled')),
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  sale_id UUID, -- FK to Sales later
  confirmed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_order_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_ref IS NULL OR NEW.order_ref = '' THEN
    NEW.order_ref := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' 
      || LPAD(NEXTVAL('order_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_order_ref
  BEFORE INSERT ON online_orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_ref();

-- Online Order Items
CREATE TABLE online_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES online_orders(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  packing TEXT,
  grade TEXT CHECK (grade IN ('A+', 'A', 'B', 'C')),
  quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
  requested_price_per_kg NUMERIC(10,2),
  confirmed_price_per_kg NUMERIC(10,2),
  subtotal NUMERIC(15,2),
  notes TEXT
);

-- Sales Table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_ref TEXT NOT NULL UNIQUE DEFAULT '',
  customer_id UUID NOT NULL REFERENCES customers(id),
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0,
  outstanding NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' 
    CHECK (payment_status IN ('Paid', 'Partially Paid', 'Unpaid')),
  online_order_id UUID REFERENCES online_orders(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION generate_sale_ref()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sale_ref IS NULL OR NEW.sale_ref = '' THEN
    NEW.sale_ref := 'SL-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' 
      || LPAD(NEXTVAL('sale_ref_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sale_ref
  BEFORE INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION generate_sale_ref();

ALTER TABLE online_orders ADD CONSTRAINT fk_sale FOREIGN KEY (sale_id) REFERENCES sales(id);

-- Sale Items Table
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES inventory_batches(id),
  quantity_kg NUMERIC(12,2) NOT NULL CHECK (quantity_kg > 0),
  sale_price_per_kg NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(15,2) GENERATED ALWAYS AS (quantity_kg * sale_price_per_kg) STORED
);


-- ============================================================
-- 5. FINANCE TABLES
-- ============================================================

-- Cheques Table
CREATE TABLE cheques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cheque_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_clearance_date DATE NOT NULL,
  cleared_at DATE,
  bounced_at DATE,
  bounce_reason TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' 
    CHECK (status IN ('Pending', 'Cleared', 'Bounced')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash Days
CREATE TABLE cash_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_date DATE NOT NULL UNIQUE,
  opening_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  closing_balance NUMERIC(15,2),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cash Entries
CREATE TABLE cash_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cash_day_id UUID NOT NULL REFERENCES cash_days(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('in', 'out')),
  category TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  entry_time TIME NOT NULL DEFAULT CURRENT_TIME,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vendor Ledger
CREATE TABLE vendor_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'Opening Balance', 'Purchase', 'Payment Made',
    'Cheque Issued', 'Cheque Bounced', 'Adjustment'
  )),
  description TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer Ledger
CREATE TABLE customer_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'Opening Balance', 'Sale', 'Payment Received', 'Return', 'Adjustment'
  )),
  description TEXT,
  debit NUMERIC(15,2) NOT NULL DEFAULT 0,
  credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  running_balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTE: ROW LEVEL SECURITY & STORED PROCEDURES (Same as before but safe execution)
-- If recreating a schema, drop existing views/functions if needed.
-- Make sure this entire block is successfully executed.
-- ============================================================
