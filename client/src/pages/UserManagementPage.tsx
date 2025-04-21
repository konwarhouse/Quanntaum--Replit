import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserManagement } from "@/components/auth/user-management";
import { UserRole } from "@shared/auth";
import { Loader2 } from "lucide-react";

export default function UserManagementPage() {
  const { user, isLoading } = useAuth();
  
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  // Redirect non-admin users to home page
  if (!user || user.role !== UserRole.ADMIN) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container py-10 mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage users and their access permissions for Quanntaum Predict
        </p>
      </div>
      
      <UserManagement />
    </div>
  );
}