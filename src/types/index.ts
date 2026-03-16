// ══════════════════════════════════════════════════════
// LPFMS — Complete Type Definitions
// Matches Supabase schema v2.1
// ══════════════════════════════════════════════════════

// ─── Shared Enums ─────────────────────────────────────

export type Grade          = 'A+' | 'A' | 'B' | 'C';
export type PaymentStatus  = 'Paid' | 'Partially Paid' | 'Unpaid';
export type PaymentMethod  = 'Cash' | 'Bank' | 'Cheque' | 'Other';
export type BookingStatus  = 'Booked' | 'Partially Paid' | 'Fully Paid' | 'Delivered' | 'Completed' | 'Cancelled';
export type ChequeStatus   = 'Pending' | 'Cleared' | 'Bounced';
export type CashEntryType  = 'in' | 'out';
export type PayableStatus  = 'Pending' | 'Partially Paid' | 'Paid' | 'Overdue';

export type CashInCategory  = 'Customer Payment' | 'Sale Revenue' | 'Other Income';
export type CashOutCategory = 'Salary' | 'Transport' | 'Utilities' | 'Vendor Payment' | 'Cheque Payment' | 'Miscellaneous';

export type OnlineOrderStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Delivered';

export type UserRole        = 'admin' | 'manager' | 'cashier' | 'viewer' | 'customer';
export type AccountType     = 'staff' | 'customer';

// ─── Auth ─────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  customerId: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── Vendor ───────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  city: string;
  address: string;
  openingBalance: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Customer ─────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  city: string;
  address: string;
  openingBalance: number;
  creditLimit: number;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Ledger ───────────────────────────────────────────

export interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

// ─── Inventory ────────────────────────────────────────

export type InventorySource = 'direct' | 'booking' | 'processing';

export interface InventoryBatch {
  id: string;
  batchRef: string;
  itemName: string;
  grade: Grade;
  vendorId: string;
  vendorName?: string;
  purchasePrice: number;        // purchase_price_per_kg
  quantity: number;             // quantity_kg (original)
  remainingQuantity: number;    // remaining_qty_kg
  purchaseDate: string;
  source: InventorySource;
  bookingId?: string | null;
  purchaseId?: string | null;
  processingId?: string | null;
  notes: string;
  // kept for display only — actual values live on vendor_purchases
  paymentTermsDays: number;
  isCredit: boolean;
  bookingDate?: string;
}

export interface InventoryMovement {
  id: string;
  batchId: string;
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantityKg: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
  createdAt: string;
}

// ─── Vendor Purchases ─────────────────────────────────

export interface VendorPurchaseItem {
  id?: string;
  purchaseId?: string;
  itemName: string;
  grade: Grade;
  quantityKg: number;
  pricePerKg: number;
  subtotal?: number;
}

export interface VendorPurchase {
  id: string;
  purchaseRef: string;
  vendorId: string;
  vendorName?: string;
  purchaseDate: string;
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  paymentTermsDays: number;
  dueDate?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: VendorPurchaseItem[];
  notes: string;
  createdAt: string;
}

// ─── Vendor Payments ──────────────────────────────────

export interface VendorPayment {
  id: string;
  vendorId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceType?: 'booking' | 'purchase' | 'general';
  referenceId?: string;
  notes: string;
}

// ─── Vendor Payables (view/computed) ──────────────────

export interface VendorPayable {
  id: string;
  vendorId: string;
  purchaseRef: string;
  purchaseDate: string;
  dueDate: string;
  paymentTermsDays: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PayableStatus;
  description: string;
}

// ─── Sales ────────────────────────────────────────────

export interface SaleItem {
  batchId: string;
  itemName?: string;
  grade?: string;
  quantity: number;       // quantity_kg
  salePrice: number;      // sale_price_per_kg
  subtotal: number;
}

export interface Sale {
  id: string;
  saleRef?: string;
  date: string;
  customerId: string;
  customerName?: string;
  items: SaleItem[];
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  paymentStatus: PaymentStatus;
  onlineOrderId?: string | null;
  notes: string;
}

// ─── Online Orders ────────────────────────────────────

export interface OnlineOrderItem {
  itemName: string;
  packing?: string;
  grade: Grade;
  quantity: number;       // quantity_kg
  notes: string;
}

export interface OnlineOrder {
  id: string;
  orderRef: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  customerEmail: string;
  items: OnlineOrderItem[];
  status: OnlineOrderStatus;
  adminNotes: string;
  requestedDeliveryDate?: string;
  confirmedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
}

// ─── Advance Bookings ─────────────────────────────────

export interface BookingItem {
  id?: string;
  bookingId?: string;
  itemName: string;
  grade: Grade;
  quantity: number;       // quantity_kg
  agreedPrice: number;    // agreed_price_per_kg
  subtotal: number;
}

export interface BookingPayment {
  id: string;
  bookingId?: string;
  date: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  notes: string;
}

export interface AdvanceBooking {
  id: string;
  bookingRef: string;
  bookingDate: string;
  vendorId: string;
  vendorName?: string;
  expectedDeliveryDate: string;
  items: BookingItem[];
  totalValue: number;
  advancePaid: number;
  remainingBalance: number;
  status: BookingStatus;
  payments: BookingPayment[];
  deliveredAt?: string;
  notes: string;
}

// ─── Cheques ──────────────────────────────────────────

export interface Cheque {
  id: string;
  chequeNumber: string;
  vendorId: string;
  vendorName?: string;
  amount: number;
  issueDate: string;
  expectedClearanceDate: string;
  clearedAt?: string;
  bouncedAt?: string;
  bounceDate?: string;
  bounceReason?: string;
  bankName: string;
  status: ChequeStatus;
  notes: string;
}

// ─── Cash Flow ────────────────────────────────────────

export interface CashEntry {
  id: string;
  date: string;
  time: string;
  type: CashEntryType;
  category: CashInCategory | CashOutCategory;
  amount: number;
  description: string;
  isLocked?: boolean;
}

export interface DayRecord {
  date: string;
  openingBalance: number;
  entries: CashEntry[];
  isClosed: boolean;
  closingBalance?: number;
  closedAt?: string;
}

// ─── Waste / Processing ───────────────────────────────

export interface WasteEntry {
  id: string;
  processingId: string;
  date: string;
  batchId: string;
  vendorId: string;
  itemName: string;
  grade: Grade;
  originalQuantity: number;   // raw_quantity_kg
  wasteQuantity: number;      // waste_quantity_kg
  cleanedQuantity: number;    // clean_quantity_kg
  isSold: boolean;
  salePricePerKg?: number;
  saleAmount?: number;
  soldTo?: string;
  soldDate?: string;
  notes: string;
}

export interface ProcessingRecord {
  id: string;
  processRef: string;
  sourceBatchId: string;
  processDate: string;
  rawQuantityKg: number;
  cleanQuantityKg: number;
  wasteQuantityKg: number;
  outputBatchId?: string;
  outputItemName: string;
  outputGrade: Grade;
  outputPricePerKg?: number;
  notes: string;
}

// ─── Reports (helper types) ───────────────────────────

export interface MonthlySalesSummary {
  month: string;
  totalSales: number;
  totalReceived: number;
  totalOutstanding: number;
  topCustomers: { name: string; amount: number }[];
}

export interface MonthlyPurchaseSummary {
  month: string;
  totalPurchases: number;
  totalPaid: number;
  totalPayable: number;
  topVendors: { name: string; amount: number }[];
}