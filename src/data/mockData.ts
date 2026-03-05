// Mock data for LFO-FCMS
export const mockPurchases = [
  { id: 1, supplier: "Khan Agro Supplies", quantity: 5000, costPerKg: 120, date: "2026-03-01", notes: "Premium masoor dal" },
  { id: 2, supplier: "Punjab Grain Traders", quantity: 3200, costPerKg: 115, date: "2026-03-02", notes: "Standard quality" },
  { id: 3, supplier: "Sindh Lentil Corp", quantity: 4500, costPerKg: 118, date: "2026-03-03", notes: "Mixed variety" },
  { id: 4, supplier: "Baloch Harvest Co.", quantity: 2800, costPerKg: 122, date: "2026-02-28", notes: "Red lentils" },
  { id: 5, supplier: "Islamabad Foods", quantity: 6000, costPerKg: 110, date: "2026-02-25", notes: "Bulk order" },
];

export const mockProcessing = [
  { id: 1, date: "2026-03-01", rawInput: 5000, highQuality: 3500, lowQuality: 1000, waste: 500 },
  { id: 2, date: "2026-03-02", rawInput: 3200, highQuality: 2200, lowQuality: 700, waste: 300 },
  { id: 3, date: "2026-03-03", rawInput: 4500, highQuality: 3100, lowQuality: 950, waste: 450 },
  { id: 4, date: "2026-03-04", rawInput: 2800, highQuality: 2000, lowQuality: 550, waste: 250 },
];

export const mockPackaging = [
  { id: 1, date: "2026-03-01", packageType: "1kg", quantity: 500 },
  { id: 2, date: "2026-03-01", packageType: "2kg", quantity: 300 },
  { id: 3, date: "2026-03-02", packageType: "3kg", quantity: 200 },
  { id: 4, date: "2026-03-03", packageType: "1kg", quantity: 800 },
  { id: 5, date: "2026-03-03", packageType: "2kg", quantity: 150 },
];

export const mockSales = [
  { id: 1, customer: "Metro Superstore", product: "Premium Masoor 1kg", quantity: 200, date: "2026-03-01", paymentMethod: "Credit" as const, amount: 36000, outstanding: 36000 },
  { id: 2, customer: "Al-Fatah Store", product: "Red Lentil 2kg", quantity: 100, date: "2026-03-02", paymentMethod: "Cash" as const, amount: 28000, outstanding: 0 },
  { id: 3, customer: "Imtiaz Mart", product: "Mixed Dal 3kg", quantity: 50, date: "2026-03-02", paymentMethod: "Cheque" as const, amount: 21000, outstanding: 21000 },
  { id: 4, customer: "Green Valley Foods", product: "Premium Masoor 1kg", quantity: 300, date: "2026-03-03", paymentMethod: "Credit" as const, amount: 54000, outstanding: 30000 },
  { id: 5, customer: "City Grocery", product: "Red Lentil 1kg", quantity: 150, date: "2026-03-04", paymentMethod: "Cash" as const, amount: 24000, outstanding: 0 },
];

export const mockCashEntries = [
  { id: 1, date: "2026-03-05", type: "in" as const, description: "Cash sale - Al-Fatah Store", amount: 28000 },
  { id: 2, date: "2026-03-05", type: "in" as const, description: "Cash sale - City Grocery", amount: 24000 },
  { id: 3, date: "2026-03-05", type: "out" as const, description: "Supplier payment - Khan Agro", amount: 15000 },
  { id: 4, date: "2026-03-05", type: "out" as const, description: "Electricity bill", amount: 8500 },
  { id: 5, date: "2026-03-05", type: "out" as const, description: "Labor wages", amount: 12000 },
  { id: 6, date: "2026-03-05", type: "in" as const, description: "Advance received - Metro", amount: 10000 },
];

