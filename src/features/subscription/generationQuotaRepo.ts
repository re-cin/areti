import { supabase, supabaseConfigured } from '@/lib/supabase';
import {
  GenerationLimitError, GenerationUnavailableError, parseConsumeResult, parseQuota, type GenerationQuota,
} from './generationQuota';

/**
 * Free students get a few schedule generations a month, counted per account on the server so that
 * reinstalling or clearing the app cannot reset them. Premium never calls this.
 */

async function signedIn(): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

/**
 * Uses one generation. Resolves when the student may generate; throws GenerationLimitError when the
 * month's allowance is spent, or GenerationUnavailableError when the server cannot confirm it
 * (offline or signed out), in which case nothing is generated and nothing is used.
 */
export async function reserveGeneration(): Promise<void> {
  let reply: unknown;
  try {
    if (!await signedIn()) throw new GenerationUnavailableError();
    const { data, error } = await supabase.rpc('consume_schedule_generation');
    if (error) throw /column .+ does not exist/i.test(error.message) || error.code === '42703'
      ? new GenerationUnavailableError(undefined, 'server-schema')
      : new GenerationUnavailableError(error.message);
    reply = data;
  } catch (error) {
    if (error instanceof GenerationUnavailableError) throw error;
    throw new GenerationUnavailableError(String(error));
  }
  const result = parseConsumeResult(reply);
  if (!result) throw new GenerationUnavailableError();
  if (!result.allowed) throw new GenerationLimitError(result.quota.limit, result.quota.resetsAt);
}

/** This month's usage for the UI. Null when it cannot be read (offline, signed out) or the student is Premium. */
export async function getGenerationQuota(): Promise<GenerationQuota | null> {
  try {
    if (!await signedIn()) return null;
    const { data, error } = await supabase.rpc('schedule_generation_usage');
    if (error) return null;
    const quota = parseQuota(data);
    return quota === 'premium' ? null : quota;
  } catch {
    return null;
  }
}
