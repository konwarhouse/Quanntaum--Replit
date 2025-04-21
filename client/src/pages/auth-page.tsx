import { useState, useEffect } from "react";
import { Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RegisterForm } from "@/components/auth/register-form";
import { UserManagement } from "@/components/auth/user-management";
import { UserRole } from "@shared/auth";

export default function AuthPage() {
  const { user, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");

  // Check if the user is already logged in and has admin role
  useEffect(() => {
    if (user) {
      if (user.role === UserRole.ADMIN) {
        setIsAdmin(true);
        setActiveTab("users");
      } else {
        // Regular users shouldn't access user management
        setIsAdmin(false);
      }
    } else {
      // If not logged in, ensure admin state is false
      setIsAdmin(false);
    }
  }, [user]);

  // If user is logged in but not an admin, redirect to home
  // This ensures only admins can access user management
  if (user && !isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Panel - Hero Section */}
      <div className="w-full md:w-1/2 bg-gradient-to-b from-primary/5 to-primary/10 p-8 flex flex-col justify-center">
        <div className="max-w-md mx-auto text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Quanntaum Predict
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            Smarter reliability starts here. An AI-powered reliability engineering platform for predictive maintenance, failure analysis, and asset performance optimization.
          </p>
          
          <div className="grid gap-4 mb-8">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium">🔍 Built on Industry Standards</h3>
                <p className="text-muted-foreground">Organize and manage assets with ISO 14224-compliant equipment classification for structured, reliable data management</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium">📊 Predictive Analytics & Reliability Modeling</h3>
                <p className="text-muted-foreground">Leverage Weibull analysis, reliability modeling, and historical failure data to forecast issues before they happen — and plan maintenance that makes an impact</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium">🤖 AI-Driven Insights</h3>
                <p className="text-muted-foreground">Uncover hidden patterns in asset behavior and failure trends using integrated AI. Reduce downtime, extend asset life, and improve operational efficiency</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login/Registration Form */}
      <div className="w-full md:w-1/2 p-8 flex items-center justify-center">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">
              {isAdmin ? "User Management" : "Welcome"}
            </CardTitle>
            <CardDescription>
              {isAdmin 
                ? "Manage users and access permissions" 
                : "Sign in to access Quanntaum Predict"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="users">Manage Users</TabsTrigger>
                  <TabsTrigger value="create">Create User</TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                  <UserManagement />
                </TabsContent>
                <TabsContent value="create">
                  <RegisterForm />
                </TabsContent>
              </Tabs>
            ) : (
              <LoginForm />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}