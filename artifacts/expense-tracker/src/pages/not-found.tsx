import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-sm" data-testid="page-not-found">
        <FileQuestion className="w-16 h-16 text-muted-foreground mx-auto opacity-50" />
        <div>
          <h1 className="text-4xl font-bold font-mono text-foreground">404</h1>
          <p className="text-lg font-bold uppercase tracking-widest text-muted-foreground mt-2">Page Not Found</p>
          <p className="text-sm text-muted-foreground mt-2">The page you are looking for does not exist.</p>
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
