import { QueryClient } from '@tanstack/react-query';
import { sessionCache } from '../../shared/cache/sessionCache';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

// Automatically wipe TanStack Query cache on logout or role/user switch
sessionCache.registerQueryClient(queryClientInstance);
