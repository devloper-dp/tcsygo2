import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { logProcess, logError } from "./error-logger";

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
  queryCache: new QueryCache({
    onSuccess: (data, query) => {
      logProcess(`Query: ${query.queryKey.join('/')}`, 'end', { data });
    },
    onError: (error, query) => {
      logError(`Query Error: ${query.queryKey.join('/')}`, { error });
    },
  }),
  mutationCache: new MutationCache({
    onMutate: (variables, mutation) => {
      logProcess(`Mutation: ${mutation.options.mutationKey?.join('/') || 'unnamed'}`, 'start', { variables });
    },
    onSuccess: (data, variables, context, mutation) => {
      logProcess(`Mutation: ${mutation.options.mutationKey?.join('/') || 'unnamed'}`, 'end', { data });
    },
    onError: (error, variables, context, mutation) => {
      logError(`Mutation Error: ${mutation.options.mutationKey?.join('/') || 'unnamed'}`, { error });
    },
  }),
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
