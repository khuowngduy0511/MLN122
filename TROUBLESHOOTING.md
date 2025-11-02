# Hướng dẫn khắc phục sự cố - BINGO Game

## Vấn đề: Người chơi vào phòng nhưng MC không thấy hiển thị

### Các bước đã sửa:

1. **Cập nhật MCInterface.tsx**
   - Thêm callback async cho postgres_changes event
   - Thêm console.log để debug
   - Thêm subscribe callback để theo dõi trạng thái channel

2. **Cập nhật supabase.ts**
   - Thêm cấu hình Realtime với eventsPerSecond
   - Đảm bảo connection ổn định hơn

3. **Cập nhật migration SQL**
   - Enable Realtime cho các bảng: rooms, players, game_terms
   - Sử dụng ALTER PUBLICATION để đảm bảo realtime được bật

### Kiểm tra và khắc phục:

#### Bước 1: Kết nối và Kiểm tra Supabase Dashboard

**Cách kết nối:**
1. Mở trình duyệt và truy cập: **https://supabase.com/dashboard**
2. Đăng nhập bằng tài khoản của bạn (GitHub, Google, hoặc Email)
3. Chọn project của bạn từ danh sách projects
4. Bạn sẽ thấy URL project có dạng: `https://supabase.com/dashboard/project/[your-project-id]`

**Lấy thông tin project:**
- Trong Dashboard, click vào **⚙️ Settings** (góc trái dưới)
- Vào **API** để xem:
  - `Project URL` → Đây là `VITE_SUPABASE_URL`
  - `anon/public key` → Đây là `VITE_SUPABASE_ANON_KEY`

**Enable Realtime cho bảng:**
1. Vào **Database** (icon 🗄️ bên trái)
2. Click tab **Replication**
3. Tìm bảng `rooms`, `players`, `game_terms` trong danh sách
4. Đảm bảo mỗi bảng có toggle "Enable Realtime" đang BẬT (màu xanh)
5. Nếu chưa bật, click vào toggle để enable

**Hoặc enable qua SQL Editor:**
1. Vào **SQL Editor** (icon ⚡ bên trái)
2. Click **+ New query**
3. Copy và chạy câu lệnh sau:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE game_terms;
```
4. Click **Run** (hoặc Ctrl+Enter)

#### Bước 2: Chạy lại Migration
```bash
# Nếu bạn đang sử dụng Supabase CLI
supabase db reset

# Hoặc chạy lại migration file thông qua SQL Editor trong Dashboard
```

#### Bước 3: Kiểm tra Console Log
1. Mở DevTools (F12) trên cả 2 cửa sổ (MC và Player)
2. Vào tab **Console**
3. Khi người chơi tham gia, bạn sẽ thấy:
   - Trong MC console: "Players channel status: SUBSCRIBED"
   - Trong MC console: "Player change detected: {...}"

#### Bước 4: Kiểm tra Network
1. Mở DevTools → tab **Network**
2. Filter theo "realtime"
3. Đảm bảo WebSocket connection thành công (status 101)

### Nếu vẫn không hoạt động:

#### Giải pháp tạm thời - Polling thay vì Realtime:

Thêm vào `MCInterface.tsx`, sau useEffect hiện tại:

```typescript
// Fallback polling nếu realtime không hoạt động
useEffect(() => {
  if (!room) return;
  
  const interval = setInterval(() => {
    loadPlayers();
  }, 3000); // Refresh mỗi 3 giây
  
  return () => clearInterval(interval);
}, [room]);
```

### Kiểm tra Environment Variables:

Đảm bảo file `.env` có:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Debug nhanh:

Thêm button test trong MC Interface để force reload:

```typescript
<button onClick={loadPlayers} className="...">
  🔄 Refresh Players
</button>
```

### Liên hệ hỗ trợ:

Nếu vấn đề vẫn tiếp diễn, kiểm tra:
1. Supabase project có đang ở free tier và đã hết quota?
2. Network có bị chặn WebSocket connections?
3. Browser console có báo lỗi CORS?
