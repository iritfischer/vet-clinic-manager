import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Leads from "./pages/Leads";
import Pets from "./pages/Pets";
import Appointments from "./pages/Appointments";
import Visits from "./pages/Visits";
import Vaccinations from "./pages/Vaccinations";
import Reminders from "./pages/Reminders";
import WhatsApp from "./pages/WhatsApp";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/client/:clientId" element={<ClientProfile />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/pets" element={<Pets />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/visits" element={<Visits />} />
            <Route path="/vaccinations" element={<Vaccinations />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/whatsapp" element={<WhatsApp />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/analytics" element={<Analytics />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
