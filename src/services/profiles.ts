import { supabase } from '@/integrations/supabase/client';

export interface ProfileLite {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

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
