import { supabase } from '@/integrations/supabase/client';

/**
 * Public ranking data is served only through narrow database functions that
 * return display names and scores — never whole profile or stats rows.
 */
export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  total_tasks_completed: number;
}

export interface SeasonRow {
  user_id: string;
  display_name: string;
  season_xp: number;
  league: string;
}

// The generated types do not know these functions until they are regenerated.
const rpc = supabase.rpc.bind(supabase) as unknown as <T>(
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: T | null; error: { message: string } | null }>;

export const fetchLeaderboard = async (): Promise<LeaderboardRow[]> => {
  const { data, error } = await rpc<LeaderboardRow[]>('get_leaderboard');
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const fetchSeasonLeaderboard = async (season: number): Promise<SeasonRow[]> => {
  const { data, error } = await rpc<SeasonRow[]>('get_season_leaderboard', { _season: season });
  if (error) throw new Error(error.message);
  return data ?? [];
};

export const findProfileByName = async (
  query: string,
): Promise<{ user_id: string; display_name: string } | null> => {
  const { data, error } = await rpc<{ user_id: string; display_name: string }[]>(
    'find_profile_by_name',
    { _query: query },
  );
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
};
