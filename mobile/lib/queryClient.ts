import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logProcess, logError } from './error-logger';

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
            staleTime: 1000 * 60 * 5, // 5 minutes
            retry: 2,
        },
    },
});
