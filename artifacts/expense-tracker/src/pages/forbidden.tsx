import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-sm" data-testid="page-forbidden">
        <ShieldOff className="w-16 h-16 text-primary mx-auto opacity-60" />
        <div>
          <h1 className="text-4xl font-bold font-mono text-primary">403</h1>
          <p className="text-lg font-bold uppercase tracking-widest text-foreground mt-2">Access Denied</p>
          <p className="text-sm text-muted-foreground mt-2">You do not have permission to view this page.</p>
        </div>
        <Link href="/dashboard">
          <Button className="font-bold uppercase tracking-wide" data-testid="btn-back-dashboard">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
