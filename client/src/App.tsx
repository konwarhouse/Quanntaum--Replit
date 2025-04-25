import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ChatPage from "@/pages/ChatPage";
import ReliabilityPage from "@/pages/ReliabilityPage";
import RcmPage from "@/pages/RcmPage";
import FmecaPage from "@/pages/fmeca-page";
import EnhancedFmecaPage from "@/pages/enhanced-fmeca-page";
import AuthPage from "@/pages/auth-page";
import UserManagementPage from "@/pages/UserManagementPage";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthProvider } from "@/hooks/use-auth";
import Layout from "@/components/layout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />

      <Route path="/">
        <Layout>
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        </Layout>
      </Route>

      <Route path="/reliability">
        <Layout>
          <ProtectedRoute>
            <ReliabilityPage />
          </ProtectedRoute>
        </Layout>
      </Route>
      
      <Route path="/users">
        <Layout>
          <ProtectedRoute>
            <UserManagementPage />
          </ProtectedRoute>
        </Layout>
      </Route>

      <Route path="/rcm">
        <Layout>
          <ProtectedRoute>
            <RcmPage />
          </ProtectedRoute>
        </Layout>
      </Route>
      
      <Route path="/fmeca">
        <Layout>
          <ProtectedRoute>
            <EnhancedFmecaPage />
          </ProtectedRoute>
        </Layout>
      </Route>
      
      {/* Enhanced FMECA is now integrated directly into the regular FMECA page */}

      {/* Fallback to 404 */}
      <Route>
        <Layout>
          <NotFound />
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
