
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Standard default query function using fetch (if needed for non-supabase external APIs)
// or just return error as we expect most queries to be defined explicitly with Supabase
// However, to keep existing structure valid if any untracked query exists:

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/login';
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
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
