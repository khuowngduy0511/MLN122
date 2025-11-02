import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

export type Room = {
  id: string;
  room_code: string;
  host_name: string;
  current_question: string | null;
  current_term: string | null;
  answer_revealed: boolean;
  question_start_time: string | null;
  winners_count: number;
  locked_terms: string[]; // Danh sách các term đã bị khóa (đáp án đúng)
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
  updated_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  player_name: string;
  board: string[][];
  selected_cells: number[][];
  correct_cells: number[][];
  wrong_cells: number[][];
  is_winner: boolean;
  bingo_requested: boolean;
  joined_at: string;
};

export type GameTerm = {
  id: string;
  term: string;
  description: string;
  category: string | null;
  created_at: string;
};
