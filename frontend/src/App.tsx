import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { setAuthTokenGetter, setBaseUrl } from "@/api-client";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import NotFound from "@/pages/not-found";
import Forbidden from "@/pages/forbidden";
import { AppLayout } from "./components/layout/app-layout";

// Pages
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import VouchersList from "./pages/vouchers-list";
import VoucherCreate from "./pages/voucher-create";
import VoucherDetail from "./pages/voucher-detail";
import VoucherEdit from "./pages/voucher-edit";
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

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? import.meta.env.VITE_API_URL ?? null;
setBaseUrl(configuredApiBaseUrl ?? (import.meta.env.DEV ? "http://localhost:4000" : null));
setAuthTokenGetter(() => localStorage.getItem("pe_token"));

const ALL_ROLES = ["expense_entry", "accounts", "admin", "superadmin"];
const ADMIN_ROLES = ["admin", "superadmin"];

interface GuardProps {
  roles?: string[];
  children: React.ReactNode;
}

function Guard({ roles, children }: GuardProps) {
  const { isAuthenticated, role, hydrated } = useAuth();
  const [location] = useLocation();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return location !== "/login" ? <Redirect to="/login" /> : null;
  }

  if (roles && role && !roles.includes(role)) {
    return <Forbidden />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function LoginRoute() {
  const { isAuthenticated, hydrated } = useAuth();

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <Login />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginRoute} />

      <Route path="/">
        {() => <Guard><Dashboard /></Guard>}
      </Route>
      <Route path="/dashboard">
        {() => <Guard><Dashboard /></Guard>}
      </Route>

      <Route path="/vouchers/payment/new">
        {() => <Guard roles={ALL_ROLES}><VoucherCreate voucherType="payment" /></Guard>}
      </Route>
      <Route path="/vouchers/receive/new">
        {() => <Guard roles={ALL_ROLES}><VoucherCreate voucherType="receive" /></Guard>}
      </Route>
      <Route path="/vouchers/payment">
        {() => <Guard roles={ALL_ROLES}><VouchersList voucherType="payment" /></Guard>}
      </Route>
      <Route path="/vouchers/receive">
        {() => <Guard roles={ALL_ROLES}><VouchersList voucherType="receive" /></Guard>}
      </Route>
      <Route path="/vouchers/:id/edit">
        {() => <Guard roles={ALL_ROLES}><VoucherEdit /></Guard>}
      </Route>
      <Route path="/vouchers/:id">
        {() => <Guard roles={ALL_ROLES}><VoucherDetail /></Guard>}
      </Route>

      <Route path="/masters/particulars">
        {() => <Guard roles={ADMIN_ROLES}><Particulars /></Guard>}
      </Route>
      <Route path="/masters/uom">
        {() => <Guard roles={ADMIN_ROLES}><Uom /></Guard>}
      </Route>
      <Route path="/masters/payment-status">
        {() => <Guard roles={ADMIN_ROLES}><PaymentStatus /></Guard>}
      </Route>
      <Route path="/masters/projects">
        {() => <Guard roles={ADMIN_ROLES}><Projects /></Guard>}
      </Route>
      <Route path="/masters/vendors">
        {() => <Guard roles={ADMIN_ROLES}><Vendors /></Guard>}
      </Route>

      <Route path="/users">
        {() => <Guard roles={ADMIN_ROLES}><Users /></Guard>}
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
