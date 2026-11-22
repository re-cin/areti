import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useTimer } from '@/features/timer/timerStore';
import { deleteStudyPlan } from './examsRepo';

/** Shared delete flow for the plan screen and the complete study-plan list. */
export function useStudyPlanDeletion(onDeleted?: (id: string) => void) {
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const remove = async () => {
    if (!target || running.current) return;
    running.current = true; setBusy(true);
    try {
      const result = await deleteStudyPlan(target.id);
      if (result.detachedSessionId) await useTimer.getState().detachPlannedSession(result.detachedSessionId)
        .catch(error => console.warn('[planner] Plan deleted; timer persistence will retry', error));
      setTarget(null);
      onDeleted?.(target.id);
    } catch (error) { Alert.alert('Could not delete study plan', String(error)); }
    finally { running.current = false; setBusy(false); }
  };
  return {
    busy,
    request: (id: string, name: string) => { if (!running.current) setTarget({ id, name }); },
    dialog: <ConfirmDialog visible={target !== null} title="Delete study plan?" icon="trash" destructive
      message={`Delete ${target?.name ?? 'this plan'} and its unfinished study sessions? Completed tasks, recorded focus time, and earned XP are kept. A running timer can continue as an unplanned session.`}
      confirmLabel={busy ? 'Deleting…' : 'Delete plan'} onConfirm={() => void remove()}
      onCancel={() => { if (!running.current) setTarget(null); }} />,
  };
}
