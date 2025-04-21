import { ReactNode } from "react";
import { Redirect, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { UserRole } from "@shared/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Show loader while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not authenticated, redirect to login
  if (!user) {
    // Store the current path for redirection after login
    const currentPath = window.location.pathname;
    if (currentPath !== "/auth") {
      sessionStorage.setItem("redirectAfterLogin", currentPath);
    }
    
    return <Redirect to="/auth" />;
  }

  // Check for required role if specified
  if (requiredRole) {
    // Admin has access to everything
    if (user.role !== UserRole.ADMIN && user.role !== requiredRole) {
      return <Redirect to="/" />;
    }
  }

  return <>{children}</>;
}

// For admin-only routes
export function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole={UserRole.ADMIN}>{children}</ProtectedRoute>;
}

// For analyst-only routes
export function AnalystRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole={UserRole.ANALYST}>{children}</ProtectedRoute>;
}

// For technician-only routes
export function TechnicianRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole={UserRole.TECHNICIAN}>{children}</ProtectedRoute>;
}