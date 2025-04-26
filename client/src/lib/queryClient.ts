import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: RequestInit
): Promise<Response> {
  try {
    console.log(`Making ${method} request to ${url}`);
    if (data) {
      console.log('Request data:', JSON.stringify(data));
    }
    
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      ...options
    });
    
    if (!res.ok) {
      // Log more details for troubleshooting
      console.error(`Request failed with status ${res.status} (${res.statusText})`);
      
      if (res.status === 401) {
        console.error('Authentication error: Not authenticated or session expired');
      }
      
      try {
        const errorText = await res.text();
        console.error('Error response:', errorText);
      } catch (e) {
        console.error('Could not read error response body');
      }
    }
    
    return res;
  } catch (error) {
    console.error('Network error during API request:', error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      console.log(`Making query request to ${queryKey[0]}`);
      
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (res.status === 401) {
        console.error(`Authentication error on ${queryKey[0]}: Not authenticated or session expired`);
        
        if (unauthorizedBehavior === "returnNull") {
          console.log('Returning null for unauthorized request as configured');
          return null;
        }
      }
      
      if (!res.ok) {
        console.error(`Query failed with status ${res.status} (${res.statusText})`);
        try {
          const errorText = await res.text();
          console.error('Error response:', errorText);
        } catch (e) {
          console.error('Could not read error response body');
        }
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error(`Error in query to ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
