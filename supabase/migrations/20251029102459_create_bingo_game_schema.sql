/*
  # BINGO Economic-Political Game Schema

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key) - Unique room identifier
      - `room_code` (text, unique) - 6-character code for joining
      - `host_name` (text) - MC/Host name
      - `current_question` (text, nullable) - Current question being displayed
      - `current_term` (text, nullable) - Current term answer
      - `status` (text) - Room status: 'waiting', 'playing', 'finished'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `players`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key to rooms)
      - `player_name` (text)
      - `board` (jsonb) - 5x5 array of terms
      - `selected_cells` (jsonb) - Array of selected cell positions
      - `is_winner` (boolean)
      - `joined_at` (timestamptz)
    
    - `game_terms`
      - `id` (uuid, primary key)
      - `term` (text) - Economic/political term
      - `description` (text) - Question/hint for the term
      - `category` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public access for reading rooms and players (game is open)
    - Authenticated and anonymous users can create/update their own data
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text UNIQUE NOT NULL,
  host_name text NOT NULL,
  current_question text,
  current_term text,
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  player_name text NOT NULL,
  board jsonb NOT NULL DEFAULT '[]',
  selected_cells jsonb NOT NULL DEFAULT '[]',
  is_winner boolean DEFAULT false,
  joined_at timestamptz DEFAULT now()
);

-- Create game_terms table
CREATE TABLE IF NOT EXISTS game_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  description text NOT NULL,
  category text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_terms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Anyone can view rooms"
  ON rooms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create rooms"
  ON rooms FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update rooms"
  ON rooms FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete rooms"
  ON rooms FOR DELETE
  USING (true);

-- RLS Policies for players
CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create player records"
  ON players FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update player records"
  ON players FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete player records"
  ON players FOR DELETE
  USING (true);

-- RLS Policies for game_terms
CREATE POLICY "Anyone can view game terms"
  ON game_terms FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create game terms"
  ON game_terms FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON players(room_id);

-- Enable Realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_terms;

-- Insert sample economic-political terms
INSERT INTO game_terms (term, description, category) VALUES
  ('Giá trị thизлишng dư', 'Phần giá trị mà công nhân tạo ra nhưng không được trả công', 'Kinh tế chính trị Mác'),
  ('Tư bản bất biến', 'Phần tư bản dùng mua tư liệu sản xuất, không thay đổi giá trị', 'Kinh tế chính trị Mác'),
  ('Tư bản khả biến', 'Phần tư bản dùng mua sức lao động, tạo ra giá trị mới', 'Kinh tế chính trị Mác'),
  ('Tỷ suất giá trị thặng dư', 'Tỷ lệ giữa giá trị thặng dư và tư bản khả biến', 'Kinh tế chính trị Mác'),
  ('Tư bản hữu cơ', 'Tỷ lệ giữa tư bản bất biến và tư bản khả biến', 'Kinh tế chính trị Mác'),
  ('Tích lũy tư bản', 'Chuyển hóa giá trị thặng dư thành tư bản bổ sung', 'Kinh tế chính trị Mác'),
  ('Dân số dư thừa', 'Lực lượng lao động không được sử dụng trong sản xuất', 'Kinh tế chính trị Mác'),
  ('Tái sản xuất giản đơn', 'Sản xuất lặp lại với quy mô không đổi', 'Kinh tế chính trị Mác'),
  ('Tái sản xuất mở rộng', 'Sản xuất lặp lại với quy mô ngày càng lớn', 'Kinh tế chính trị Mác'),
  ('Chu전환 tư bản', 'Quá trình vận động của tư bản qua các hình thái', 'Kinh tế chính trị Mác'),
  ('Tốc độ chu전환', 'Số lần tư bản hoàn thành chu전환 trong một năm', 'Kinh tế chính trị Mác'),
  ('Tư bản cố định', 'Phần tư bản chuyển giá trị dần dần vào sản phẩm', 'Kinh tế chính trị Mác'),
  ('Tư bản lưu động', 'Phần tư bản chuyển giá trị một lần vào sản phẩm', 'Kinh tế chính trị Mác'),
  ('Lợi nhuận', 'Hình thái biểu hiện của giá trị thặng dư', 'Kinh tế chính trị Mác'),
  ('Tỷ suất lợi nhuận', 'Tỷ lệ giữa giá trị thặng dư và toàn bộ tư bản ứng trước', 'Kinh tế chính trị Mác'),
  ('Giá cả sản xuất', 'Tổng giá trị tư liệu sản xuất và lợi nhuận bình quân', 'Kinh tế chính trị Mác'),
  ('Lợi nhuận siêu ngạch', 'Phần lợi nhuận vượt quá lợi nhuận bình quân', 'Kinh tế chính trị Mác'),
  ('Địa tô', 'Thu nhập của chủ đất từ việc cho thuê đất', 'Kinh tế chính trị Mác'),
  ('Địa tô tuyệt đối', 'Địa tô phải trả cho mọi loại đất', 'Kinh tế chính trị Mác'),
  ('Địa tô chênh lệch', 'Địa tô phát sinh do độ phì nhiêu hoặc vị trí đất khác nhau', 'Kinh tế chính trị Mác'),
  ('Tiền công', 'Giá cả của sức lao động', 'Kinh tế chính trị Mác'),
  ('Tiền công danh nghĩa', 'Số tiền công nhận được tính bằng tiền', 'Kinh tế chính trị Mác'),
  ('Tiền công thực tế', 'Lượng hàng hóa mua được bằng tiền công', 'Kinh tế chính trị Mác'),
  ('Bóc lột', 'Chiếm đoạt sản phẩm lao động của người khác không công', 'Kinh tế chính trị Mác'),
  ('Giai cấp tư sản', 'Giai cấp sở hữu tư liệu sản xuất, bóc lột người lao động', 'Kinh tế chính trị Mác'),
  ('Giai cấp vô sản', 'Giai cấp không sở hữu tư liệu sản xuất, bán sức lao động', 'Kinh tế chính trị Mác'),
  ('Hàng hóa', 'Sản phẩm lao động dùng để trao đổi', 'Kinh tế chính trị Mác'),
  ('Giá trị sử dụng', 'Công dụng của hàng hóa thỏa mãn nhu cầu con người', 'Kinh tế chính trị Mác'),
  ('Giá trị', 'Lao động xã hội kết tinh trong hàng hóa', 'Kinh tế chính trị Mác'),
  ('Lao động xã hội', 'Lao động cần thiết để sản xuất hàng hóa', 'Kinh tế chính trị Mác'),
  ('Quy luật giá trị', 'Quy luật điều tiết sản xuất và lưu thông hàng hóa', 'Kinh tế chính trị Mác'),
  ('Tiền tệ', 'Hàng hóa đặc biệt làm vật ngang giá chung', 'Kinh tế chính trị Mác'),
  ('Chủ nghĩa tư bản', 'Chế độ xã hội dựa trên sở hữu tư nhân tư liệu sản xuất', 'Kinh tế chính trị Mác'),
  ('Chủ nghĩa xã hội', 'Chế độ xã hội quá độ lên chủ nghĩa cộng sản', 'Kinh tế chính trị Mác'),
  ('Cách mạng xã hội', 'Sự thay đổi căn bản quan hệ sản xuất và thượng tầng kiến trúc', 'Kinh tế chính trị Mác'),
  ('Sản xuất hàng hóa', 'Hình thức tổ chức sản xuất nhằm trao đổi trên thị trường', 'Kinh tế chính trị Mác'),
  ('Phân công lao động xã hội', 'Sự phân chia các ngành nghề trong xã hội', 'Kinh tế chính trị Mác'),
  ('Tư liệu sản xuất', 'Công cụ và đối tượng lao động', 'Kinh tế chính trị Mác'),
  ('Quan hệ sản xuất', 'Quan hệ giữa người với người trong quá trình sản xuất', 'Kinh tế chính trị Mác'),
  ('Lực lượng sản xuất', 'Con người và tư liệu sản xuất trong sự thống nhất', 'Kinh tế chính trị Mác')
ON CONFLICT DO NOTHING;