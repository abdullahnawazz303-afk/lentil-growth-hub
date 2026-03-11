// ══════════════════════════════════════
// FFCMS — All Data Models
// ══════════════════════════════════════

export type Grade = 'A+' | 'A' | 'B' | 'C';

export type BookingStatus = 'Booked' | 'Partially Paid' | 'Fully Paid' | 'Delivered' | 'Completed' | 'Cancelled';
export type ChequeStatus = 'Pending' | 'Cleared' | 'Bounced';
export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';
export type CashEntryType = 'in' | 'out';
export type CashInCategory = 'Customer Payment' | 'Sale Revenue' | 'Other Income';
export type CashOutCategory = 'Salary' | 'Transport' | 'Utilities' | 'Vendor Payment' | 'Cheque Payment' | 'Miscellaneous';

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

export interface InventoryBatch {
  id: string;
  batchRef: string;
  itemName: string;
  grade: Grade;
  vendorId: string;
  purchasePrice: number;
  quantity: number;
  remainingQuantity: number;
  purchaseDate: string;
  notes: string;
}

export interface SaleItem {
  batchId: string;
  quantity: number;
  salePrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  date: string;
  customerId: string;
  items: SaleItem[];
  totalAmount: number;
  amountPaid: number;
  outstanding: number;
  paymentStatus: PaymentStatus;
  notes: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface BookingItem {
  itemName: string;
  grade: Grade;
  quantity: number;
  agreedPrice: number;
  subtotal: number;
}

export interface BookingPayment {
  id: string;
  date: string;
  amount: number;
  notes: string;
}

export interface AdvanceBooking {
  id: string;
  bookingDate: string;
  vendorId: string;
  expectedDeliveryDate: string;
  items: BookingItem[];
  totalValue: number;
  advancePaid: number;
  remainingBalance: number;
  status: BookingStatus;
  payments: BookingPayment[];
  notes: string;
}

export interface Cheque {
  id: string;
  chequeNumber: string;
  vendorId: string;
  amount: number;
  issueDate: string;
  expectedClearanceDate: string;
  bankName: string;
  status: ChequeStatus;
  bounceDate?: string;
  notes: string;
}

export interface CashEntry {
  id: string;
  date: string;
  time: string;
  type: CashEntryType;
  category: CashInCategory | CashOutCategory;
  amount: number;
  description: string;
}

export interface DayRecord {
  date: string;
  openingBalance: number;
  entries: CashEntry[];
  isClosed: boolean;
  closingBalance?: number;
}

export type OnlineOrderStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Delivered';

export interface OnlineOrderItem {
  itemName: string;
  grade: Grade;
  quantity: number;
  notes: string;
}

export interface OnlineOrder {
  id: string;
  date: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  customerCity: string;
  items: OnlineOrderItem[];
  status: OnlineOrderStatus;
  adminNotes: string;
}
