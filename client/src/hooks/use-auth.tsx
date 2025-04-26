import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { User } from "@shared/schema";
import { UserRole } from "@shared/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Interface for login credentials
interface LoginCredentials {
  username: string;
  password: string;
}

// Interface for registration data
interface RegisterData extends LoginCredentials {
  fullName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

// Interface for user update data
interface UpdateUserData {
  id: number;
  username?: string;
  password?: string;
  fullName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

// Auth context type definition
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginCredentials>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  updateUserMutation: UseMutationResult<User, Error, UpdateUserData>;
  deleteUserMutation: UseMutationResult<void, Error, number>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  // Get the current user with development auto-login support
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | null, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async ({ signal }) => {
      try {
        // Development helper: Add auto_login=true parameter in development
        const isDev = process.env.NODE_ENV === 'development';
        const url = isDev 
          ? "/api/auth/user?auto_login=true" 
          : "/api/auth/user";
        
        console.log(`Fetching user from ${url}`);
        const res = await apiRequest("GET", url, undefined, { 
          signal,
          headers: isDev ? { 'X-Auto-Login': 'true' } : undefined
        });
        
        if (res.status === 401) {
          console.log("Not authenticated, returning null");
          return null; // Return null instead of undefined
        }
        
        if (!res.ok) {
          const errorData = await res.json();
          const errorMsg = errorData.error || "Failed to fetch user";
          console.error("Error fetching user:", errorMsg);
          throw new Error(errorMsg);
        }
        
        const userData = await res.json();
        console.log("User data fetched successfully:", userData.username);
        return userData;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        console.error("Error in auth query:", err);
        throw err;
      }
    },
    retry: 1, // Retry once if it fails
    retryDelay: 1000, // Wait 1 second before retrying
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<User> => {
      try {
        console.log("Attempting login for user:", credentials.username);
        const res = await apiRequest("POST", "/api/auth/login", credentials);
        
        if (res.status === 401) {
          throw new Error("Invalid username or password");
        }
        
        if (!res.ok) {
          let errorMessage = "Login failed";
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error("Could not parse error response:", e);
          }
          throw new Error(errorMessage);
        }
        
        const userData = await res.json();
        console.log("Login successful for:", userData.username);
        return userData;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: (userData: User) => {
      console.log("Setting user data in query client:", userData.username);
      queryClient.setQueryData(["/api/auth/user"], userData);
      
      // Invalidate all queries to force a refetch with the new auth state
      queryClient.invalidateQueries();
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error.message);
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Register mutation (admin only)
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData): Promise<User> => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Registration failed");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({
        title: "User created",
        description: "The new user has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation with enhanced handling
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      try {
        console.log("Attempting to log out user");
        const res = await apiRequest("POST", "/api/auth/logout");
        
        if (!res.ok) {
          let errorMessage = "Logout failed";
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            console.error("Could not parse error response:", e);
          }
          throw new Error(errorMessage);
        }
        console.log("Logout API call successful");
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Clearing user data from query client");
      // Clear user data
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Force a reset of all queries to clean state
      queryClient.removeQueries();
      
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Logout mutation error:", error.message);
      // Even if the server-side logout fails, clear the local user data
      queryClient.setQueryData(["/api/auth/user"], null);
      
      toast({
        title: "Logout issue",
        description: "You've been logged out locally, but there was a server issue: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation (admin only)
  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserData): Promise<User> => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PUT", `/api/auth/users/${id}`, updateData);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Update failed");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({
        title: "User updated",
        description: "The user has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation (admin only)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number): Promise<void> => {
      const res = await apiRequest("DELETE", `/api/auth/users/${userId}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Delete failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/users"] });
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error,
        loginMutation,
        registerMutation,
        logoutMutation,
        updateUserMutation,
        deleteUserMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}

// Helper function to check if the user has a specific permission
export function useUserPermissions() {
  const { user } = useAuth();
  
  if (!user) {
    return {
      canManageUsers: false,
      canManageEquipmentClasses: false,
      canManageAssets: false,
      canManageFailureModes: false,
      canEditFailureHistory: false,
      canViewReports: false,
      canRunAnalysis: false,
      isAdmin: false,
      isLoggedIn: false,
    };
  }
  
  const isAdmin = user.role === UserRole.ADMIN;
  const isAnalyst = user.role === UserRole.ANALYST;
  const isTechnician = user.role === UserRole.TECHNICIAN;
  
  return {
    canManageUsers: isAdmin,
    canManageEquipmentClasses: isAdmin || isAnalyst,
    canManageAssets: isAdmin || isAnalyst,
    canManageFailureModes: isAdmin || isAnalyst,
    canEditFailureHistory: isAdmin || isAnalyst || isTechnician,
    canViewReports: true, // Everyone can view reports
    canRunAnalysis: isAdmin || isAnalyst,
    isAdmin,
    isLoggedIn: true,
  };
}