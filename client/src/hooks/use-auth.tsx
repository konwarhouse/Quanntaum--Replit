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
interface AuthContextType {
  user: User | null | undefined;
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

  // Get the current user
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: async ({ signal }) => {
      try {
        const res = await apiRequest("GET", "/api/auth/user", undefined, { signal });
        
        if (res.status === 401) {
          return undefined;
        }
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch user");
        }
        
        return await res.json();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return undefined;
        }
        throw err;
      }
    },
    retry: false,
    refetchOnWindowFocus: true,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<User> => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Login failed");
      }
      
      return res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/auth/user"], userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
    },
    onError: (error: Error) => {
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

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await apiRequest("POST", "/api/auth/logout");
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Logout failed");
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], undefined);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
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
        user,
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