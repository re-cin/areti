import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useDataVersion } from '@/stores/dataVersion';

/**
 * Runs an async database read when the screen gains focus, and again whenever
 * data changes (see bumpData) or a dependency changes.
 */
export function useDbQuery<T>(query: () => Promise<T>, deps: readonly unknown[], initial: T): T {
  const version = useDataVersion((s) => s.version);
  const [data, setData] = useState<T>(initial);
  const queryRef = useRef(query);
  queryRef.current = query;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      queryRef
        .current()
        .then((result) => {
          if (alive) setData(result);
        })
        .catch((e) => console.warn('[useDbQuery]', e));
      return () => {
        alive = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [version, ...deps]),
  );

  return data;
}
