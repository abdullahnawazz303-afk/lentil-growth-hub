import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/stores/authStore";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
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

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public website */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Route>
          <Route path="/login" element={<Login />} />

          {/* Protected ERP */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/inventory"
            element={<ProtectedRoute><AppLayout><Inventory /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/sales"
            element={<ProtectedRoute><AppLayout><Sales /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/customers"
            element={<ProtectedRoute><AppLayout><Customers /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/customer-ledger"
            element={<ProtectedRoute><AppLayout><CustomerLedger /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/vendors"
            element={<ProtectedRoute><AppLayout><Vendors /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/vendor-ledger"
            element={<ProtectedRoute><AppLayout><VendorLedger /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/advance-bookings"
            element={<ProtectedRoute><AppLayout><AdvanceBookings /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/bank-cheques"
            element={<ProtectedRoute><AppLayout><BankCheques /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/cash-flow"
            element={<ProtectedRoute><AppLayout><Rokar /></AppLayout></ProtectedRoute>}
          />
          <Route
            path="/reports"
            element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
