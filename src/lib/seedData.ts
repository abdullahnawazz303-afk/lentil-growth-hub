/**
 * Hardcoded dummy data for the Lentils Management System.
 * Populates all stores on first load.
 */
import { useVendorStore } from '@/stores/vendorStore';
import { useCustomerStore } from '@/stores/customerStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useSalesStore } from '@/stores/salesStore';
import { useBookingStore } from '@/stores/bookingStore';
import { useChequeStore } from '@/stores/chequeStore';
import { useCashFlowStore } from '@/stores/cashFlowStore';
import type { Grade, CashInCategory, CashOutCategory } from '@/types';

let seeded = false;

export function seedAllData() {
  if (seeded) return;
  seeded = true;

  const vendorStore = useVendorStore.getState();
  const customerStore = useCustomerStore.getState();
  const inventoryStore = useInventoryStore.getState();
  const salesStore = useSalesStore.getState();
  const bookingStore = useBookingStore.getState();
  const chequeStore = useChequeStore.getState();
  const cashFlowStore = useCashFlowStore.getState();

  // ── Vendors ──
  const v1 = vendorStore.addVendor({ name: 'بشیر ملک', phone: '0301-1234567', address: 'فیصل آباد', creditDays: 30 });
  const v2 = vendorStore.addVendor({ name: 'علی الیاس', phone: '0321-9876543', address: 'آگری منڈی', creditDays: 45 });

  // ── Customers (Markets / Buyers) ──
  const c1 = customerStore.addCustomer({ name: 'Euro Store', phone: '0300-1112233' , address: 'لاہور' });
  const c2 = customerStore.addCustomer({ name: 'Scheme Mart', phone: '0312-4445566', address: 'فیصل آباد' });
  const c3 = customerStore.addCustomer({ name: 'Mart Zone', phone: '0333-7778899', address: 'ملتان' });
  const c4 = customerStore.addCustomer({ name: 'نعمت کیش اینڈ کیری', phone: '0345-2223344', address: 'راولپنڈی' });
  const c5 = customerStore.addCustomer({ name: 'احمد کیش اینڈ کیری', phone: '0355-6667788', address: 'اسلام آباد' });

  // ── Inventory Batches (10 rows — direct vendor supplies) ──
  // Realistic PKR prices per kg (2024): مسور ~280, چنا ~220, مونگ ~350, ماش ~450, دال مسور ~300
  const batches: { itemName: string; grade: Grade; vendorId: string; purchasePrice: number; quantity: number; purchaseDate: string; notes: string }[] = [
    { itemName: 'دال مسور',   grade: 'A',  vendorId: v1, purchasePrice: 280, quantity: 500,  purchaseDate: '2025-12-10', notes: 'پہلی کھیپ' },
    { itemName: 'دال چنا',    grade: 'A+', vendorId: v1, purchasePrice: 220, quantity: 800,  purchaseDate: '2025-12-15', notes: 'بہترین کوالٹی' },
    { itemName: 'دال مونگ',   grade: 'A',  vendorId: v2, purchasePrice: 350, quantity: 400,  purchaseDate: '2025-12-20', notes: 'آگری منڈی سے' },
    { itemName: 'دال ماش',    grade: 'A+', vendorId: v2, purchasePrice: 450, quantity: 300,  purchaseDate: '2026-01-05', notes: 'پریمیم گریڈ' },
    { itemName: 'چنے',        grade: 'B',  vendorId: v1, purchasePrice: 180, quantity: 1000, purchaseDate: '2026-01-10', notes: 'بلک آرڈر' },
    { itemName: 'دال مسور',   grade: 'B',  vendorId: v2, purchasePrice: 260, quantity: 600,  purchaseDate: '2026-01-15', notes: 'دوسری کھیپ' },
    { itemName: 'ماش کی دال', grade: 'A',  vendorId: v1, purchasePrice: 420, quantity: 350,  purchaseDate: '2026-01-25', notes: 'دھلی ہوئی' },
    { itemName: 'دال چنا',    grade: 'B',  vendorId: v2, purchasePrice: 200, quantity: 700,  purchaseDate: '2026-02-01', notes: 'ریگولر گریڈ' },
    { itemName: 'چاول',       grade: 'A+', vendorId: v1, purchasePrice: 310, quantity: 500,  purchaseDate: '2026-02-10', notes: 'باسمتی' },
    { itemName: 'دال مونگ',   grade: 'A+', vendorId: v2, purchasePrice: 380, quantity: 450,  purchaseDate: '2026-02-20', notes: 'چھلکے والی' },
  ];

  const batchIds: string[] = [];
  batches.forEach(b => {
    const id = inventoryStore.addBatch(b);
    batchIds.push(id);
  });

  // ── Vendor Ledger Entries (purchases + some payments) ──
  // Record purchases as credit (we owe vendor)
  vendorStore.addLedgerEntry(v1, { date: '2025-12-10', type: 'خریداری', description: 'دال مسور 500 کلو', debit: 0, credit: 140000 });
  vendorStore.addLedgerEntry(v1, { date: '2025-12-15', type: 'خریداری', description: 'دال چنا 800 کلو', debit: 0, credit: 176000 });
  vendorStore.addLedgerEntry(v1, { date: '2025-12-20', type: 'ادائیگی', description: 'نقد ادائیگی', debit: 100000, credit: 0 });
  vendorStore.addLedgerEntry(v1, { date: '2026-01-10', type: 'خریداری', description: 'چنے 1000 کلو', debit: 0, credit: 180000 });
  vendorStore.addLedgerEntry(v1, { date: '2026-01-25', type: 'خریداری', description: 'ماش کی دال 350 کلو', debit: 0, credit: 147000 });
  vendorStore.addLedgerEntry(v1, { date: '2026-02-05', type: 'ادائیگی', description: 'چیک سے ادائیگی', debit: 200000, credit: 0 });
  vendorStore.addLedgerEntry(v1, { date: '2026-02-10', type: 'خریداری', description: 'چاول 500 کلو', debit: 0, credit: 155000 });

  vendorStore.addLedgerEntry(v2, { date: '2025-12-20', type: 'خریداری', description: 'دال مونگ 400 کلو', debit: 0, credit: 140000 });
  vendorStore.addLedgerEntry(v2, { date: '2026-01-05', type: 'خریداری', description: 'دال ماش 300 کلو', debit: 0, credit: 135000 });
  vendorStore.addLedgerEntry(v2, { date: '2026-01-15', type: 'خریداری', description: 'دال مسور 600 کلو', debit: 0, credit: 156000 });
  vendorStore.addLedgerEntry(v2, { date: '2026-01-20', type: 'ادائیگی', description: 'نقد ادائیگی', debit: 150000, credit: 0 });
  vendorStore.addLedgerEntry(v2, { date: '2026-02-01', type: 'خریداری', description: 'دال چنا 700 کلو', debit: 0, credit: 140000 });
  vendorStore.addLedgerEntry(v2, { date: '2026-02-20', type: 'خریداری', description: 'دال مونگ 450 کلو', debit: 0, credit: 171000 });

  // ── Sales (10 records across 3 months, deducting from inventory) ──
  const salesData: { date: string; customerId: string; batchIdx: number; qty: number; salePrice: number; amountPaid: number; notes: string }[] = [
    { date: '2025-12-18', customerId: c1, batchIdx: 0, qty: 100, salePrice: 320, amountPaid: 32000, notes: 'Euro Store — دال مسور' },
    { date: '2025-12-22', customerId: c2, batchIdx: 1, qty: 150, salePrice: 260, amountPaid: 39000, notes: 'Scheme Mart — دال چنا' },
    { date: '2026-01-03', customerId: c3, batchIdx: 2, qty: 100, salePrice: 400, amountPaid: 20000, notes: 'Mart Zone — دال مونگ' },
    { date: '2026-01-08', customerId: c4, batchIdx: 3, qty: 80,  salePrice: 520, amountPaid: 41600, notes: 'نعمت — دال ماش' },
    { date: '2026-01-18', customerId: c5, batchIdx: 4, qty: 200, salePrice: 220, amountPaid: 44000, notes: 'احمد — چنے' },
    { date: '2026-01-28', customerId: c1, batchIdx: 5, qty: 150, salePrice: 300, amountPaid: 30000, notes: 'Euro Store — دال مسور' },
    { date: '2026-02-05', customerId: c2, batchIdx: 6, qty: 100, salePrice: 480, amountPaid: 48000, notes: 'Scheme Mart — ماش کی دال' },
    { date: '2026-02-12', customerId: c3, batchIdx: 7, qty: 200, salePrice: 240, amountPaid: 24000, notes: 'Mart Zone — دال چنا' },
    { date: '2026-02-22', customerId: c4, batchIdx: 8, qty: 100, salePrice: 360, amountPaid: 18000, notes: 'نعمت — چاول' },
    { date: '2026-03-01', customerId: c5, batchIdx: 9, qty: 100, salePrice: 430, amountPaid: 43000, notes: 'احمد — دال مونگ' },
  ];

  salesData.forEach(s => {
    const batchId = batchIds[s.batchIdx];
    const batch = inventoryStore.batches.find(b => b.id === batchId);
    if (!batch) return;

    // Deduct from inventory
    inventoryStore.deductFromBatch(batchId, s.qty);

    const totalAmount = s.qty * s.salePrice;
    salesStore.addSale({
      date: s.date,
      customerId: s.customerId,
      items: [{ batchId, quantity: s.qty, salePrice: s.salePrice, subtotal: totalAmount }],
      totalAmount,
      amountPaid: s.amountPaid,
      notes: s.notes,
    });

    // Customer ledger: sale = debit (they owe us)
    customerStore.addLedgerEntry(s.customerId, {
      date: s.date,
      type: 'فروخت',
      description: s.notes,
      debit: totalAmount,
      credit: 0,
    });

    // Customer payment
    if (s.amountPaid > 0) {
      customerStore.addLedgerEntry(s.customerId, {
        date: s.date,
        type: 'وصولی',
        description: 'نقد وصولی',
        debit: 0,
        credit: s.amountPaid,
      });
    }
  });

  // ── Advance Bookings (6 records) ──
  const bookingsData: { bookingDate: string; vendorId: string; expectedDeliveryDate: string; items: { itemName: string; grade: Grade; quantity: number; agreedPrice: number }[]; advancePaid: number; notes: string }[] = [
    {
      bookingDate: '2025-12-05', vendorId: v1, expectedDeliveryDate: '2025-12-20',
      items: [{ itemName: 'دال مسور', grade: 'A', quantity: 300, agreedPrice: 275 }],
      advancePaid: 20000, notes: 'پہلی ایڈوانس بکنگ',
    },
    {
      bookingDate: '2025-12-12', vendorId: v2, expectedDeliveryDate: '2026-01-05',
      items: [{ itemName: 'دال ماش', grade: 'A+', quantity: 200, agreedPrice: 440 }],
      advancePaid: 30000, notes: 'پریمیم ماش',
    },
    {
      bookingDate: '2026-01-02', vendorId: v1, expectedDeliveryDate: '2026-01-20',
      items: [{ itemName: 'دال چنا', grade: 'A', quantity: 500, agreedPrice: 215 }, { itemName: 'چنے', grade: 'B', quantity: 300, agreedPrice: 175 }],
      advancePaid: 40000, notes: 'مکس آرڈر',
    },
    {
      bookingDate: '2026-01-15', vendorId: v2, expectedDeliveryDate: '2026-02-10',
      items: [{ itemName: 'دال مونگ', grade: 'A+', quantity: 400, agreedPrice: 370 }],
      advancePaid: 50000, notes: 'بڑا آرڈر',
    },
    {
      bookingDate: '2026-02-01', vendorId: v1, expectedDeliveryDate: '2026-02-25',
      items: [{ itemName: 'ماش کی دال', grade: 'A', quantity: 250, agreedPrice: 415 }],
      advancePaid: 25000, notes: 'دھلی ماش',
    },
    {
      bookingDate: '2026-02-15', vendorId: v2, expectedDeliveryDate: '2026-03-10',
      items: [{ itemName: 'چاول', grade: 'A+', quantity: 350, agreedPrice: 305 }],
      advancePaid: 35000, notes: 'باسمتی چاول',
    },
  ];

  bookingsData.forEach(b => {
    bookingStore.addBooking({
      bookingDate: b.bookingDate,
      vendorId: b.vendorId,
      expectedDeliveryDate: b.expectedDeliveryDate,
      items: b.items.map(i => ({ ...i, subtotal: i.quantity * i.agreedPrice })),
      advancePaid: b.advancePaid,
      status: 'Booked',
      notes: b.notes,
    });
  });

  // ── Bank Cheques (4 records) ──
  chequeStore.addCheque({ chequeNumber: 'CHQ-00451', vendorId: v1, amount: 200000, issueDate: '2026-02-01', expectedClearanceDate: '2026-02-15', bankName: 'حبیب بینک', status: 'Cleared', notes: 'فروری ادائیگی' });
  chequeStore.addCheque({ chequeNumber: 'CHQ-00452', vendorId: v2, amount: 150000, issueDate: '2026-02-10', expectedClearanceDate: '2026-02-25', bankName: 'یو بی ایل', status: 'Pending', notes: 'ماش کی ادائیگی' });
  chequeStore.addCheque({ chequeNumber: 'CHQ-00453', vendorId: v1, amount: 100000, issueDate: '2026-03-01', expectedClearanceDate: '2026-03-15', bankName: 'حبیب بینک', status: 'Pending', notes: 'مارچ ادائیگی' });
  chequeStore.addCheque({ chequeNumber: 'CHQ-00454', vendorId: v2, amount: 80000, issueDate: '2026-01-20', expectedClearanceDate: '2026-02-05', bankName: 'ایم سی بی', status: 'Bounced', notes: 'باؤنس ہوا' });

  // ── Cash Flow / Rokar (daily entries for a few days) ──
  const cashEntries: { date: string; type: 'in' | 'out'; category: CashInCategory | CashOutCategory; amount: number; description: string }[] = [
    { date: '2026-02-25', type: 'in',  category: 'Customer Payment', amount: 50000,  description: 'Euro Store سے وصولی' },
    { date: '2026-02-25', type: 'out', category: 'Transport',        amount: 8000,   description: 'ٹرانسپورٹ خرچہ' },
    { date: '2026-02-25', type: 'out', category: 'Salary',           amount: 25000,  description: 'مزدوروں کی تنخواہ' },
    { date: '2026-02-26', type: 'in',  category: 'Sale Revenue',     amount: 48000,  description: 'Scheme Mart فروخت' },
    { date: '2026-02-26', type: 'out', category: 'Vendor Payment',   amount: 100000, description: 'بشیر ملک کو ادائیگی' },
    { date: '2026-02-26', type: 'in',  category: 'Customer Payment', amount: 30000,  description: 'Mart Zone سے وصولی' },
    { date: '2026-03-01', type: 'in',  category: 'Sale Revenue',     amount: 43000,  description: 'احمد کیش اینڈ کیری فروخت' },
    { date: '2026-03-01', type: 'out', category: 'Utilities',        amount: 5000,   description: 'بجلی کا بل' },
    { date: '2026-03-01', type: 'out', category: 'Miscellaneous',    amount: 3000,   description: 'متفرق اخراجات' },
    { date: '2026-03-01', type: 'in',  category: 'Other Income',     amount: 10000,  description: 'بوری فروخت' },
  ];

  cashEntries.forEach(e => {
    cashFlowStore.getOrCreateDay(e.date);
    cashFlowStore.addEntry(e.date, e);
  });

  console.log('✅ Seed data loaded successfully');
}
