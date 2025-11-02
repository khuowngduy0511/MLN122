-- Cập nhật bảng rooms để thêm các trường mới
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS answer_revealed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS question_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS winners_count INTEGER DEFAULT 0;

-- Cập nhật bảng players để thêm các trường mới
ALTER TABLE players
ADD COLUMN IF NOT EXISTS correct_cells JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS wrong_cells JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bingo_requested BOOLEAN DEFAULT false;

-- Đảm bảo Realtime vẫn được enable
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_terms;
