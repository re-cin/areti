import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useDataVersion } from '@/stores/dataVersion';

/**
 * Runs an async database read when the screen gains focus, and again whenever
 * data changes (see bumpData) or a dependency changes.
 */
export function useDbQuery<T>(query: () => Promise<T>, initial: T, refreshToken = 0): T {
  const version = useDataVersion((s) => s.version);
  const [data, setData] = useState<T>(initial);

  useFocusEffect(
    useCallback(() => {
      // These signals intentionally rerun stable database queries after writes or a manual refresh.
      void version;
      void refreshToken;
      let alive = true;
      query()
        .then((result) => {
          if (alive) setData(result);
        })
        .catch((e) => console.warn('[useDbQuery]', e));
      return () => {
        alive = false;
      };
    }, [query, version, refreshToken]),
  );

  return data;
}
