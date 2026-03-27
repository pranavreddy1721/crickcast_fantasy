import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export interface Team {
  id: string;
  name?: string;
  team_name?: string;
  owner_name?: string;
  owner?: string;
  created_at?: string;
}

export interface Player {
  id: string;
  name: string;
  team_id: string;
  role?: string;
  position?: string;
  is_captain?: boolean;
  is_vice_captain?: boolean;
  created_at?: string;
}

export interface PlayerPoint {
  id: string;
  player_id: string;
  points: number;
  match_number?: number;
  created_at?: string;
}

export interface TeamWithPoints extends Team {
  totalPoints: number;
  displayName: string;
}

export interface PlayerWithPoints extends Player {
  totalPoints: number;
  effectivePoints: number;
}