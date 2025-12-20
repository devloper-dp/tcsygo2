
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { mockRequest } from "./mockApi";

import { USE_MOCK } from "./constants";

// Set to true to skip server setup and use mock data
// const USE_MOCK = true; // Moved to constants.ts

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login';
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  if (USE_MOCK) {
    // Artificial delay and mock response
    try {
      const res = await mockRequest(method, url, data);
      await throwIfResNotOk(res);
      return res;
    } catch (e) {
      console.error("Mock API Error:", e);
      throw e;
    }
  }

  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {

      if (USE_MOCK) {
        const url = queryKey.join("/");
        const res = await mockRequest('GET', url as string);
        if (unauthorizedBehavior === "returnNull" && res.status === 401) {
          return null;
        }
        await throwIfResNotOk(res);
        return await res.json();
      }

      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
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
