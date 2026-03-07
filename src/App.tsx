import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import CustomerLedger from "./pages/CustomerLedger";
import Vendors from "./pages/Vendors";
import VendorLedger from "./pages/VendorLedger";
import AdvanceBookings from "./pages/AdvanceBookings";
import BankCheques from "./pages/BankCheques";
import Rokar from "./pages/Rokar";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import { seedAllData } from "@/lib/seedData";

const queryClient = new QueryClient();

// Seed dummy data on app start
seedAllData();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/customer-ledger" element={<CustomerLedger />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/vendor-ledger" element={<VendorLedger />} />
            <Route path="/advance-bookings" element={<AdvanceBookings />} />
            <Route path="/bank-cheques" element={<BankCheques />} />
            <Route path="/cash-flow" element={<Rokar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
