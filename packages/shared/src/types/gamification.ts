export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_url: string | null;
  xp_reward: number;
  criteria: Record<string, unknown>;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface UserStats {
  user_id: string;
  total_xp: number;
  current_level: number;
  streak_days: number;
  last_activity_at: string | null;
  rank_title: string;
}

export interface Level {
  level_number: number;
  xp_threshold: number;
  rank_name: string;
  badge_url: string | null;
}
