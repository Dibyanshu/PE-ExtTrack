import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { AppLayout } from "./components/layout/app-layout";

// Pages
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import VouchersList from "./pages/vouchers-list";
import VoucherCreate from "./pages/voucher-create";
import VoucherDetail from "./pages/voucher-detail";
import Particulars from "./pages/masters/particulars";
import Uom from "./pages/masters/uom";
import PaymentStatus from "./pages/masters/payment-status";
import Projects from "./pages/masters/projects";
import Vendors from "./pages/masters/vendors";
import Users from "./pages/users";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

setAuthTokenGetter(() => localStorage.getItem("pe_token"));

function ProtectedRoute({ component: Component, roles, componentProps }: { component: any; roles?: string[]; componentProps?: Record<string, any> }) {
  const { isAuthenticated, role } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      if (location !== "/login") setLocation("/login");
    } else if (roles && role && !roles.includes(role)) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, role, roles, setLocation, location]);

  if (!isAuthenticated) return null;
  if (roles && role && !roles.includes(role)) return null;

  return (
    <AppLayout>
      <Component {...(componentProps || {})} />
    </AppLayout>
  );
}

const ALL_ROLES = ["expense_entry", "accounts", "admin", "superadmin"];
const ADMIN_ROLES = ["admin", "superadmin"];

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />

      {/* Dashboard */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>

      {/* Vouchers */}
      <Route path="/vouchers/payment/new">
        {() => <ProtectedRoute component={VoucherCreate} roles={ALL_ROLES} componentProps={{ voucherType: "payment" }} />}
      </Route>
      <Route path="/vouchers/receive/new">
        {() => <ProtectedRoute component={VoucherCreate} roles={ALL_ROLES} componentProps={{ voucherType: "receive" }} />}
      </Route>
      <Route path="/vouchers/:id">
        {() => <ProtectedRoute component={VoucherDetail} roles={ALL_ROLES} />}
      </Route>
      <Route path="/vouchers/payment">
        {() => <ProtectedRoute component={VouchersList} roles={ALL_ROLES} componentProps={{ voucherType: "payment" }} />}
      </Route>
      <Route path="/vouchers/receive">
        {() => <ProtectedRoute component={VouchersList} roles={ALL_ROLES} componentProps={{ voucherType: "receive" }} />}
      </Route>

      {/* Masters */}
      <Route path="/masters/particulars">
        {() => <ProtectedRoute component={Particulars} roles={ADMIN_ROLES} />}
      </Route>
      <Route path="/masters/uom">
        {() => <ProtectedRoute component={Uom} roles={ADMIN_ROLES} />}
      </Route>
      <Route path="/masters/payment-status">
        {() => <ProtectedRoute component={PaymentStatus} roles={ADMIN_ROLES} />}
      </Route>
      <Route path="/masters/projects">
        {() => <ProtectedRoute component={Projects} roles={ADMIN_ROLES} />}
      </Route>
      <Route path="/masters/vendors">
        {() => <ProtectedRoute component={Vendors} roles={ADMIN_ROLES} />}
      </Route>

      {/* Users */}
      <Route path="/users">
        {() => <ProtectedRoute component={Users} roles={ADMIN_ROLES} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
