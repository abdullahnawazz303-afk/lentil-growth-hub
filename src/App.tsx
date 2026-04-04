import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "@/components/PublicLayout";
import { AppLayout } from "@/components/AppLayout";
import { useAuthStore } from "@/stores/authStore";

// Public pages
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Products from "./pages/Products";
import FAQs from "./pages/FAQs";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RequestAccess from "./pages/RequestAccess";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";

// Customer portal
import CustomerPortal from "./pages/CustomerPortal";

// Internal ERP pages
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import CustomerLedger from "./pages/CustomerLedger";
import CustomerRequests from "./pages/CustomerRequests";
import Vendors from "./pages/Vendors";
import VendorLedger from "./pages/VendorLedger";
import VendorPayables from "./pages/VendorPayables";
import AdvanceBookings from "./pages/AdvanceBookings";
import BankCheques from "./pages/BankCheques";
import Rokar from "./pages/Rokar";
import Reports from "./pages/Reports";
import OnlineOrders from "./pages/OnlineOrders";
import WasteManagement from "./pages/WasteManagement";
import RateCard from "./pages/RateCard";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm">Loading...</p>
    </div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userRole   = useAuthStore((s) => s.userRole);
  const loading    = useAuthStore((s) => s.loading);

  if (loading)     return <LoadingScreen />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (userRole === "customer") return <Navigate to="/portal" replace />;

  return <>{children}</>;
}

function CustomerRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const userRole   = useAuthStore((s) => s.userRole);
  const loading    = useAuthStore((s) => s.loading);

  if (loading)     return <LoadingScreen />;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  if (userRole !== "customer") return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

const App = () => {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => { restoreSession(); }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>

            {/* ── Public website ── */}
            <Route element={<PublicLayout />}>
              <Route path="/"         element={<Home />} />
              <Route path="/about"    element={<About />} />
              <Route path="/contact"  element={<Contact />} />
              <Route path="/products" element={<Products />} />
              <Route path="/faqs"     element={<FAQs />} />
            </Route>

            {/* ── Auth pages (no layout) ── */}
            <Route path="/login"          element={<Login />} />
            <Route path="/register"       element={<Register />} />
            <Route path="/request-access" element={<RequestAccess />} />
            <Route path="/auth/callback"  element={<AuthCallback />} />

            {/* ── Customer Portal ── */}
            <Route path="/portal" element={<CustomerRoute><CustomerPortal /></CustomerRoute>} />

            {/* ── Internal ERP (staff only) ── */}
            <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><AppLayout><Inventory /></AppLayout></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><AppLayout><Sales /></AppLayout></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><AppLayout><Customers /></AppLayout></ProtectedRoute>} />
            <Route path="/customer-ledger" element={<ProtectedRoute><AppLayout><CustomerLedger /></AppLayout></ProtectedRoute>} />
            <Route path="/customer-requests" element={<ProtectedRoute><AppLayout><CustomerRequests /></AppLayout></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><AppLayout><Vendors /></AppLayout></ProtectedRoute>} />
            <Route path="/vendor-ledger" element={<ProtectedRoute><AppLayout><VendorLedger /></AppLayout></ProtectedRoute>} />
            <Route path="/vendor-payables" element={<ProtectedRoute><AppLayout><VendorPayables /></AppLayout></ProtectedRoute>} />
            <Route path="/advance-bookings" element={<ProtectedRoute><AppLayout><AdvanceBookings /></AppLayout></ProtectedRoute>} />
            <Route path="/bank-cheques" element={<ProtectedRoute><AppLayout><BankCheques /></AppLayout></ProtectedRoute>} />
            <Route path="/cash-flow" element={<ProtectedRoute><AppLayout><Rokar /></AppLayout></ProtectedRoute>} />
            <Route path="/online-orders" element={<ProtectedRoute><AppLayout><OnlineOrders /></AppLayout></ProtectedRoute>} />
            <Route path="/waste" element={<ProtectedRoute><AppLayout><WasteManagement /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
            <Route path="/rate-card" element={<ProtectedRoute><AppLayout><RateCard /></AppLayout></ProtectedRoute>} />

            {/* ── Fallback ── */}
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="*"      element={<NotFound />} />

          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;