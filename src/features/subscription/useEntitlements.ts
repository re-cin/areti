import { getEntitlements } from '@/features/planner/examsRepo';
import { useDataVersion } from '@/stores/dataVersion';
import { useEffect, useState } from 'react';
import { entitlementsFor, type Entitlements } from './entitlements';

/** The student's current capabilities (Free until a Premium subscription is confirmed). */
export function useEntitlements(): Entitlements {
  const version = useDataVersion(s => s.version);
  const [entitlements, setEntitlements] = useState<Entitlements>(() => entitlementsFor('free'));
  useEffect(() => {
    let live = true;
    getEntitlements().then(value => { if (live) setEntitlements(value); }).catch(() => {});
    return () => { live = false; };
  }, [version]);
  return entitlements;
}
