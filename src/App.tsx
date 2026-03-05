import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "./pages/Dashboard";
import RawInventory from "./pages/RawInventory";
import Processing from "./pages/Processing";
import Packaging from "./pages/Packaging";
import Sales from "./pages/Sales";
import Rokar from "./pages/Rokar";
import BankCheques from "./pages/BankCheques";
import VendorLedger from "./pages/VendorLedger";
import AdvanceContracts from "./pages/AdvanceContracts";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/raw-inventory" element={<RawInventory />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/packaging" element={<Packaging />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/rokar" element={<Rokar />} />
            <Route path="/bank-cheques" element={<BankCheques />} />
            <Route path="/vendor-ledger" element={<VendorLedger />} />
            <Route path="/advance-contracts" element={<AdvanceContracts />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
