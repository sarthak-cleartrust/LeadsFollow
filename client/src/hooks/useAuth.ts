import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  gmailConnected: boolean;
  lastSyncDate?: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email: string;
  fullName: string;
}

export function useAuth() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Fetch current user with fallback for unauthorized
  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        
        if (res.status === 401) {
          setIsAuthenticated(false);
          return null;
        }
        
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        setIsAuthenticated(true);
        
        // Trigger Gmail sync on app refresh/load if user has Gmail connected
        if (data.gmailConnected) {
          fetch("/api/gmail/sync", { method: "GET" })
            .then(res => res.json())
            .then(() => {
              // Refresh data after sync
              queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
              queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
            })
            .catch(err => console.log("Background sync failed:", err));
        }
        
        return data;
      } catch (error) {
        setIsAuthenticated(false);
        throw error;
      }
    }
  });

  // Login mutation
  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return res.json();
    },
    onSuccess: (data) => {
      setIsAuthenticated(true);
      queryClient.setQueryData(["/api/auth/user"], data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Trigger Gmail sync if user has Gmail connected
      if (data.gmailConnected) {
        fetch("/api/gmail/sync", { method: "GET" })
          .then(res => res.json())
          .then(() => {
            // Refresh data after sync
            queryClient.invalidateQueries({ queryKey: ["/api/prospects"] });
            queryClient.invalidateQueries({ queryKey: ["/api/follow-ups"] });
          })
          .catch(err => console.log("Background sync failed:", err));
      }
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.fullName}!`,
      });
    },
    onError: (error: Error) => {
      setIsAuthenticated(false);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  });

  // Register mutation
  const register = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      // After registration, don't set authenticated
      // This will allow the user to log in with their new credentials
      toast({
        title: "Registration successful",
        description: "Your account has been created. Please login with your credentials.",
      });
      // Clear the query cache for the user
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    }
  });

  // Logout mutation
  const logout = useMutation({
    mutationFn: async () => {
      try {
        const res = await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.message || "Failed to logout");
        }
        
        return data;
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      setIsAuthenticated(false);
      queryClient.clear();
      toast({
        title: "Logged out successfully",
      });
      
      // Redirect to login page after logout
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message || "Could not log out",
        variant: "destructive",
      });
    }
  });

  return {
    user,
    isAuthenticated,
    isLoading,
    login: login.mutate,
    register: register.mutate,
    logout: logout.mutate,
    isLoginPending: login.isPending,
    isRegisterPending: register.isPending,
    isLogoutPending: logout.isPending,
  };
}
