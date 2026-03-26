-- Migration to automatically update payment_status based on amount_paid vs total_amount

-- 1. Create a generic function to determine the payment status
CREATE OR REPLACE FUNCTION set_payment_status_from_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- If total_amount is 0 or amount_paid covers total_amount, it's paid
  IF NEW.amount_paid >= NEW.total_amount THEN
    NEW.payment_status := 'Paid';
  -- If some amount is paid but less than total, partially paid
  ELSIF NEW.amount_paid > 0 THEN
    NEW.payment_status := 'Partially Paid';
  -- Otherwise, unpaid
  ELSE
    NEW.payment_status := 'Unpaid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach trigger to sales table
DROP TRIGGER IF EXISTS trg_sale_payment_status ON sales;
CREATE TRIGGER trg_sale_payment_status
  BEFORE INSERT OR UPDATE OF amount_paid, total_amount ON sales
  FOR EACH ROW EXECUTE FUNCTION set_payment_status_from_amounts();

-- 3. Attach trigger to vendor_purchases table
DROP TRIGGER IF EXISTS trg_purchase_payment_status ON vendor_purchases;
CREATE TRIGGER trg_purchase_payment_status
  BEFORE INSERT OR UPDATE OF amount_paid, total_amount ON vendor_purchases
  FOR EACH ROW EXECUTE FUNCTION set_payment_status_from_amounts();
