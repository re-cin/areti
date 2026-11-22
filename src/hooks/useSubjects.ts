import { subjectsQuery } from '@/db/queries/subjects';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

export function useSubjects() {
  const { data } = useLiveQuery(subjectsQuery());
  const byId = useMemo(() => new Map(data.map((s) => [s.id, s])), [data]);
  return { subjects: data, byId };
}
