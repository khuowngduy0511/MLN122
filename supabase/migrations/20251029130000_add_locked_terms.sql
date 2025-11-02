-- Thêm cột locked_terms vào bảng rooms
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS locked_terms TEXT[] DEFAULT '{}';

-- Xóa các cột không cần thiết ở players (vì giờ dùng locked_terms chung)
-- Giữ lại wrong_cells để hiển thị tạm thời
