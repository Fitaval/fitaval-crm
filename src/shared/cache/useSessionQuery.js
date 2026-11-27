import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionCache } from './sessionCache';

/**
 * Stale-While-Revalidate hook backed by sessionCache.
 * - Renders cached data immediately (no blocking spinner on back navigation or reload)
 * - Quietly revalidates in the background (deduplicated across concurrent callers)
 * - Preserves existing cached data on transient network errors
 * - Automatically updates when mutations call sessionCache.set / update / invalidate
 */
export function useSessionQuery(cacheKey, fetcher, { enabled = true, initialData = undefined } = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState(() => {
    const cached = sessionCache.get(cacheKey);
    return cached !== undefined ? cached : initialData;
  });
  const [isLoading, setIsLoading] = useState(() => sessionCache.get(cacheKey) === undefined);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);

  const revalidate = useCallback(async () => {
    if (!enabled || !cacheKey) return undefined;
    setIsFetching(true);
    setError(null);
    try {
      const fresh = await sessionCache.fetchAndCache(cacheKey, () => fetcherRef.current());
      setData(fresh);
      return fresh;
    } catch (err) {
      setError(err);
      return undefined;
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [cacheKey, enabled]);

  useEffect(() => {
    if (!enabled || !cacheKey) return undefined;

    const cached = sessionCache.get(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const unsub = sessionCache.subscribe(cacheKey, (next) => {
      if (next !== undefined) {
        setData(next);
        setIsLoading(false);
      }
    });

    revalidate();
    return unsub;
  }, [cacheKey, enabled, revalidate]);

  return {
    data,
    setData: (updater) => sessionCache.update(cacheKey, updater),
    isLoading,
    isFetching,
    error,
    refetch: revalidate,
  };
}
