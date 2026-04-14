import { supabase } from '@/integrations/supabase/client';

export interface ProfileLite {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

/**
 * Batch-fetch the common display fields (full_name + avatar_url) for a set
 * of user IDs and return them keyed by user_id.
 *
 * Callers previously hand-rolled this query in useForum, useAssessments,
 * useExamHistory, etc. — each with slightly different column lists and
 * inconsistent handling of empty inputs and falsy IDs. This helper
 * centralises the pattern so that future schema tweaks (e.g. adding a
 * display_name column) only need to be made in one place.
 *
 * Returns an empty Map when there are no IDs to fetch; never throws on an
 * empty input so callers can pass arbitrary arrays safely.
 */
export async function fetchProfilesByIds(
  userIds: readonly string[]
): Promise<Map<string, ProfileLite>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name, avatar_url')
    .in('user_id', uniqueIds);

  if (error) throw error;

  const map = new Map<string, ProfileLite>();
  for (const row of data || []) {
    map.set(row.user_id, {
      user_id: row.user_id,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
    });
  }
  return map;
}

/**
 * Narrow variant used by admin/professor tooling that only cares about the
 * display name. Skips avatar hydration to keep the payload small on large
 * batches (e.g. classroom rosters).
 */
export async function fetchProfileNamesByIds(
  userIds: readonly string[]
): Promise<Map<string, string | null>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', uniqueIds);

  if (error) throw error;

  const map = new Map<string, string | null>();
  for (const row of data || []) {
    map.set(row.user_id, row.full_name ?? null);
  }
  return map;
}
