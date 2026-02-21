export interface User {
  id: string;
  email: string;
  password_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface AlumniProfile {
  id: string;
  user_id: string;
  institution_id: string;
  grad_year: number | null;
  degree: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Challenge {
  id: string;
  institution_id: string;
  title: string;
  description: string;
  type: "solo" | "group" | "community";
  start_at: string;
  end_at: string;
  points: number;
  config: ChallengeConfig;
  created_at: string;
  updated_at: string;
}

export interface ChallengeConfig {
  milestones?: number;
  max_team_size?: number;
  xp_per_milestone?: number;
  [key: string]: unknown;
}

export interface ChallengeParticipation {
  id: string;
  challenge_id: string;
  user_id: string;
  status: "active" | "completed" | "abandoned";
  joined_at: string;
  team_id?: string;
}
