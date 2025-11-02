import { useState } from 'react';
import MCInterface from './components/MCInterface';
import PlayerInterface from './components/PlayerInterface';
import { Users, Mic, Info, X, Brain, Users as UsersIcon } from 'lucide-react';

type Role = 'select' | 'mc' | 'player';

function App() {
  const [role, setRole] = useState<Role>('select');
  const [showInfo, setShowInfo] = useState(false);

  if (role === 'mc') {
    return <MCInterface />;
  }

  if (role === 'player') {
    return <PlayerInterface />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 via-purple-700 to-blue-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
            🎯BINGO GAME - MLN122🎯
          </h1>
          <p className="text-xl text-white/90 drop-shadow-lg">
            Vừa chơi vừa học lý thuyết kinh tế chính trị!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => setRole('mc')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-all transform hover:shadow-red-500/50 group"
          >
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-red-200 transition-colors">
                <Mic className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                MC - Người Dẫn
              </h2>
              <p className="text-gray-600 text-center">
                Tạo phòng game, bốc câu hỏi và điều khiển trò chơi
              </p>
              <div className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold group-hover:bg-red-700 transition-colors">
                Tạo Phòng Mới
              </div>
            </div>
          </button>

          <button
            onClick={() => setRole('player')}
            className="bg-white rounded-2xl shadow-2xl p-8 hover:scale-105 transition-all transform hover:shadow-blue-500/50 group"
          >
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                <Users className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Người Chơi
              </h2>
              <p className="text-gray-600 text-center">
                Tham gia phòng bằng mã code và chơi BINGO
              </p>
              <div className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold group-hover:bg-blue-700 transition-colors">
                Tham Gia Phòng
              </div>
            </div>
          </button>
        </div>

        <div className="mt-12 bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4">📖 Cách chơi:</h3>
          <div className="space-y-2 text-white/90">
            <p>1. <strong>MC</strong> tạo phòng và nhận mã phòng 6 ký tự</p>
            <p>2. <strong>Người chơi</strong> nhập mã phòng để tham gia</p>
            <p>3. Mỗi người nhận bảng BINGO 5×5 với các thuật ngữ kinh tế ngẫu nhiên</p>
            <p>4. MC đọc câu hỏi/gợi ý → Người chơi có 36 giây để nhấn vào ô đáp án tương ứng</p>
            <p>5. Khi có 5 ô thẳng hàng (ngang hoặc dọc) → Nhấn <strong>"MÁC BINGO!"</strong></p>
            <p>6. MC xác nhận người thắng cuộc 🏆</p>
          </div>
        </div>
      </div>

      {/* Nút Thông tin ở góc dưới phải */}
      <button
        onClick={() => setShowInfo(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all hover:shadow-blue-500/50 group z-50"
        aria-label="Thông tin nhóm"
      >
        <Info className="w-7 h-7 text-blue-600 group-hover:text-blue-700" />
      </button>

      {/* Modal thông tin */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Info className="w-8 h-8" />
                Thông Tin Sản Phẩm Sáng Tạo
              </h2>
              <button
                onClick={() => setShowInfo(false)}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Thông tin nhóm */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 border-2 border-blue-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <UsersIcon className="w-6 h-6 text-blue-600" />
                  Thông Tin Nhóm
                </h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex items-start gap-3">
                    <span className="font-semibold min-w-[120px]">Tên sản phẩm :</span>
                    <span>BINGO GAME</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-semibold min-w-[120px]">Môn học:</span>
                    <span>MLN122</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-semibold min-w-[120px]">Lớp:</span>
                    <span>Nhóm 1</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="font-semibold min-w-[120px]">Thành viên:</span>
                    <div className="flex-1">
                      <p>• Trần Hạ Khương Duy - MSSV: QE180075</p>
                      <p>• Nguyễn Đào Bách - MSSV: QE180006</p>
                      <p>• Đoàn Hiểu Minh - MSSV: SE183556</p>
                      <p>• Bùi Anh Kha - MSSV: SE181730</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minh bạch AI */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border-2 border-purple-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Brain className="w-6 h-6 text-purple-600" />
                  Minh Bạch AI
                </h3>
                <div className="space-y-4 text-gray-700">
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">🤖 AI được sử dụng:</h4>
                    <p className="leading-relaxed">
                      • <strong>GitHub Copilot</strong> - Hỗ trợ code React/TypeScript<br/>
                      • <strong>Claude AI</strong> - Tư vấn thiết kế game logic & database<br/>
                      • <strong>OpenAI GPT-4</strong> - Tạo nội dung câu hỏi & phân tích
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">✨ Chức năng AI:</h4>
                    <p className="leading-relaxed">
                      • <strong>Phân tích thống kê học tập:</strong> AI phân tích kết quả game để đưa ra báo cáo về độ khó của từng thuật ngữ, điểm mạnh/yếu của người chơi<br/>
                      • <strong>Đề xuất cải thiện:</strong> Dựa trên dữ liệu game, AI đề xuất các thuật ngữ cần ôn tập thêm<br/>
                      • <strong>Trực quan hóa:</strong> Biểu đồ thống kê (Pie Chart, Bar Chart) giúp dễ hiểu
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-purple-900 mb-2">🎯 Mục đích sử dụng AI:</h4>
                    <p className="leading-relaxed">
                      • Tăng tốc phát triển sản phẩm<br/>
                      • Đảm bảo code chất lượng và best practices<br/>
                      • Tạo trải nghiệm học tập tương tác và hiệu quả<br/>
                      • Phân tích dữ liệu học tập để cải thiện phương pháp
                    </p>
                  </div>

                  <div className="bg-white/70 rounded-lg p-4 border-l-4 border-purple-500">
                    <p className="text-sm">
                      <strong>📢 Cam kết:</strong> Toàn bộ logic nghiệp vụ, thiết kế UX/UI và ý tưởng game 
                      do nhóm tự phát triển. AI chỉ đóng vai trò hỗ trợ công cụ, không thay thế sự sáng tạo của con người.
                    </p>
                  </div>
                </div>
              </div>

              {/* Công nghệ */}
              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-5 border-2 border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-4">⚙️ Công Nghệ Sử Dụng</h3>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
                  <div className="bg-white/70 rounded-lg p-3">
                    <strong>Frontend:</strong> React + TypeScript
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <strong>Backend:</strong> Supabase (PostgreSQL)
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <strong>Realtime:</strong> Supabase Realtime
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <strong>UI:</strong> Tailwind CSS
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <strong>Charts:</strong> Recharts
                  </div>
                  <div className="bg-white/70 rounded-lg p-3">
                    <strong>Icons:</strong> Lucide React
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-gray-500 text-sm pt-4 border-t">
                <p>© 2025-2026 Nhóm 1 - Made with ❤️ and AI assistance.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
