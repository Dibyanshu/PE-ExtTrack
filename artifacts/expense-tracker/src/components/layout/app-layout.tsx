import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { LogOut, LayoutDashboard, Receipt, FileInput, Users, Database, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["expense_entry", "accounts", "admin", "superadmin"] },
    { name: "Payment Vouchers", href: "/vouchers/payment", icon: Receipt, roles: ["expense_entry", "accounts", "admin", "superadmin"] },
    { name: "Receive Vouchers", href: "/vouchers/receive", icon: FileInput, roles: ["expense_entry", "accounts", "admin", "superadmin"] },
    { name: "Particulars", href: "/masters/particulars", icon: Database, roles: ["admin", "superadmin"] },
    { name: "UOM", href: "/masters/uom", icon: Database, roles: ["admin", "superadmin"] },
    { name: "Payment Status", href: "/masters/payment-status", icon: Database, roles: ["admin", "superadmin"] },
    { name: "Projects", href: "/masters/projects", icon: Database, roles: ["admin", "superadmin"] },
    { name: "Vendors", href: "/masters/vendors", icon: Database, roles: ["admin", "superadmin"] },
    { name: "Users", href: "/users", icon: Users, roles: ["admin", "superadmin"] },
  ];

  const allowedNav = navigation.filter(item => role && item.roles.includes(role));

  const NavLinks = () => (
    <div className="flex flex-col gap-1 w-full">
      {allowedNav.map((item) => (
        <Link key={item.name} href={item.href}>
          <div
            data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
              location.startsWith(item.href)
                ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => setMobileOpen(false)}
          >
            <item.icon className="w-4 h-4" />
            {item.name}
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-panel relative z-10">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="font-bold text-lg tracking-tight text-primary">PARBATI ENTERPRISES</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavLinks />
        </div>
        <div className="p-4 border-t border-sidebar-border space-y-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground uppercase tracking-widest">{role}</span>
          </div>
          <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={logout} data-testid="btn-logout">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 flex items-center justify-between px-4 bg-sidebar border-b border-sidebar-border">
          <span className="font-bold text-lg text-primary tracking-tight">PARBATI</span>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="btn-mobile-menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar border-sidebar-border p-0 flex flex-col">
              <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
                <span className="font-bold text-lg tracking-tight text-primary">PARBATI ENTERPRISES</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <NavLinks />
              </div>
              <div className="p-4 border-t border-sidebar-border">
                <Button variant="outline" className="w-full justify-start text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="mx-auto max-w-6xl w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
