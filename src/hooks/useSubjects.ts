import { subjectsQuery } from '@/db/queries/subjects';
import { useDbQuery } from '@/lib/useDbQuery';
import { useMemo } from 'react';

const loadSubjects = async () => subjectsQuery();

export function useSubjects() {
  const data = useDbQuery(loadSubjects, [] as Awaited<ReturnType<typeof loadSubjects>>);
  const byId = useMemo(() => new Map(data.map((s) => [s.id, s])), [data]);
  return { subjects: data, byId };
}
