import { create } from 'zustand';

interface CompanyBalanceState {
  initialBalance: number;
  totalSalesIncome: number;
  totalVendorPayments: number;
  addSalesIncome: (amount: number) => void;
  addVendorPayment: (amount: number) => void;
  getCompanyBalance: () => number;
}

export const useCompanyBalanceStore = create<CompanyBalanceState>((set, get) => ({
  initialBalance: 5000000, // 50 lakh PKR starting balance
  totalSalesIncome: 0,
  totalVendorPayments: 0,

  addSalesIncome: (amount) => {
    set((s) => ({ totalSalesIncome: s.totalSalesIncome + amount }));
  },

  addVendorPayment: (amount) => {
    set((s) => ({ totalVendorPayments: s.totalVendorPayments + amount }));
  },

  getCompanyBalance: () => {
    const { initialBalance, totalSalesIncome, totalVendorPayments } = get();
    return initialBalance + totalSalesIncome - totalVendorPayments;
  },
}));