export const mockCheques = [
  { id: 1, vendor: "Khan Agro Supplies", amount: 600000, chequeNo: "CHQ-001245", issueDate: "2026-02-20", status: "Pending" as const },
  { id: 2, vendor: "Punjab Grain Traders", amount: 368000, chequeNo: "CHQ-001246", issueDate: "2026-02-22", status: "Cleared" as const },
  { id: 3, vendor: "Sindh Lentil Corp", amount: 531000, chequeNo: "CHQ-001247", issueDate: "2026-02-25", status: "Pending" as const },
  { id: 4, vendor: "Baloch Harvest Co.", amount: 341600, chequeNo: "CHQ-001248", issueDate: "2026-03-01", status: "Bounced" as const },
  { id: 5, vendor: "Islamabad Foods", amount: 660000, chequeNo: "CHQ-001249", issueDate: "2026-03-03", status: "Pending" as const },
];

export const mockVendors = [
  { id: 1, name: "Khan Agro Supplies", outstanding: 600000, creditDays: 30, dueDate: "2026-03-22", status: "On Time" as const },
  { id: 2, name: "Punjab Grain Traders", outstanding: 0, creditDays: 15, dueDate: "2026-03-09", status: "On Time" as const },
  { id: 3, name: "Sindh Lentil Corp", outstanding: 531000, creditDays: 45, dueDate: "2026-04-10", status: "On Time" as const },
  { id: 4, name: "Baloch Harvest Co.", outstanding: 341600, creditDays: 30, dueDate: "2026-03-02", status: "Overdue" as const },
  { id: 5, name: "Islamabad Foods", outstanding: 660000, creditDays: 20, dueDate: "2026-03-07", status: "Due Soon" as const },
];

export const mockVendorTransactions = [
  { id: 1, vendorId: 1, date: "2026-02-20", description: "Purchase - 5000kg masoor dal", debit: 600000, credit: 0, balance: 600000 },
  { id: 2, vendorId: 4, date: "2026-02-28", description: "Purchase - 2800kg red lentils", debit: 341600, credit: 0, balance: 341600 },
  { id: 3, vendorId: 5, date: "2026-02-25", description: "Purchase - 6000kg bulk", debit: 660000, credit: 0, balance: 660000 },
  { id: 4, vendorId: 3, date: "2026-03-03", description: "Purchase - 4500kg mixed", debit: 531000, credit: 0, balance: 531000 },
  { id: 5, vendorId: 2, date: "2026-03-02", description: "Purchase - 3200kg standard", debit: 368000, credit: 0, balance: 368000 },
  { id: 6, vendorId: 2, date: "2026-03-05", description: "Payment - Cheque CHQ-001246", debit: 0, credit: 368000, balance: 0 },
];

export const mockContracts = [
  { id: "AC-2026-001", supplier: "Khan Agro Supplies", totalQty: 20000, pricePerKg: 118, advancePaid: 500000, remaining: 1860000, deliveryDate: "2026-04-15", notes: "Q2 supply contract", locked: true },
  { id: "AC-2026-002", supplier: "Sindh Lentil Corp", totalQty: 15000, pricePerKg: 115, advancePaid: 300000, remaining: 1425000, deliveryDate: "2026-05-01", notes: "Premium masoor", locked: true },
  { id: "AC-2026-003", supplier: "Islamabad Foods", totalQty: 10000, pricePerKg: 112, advancePaid: 200000, remaining: 920000, deliveryDate: "2026-04-20", notes: "Bulk red lentils", locked: false },
];

export const mockNotifications = [
  { id: 1, message: "Cheque CHQ-001248 bounced - Baloch Harvest Co.", type: "error" as const, time: "2 hours ago" },
  { id: 2, message: "Payment due in 2 days - Islamabad Foods (Rs 660,000)", type: "warning" as const, time: "3 hours ago" },
  { id: 3, message: "Payment overdue - Baloch Harvest Co. (Rs 341,600)", type: "error" as const, time: "3 days ago" },
  { id: 4, message: "Low raw stock alert - Below 5000kg threshold", type: "warning" as const, time: "5 hours ago" },
  { id: 5, message: "Contract AC-2026-003 delivery approaching", type: "info" as const, time: "1 day ago" },
];
