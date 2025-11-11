import { useState, useEffect } from 'react';
import { supabase, Room, Player, GameTerm } from '../lib/supabase';
import { generateRoomCode } from '../utils/gameLogic';
import { Users, PlayCircle, Trophy, RefreshCw, Copy, CheckCircle, Clock, AlertCircle, BarChart3, TrendingUp, Award, Brain, Target, BookOpen } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function MCInterface() {
  const [hostName, setHostName] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [allTerms, setAllTerms] = useState<GameTerm[]>([]);
  const [usedTerms, setUsedTerms] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerActive, setTimerActive] = useState(false);
  const [showAIReport, setShowAIReport] = useState(false);
  const [aiReportData, setAIReportData] = useState<any>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    loadTerms();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  useEffect(() => {
    if (!room) return;

    const playersChannel = supabase
      .channel(`room:${room.id}:players`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        console.log('Player change detected:', payload);
        await loadPlayers();
      })
      .subscribe((status) => {
        console.log('Players channel status:', status);
      });

    loadPlayers();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [room]);

  async function loadTerms() {
    const { data } = await supabase
      .from('game_terms')
      .select('*')
      .order('term');

    if (data) setAllTerms(data);
  }

  async function loadPlayers() {
    if (!room) return;

    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .order('joined_at');

    if (data) setPlayers(data);
  }

  async function createRoom() {
    if (!hostName.trim()) return;

    const roomCode = generateRoomCode();

    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_code: roomCode,
        host_name: hostName,
        status: 'waiting'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating room:', error);
      return;
    }

    setRoom(data);
  }

  async function startGame() {
    if (!room) return;

    await supabase
      .from('rooms')
      .update({ status: 'playing', updated_at: new Date().toISOString() })
      .eq('id', room.id);

    setRoom({ ...room, status: 'playing' });
  }

  async function drawQuestion() {
    if (!room || allTerms.length === 0) return;

    const availableTerms = allTerms.filter(t => !usedTerms.has(t.term));

    if (availableTerms.length === 0) {
      // Hết câu hỏi - kết thúc game
      await supabase
        .from('rooms')
        .update({ 
          status: 'finished',
          updated_at: new Date().toISOString() 
        })
        .eq('id', room.id);
      
      setRoom({ ...room, status: 'finished' });
      alert('🏁 Đã hết câu hỏi! Trò chơi kết thúc!');
      return;
    }

    const randomTerm = availableTerms[Math.floor(Math.random() * availableTerms.length)];

    await supabase
      .from('rooms')
      .update({
        current_question: randomTerm.description,
        current_term: randomTerm.term,
        answer_revealed: false,
        question_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id);

    setUsedTerms(prev => new Set([...prev, randomTerm.term]));
    setRoom({
      ...room,
      current_question: randomTerm.description,
      current_term: randomTerm.term,
      answer_revealed: false,
      question_start_time: new Date().toISOString()
    });
    
    // Reset và bắt đầu timer (30 giây)
    setTimeLeft(30);
    setTimerActive(true);
  }

  async function revealAnswer() {
    if (!room || !room.current_term) return;

    // Thêm term hiện tại vào danh sách locked_terms
    const updatedLockedTerms = [...(room.locked_terms || []), room.current_term];

    await supabase
      .from('rooms')
      .update({
        answer_revealed: true,
        locked_terms: updatedLockedTerms,
        updated_at: new Date().toISOString()
      })
      .eq('id', room.id);

    setRoom({ ...room, answer_revealed: true, locked_terms: updatedLockedTerms });
    setTimerActive(false);
  }

  async function confirmWinner(playerId: string) {
    if (!room) return;

    const currentWinners = players.filter(p => p.is_winner).length;
    
    if (currentWinners >= 1) {
      alert('⚠️ Đã có người thắng cuộc!');
      return;
    }

    if (!confirm('Xác nhận người chơi này thắng?')) return;

    await supabase
      .from('players')
      .update({ 
        is_winner: true,
        bingo_requested: false 
      })
      .eq('id', playerId);

    const newWinnersCount = 1;
    
    // Cập nhật số người thắng
    await supabase
      .from('rooms')
      .update({ 
        winners_count: newWinnersCount,
        updated_at: new Date().toISOString() 
      })
      .eq('id', room.id);

    // Kết thúc game ngay khi có 1 người thắng
    await supabase
      .from('rooms')
      .update({ 
        status: 'finished',
        updated_at: new Date().toISOString() 
      })
      .eq('id', room.id);
    
    alert('🎉 Có người thắng cuộc! Trò chơi kết thúc!');
    await loadPlayers();
    setRoom({ ...room, status: 'finished', winners_count: newWinnersCount });
  }

  async function rejectBingo(playerId: string) {
    await supabase
      .from('players')
      .update({ bingo_requested: false })
      .eq('id', playerId);
    
    await loadPlayers();
  }

  async function generateAIReport() {
    if (!room || !players.length) return;

    setShowAIReport(true);
    setModalPosition({ x: 0, y: 0 }); // Reset position to center
    
    // Phân tích dữ liệu
    const analysis = analyzeGameData();
    
    // Prepare data for visualization
    const reportData = {
      roomInfo: {
        code: room.room_code,
        playerCount: players.length,
        questionCount: room.locked_terms?.length || 0,
        timestamp: new Date().toLocaleString('vi-VN')
      },
      analysis,
      recommendations: generateRecommendations(analysis)
    };
    
    setAIReportData(reportData);
  }

  // Drag handlers for modal
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.modal-content')) return; // Don't drag when clicking content
    if ((e.target as HTMLElement).closest('button')) return; // Don't drag when clicking buttons
    setIsDragging(true);
    setDragStart({
      x: e.clientX - modalPosition.x,
      y: e.clientY - modalPosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    // Calculate new position
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Get viewport dimensions
    const maxX = window.innerWidth / 4;
    const maxY = window.innerHeight / 4;
    
    // Limit dragging within reasonable bounds
    setModalPosition({
      x: Math.max(-maxX, Math.min(maxX, newX)),
      y: Math.max(-maxY, Math.min(maxY, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  function analyzeGameData() {
    const lockedTerms = room?.locked_terms || [];
    
    // Phân tích từng khái niệm
    const termDifficulty = lockedTerms.map(term => {
      const correctCount = players.filter(p => 
        p.selected_cells.some(([row, col]) => p.board[row]?.[col] === term)
      ).length;
      
      const correctRate = Math.round((correctCount / players.length) * 100);
      const wrongRate = 100 - correctRate;
      
      let difficulty = 'Dễ';
      if (correctRate < 50) difficulty = 'Khó';
      else if (correctRate < 80) difficulty = 'Trung bình';
      
      const termData = allTerms.find(t => t.term === term);
      
      return {
        term,
        category: termData?.category || 'Khác',
        correctCount,
        correctRate,
        wrongRate,
        difficulty
      };
    });

    // Sắp xếp theo độ khó (khó nhất lên đầu)
    termDifficulty.sort((a, b) => a.correctRate - b.correctRate);

    // Phân tích người chơi
    const playerStats = players.map(player => {
      const correctCount = player.selected_cells.filter(([row, col]) => {
        const term = player.board[row]?.[col];
        return term && lockedTerms.includes(term);
      }).length;
      
      const wrongCount = player.wrong_cells?.length || 0;
      const correctRate = Math.round((correctCount / Math.max(lockedTerms.length, 1)) * 100);
      const score = Math.round((correctCount * 100) / Math.max(lockedTerms.length, 1));
      
      // Tìm topic yếu
      const weakTopics: string[] = [];
      termDifficulty.forEach(term => {
        const hasThisTerm = player.selected_cells.some(([row, col]) => 
          player.board[row]?.[col] === term.term
        );
        if (!hasThisTerm && term.difficulty === 'Khó') {
          weakTopics.push(term.term);
        }
      });
      
      return {
        name: player.player_name,
        correctCount,
        wrongCount,
        correctRate,
        score,
        isWinner: player.is_winner,
        weakTopics: weakTopics.slice(0, 3) // Lấy 3 topic yếu nhất
      };
    });

    // Top người chơi
    const topPlayers = [...playerStats]
      .sort((a, b) => b.correctCount - a.correctCount)
      .slice(0, 5);

    // Người cần hỗ trợ
    const needHelpPlayers = [...playerStats]
      .filter(p => p.correctRate < 50)
      .sort((a, b) => a.correctCount - b.correctCount)
      .slice(0, 5);

    // Phân loại khái niệm
    const hardTerms = termDifficulty.filter(t => t.correctRate < 50);
    const mediumTerms = termDifficulty.filter(t => t.correctRate >= 50 && t.correctRate < 80);
    const easyTerms = termDifficulty.filter(t => t.correctRate >= 80);

    return {
      termDifficulty,
      topPlayers,
      needHelpPlayers,
      hardTerms,
      mediumTerms,
      easyTerms
    };
  }

  function generateRecommendations(analysis: any) {
    const recommendations: string[] = [];
    
    if (analysis.hardTerms.length > 0) {
      recommendations.push(`🔴 **Cần tập trung ôn tập:** ${analysis.hardTerms.length} khái niệm khó chiếm ${Math.round((analysis.hardTerms.length / analysis.termDifficulty.length) * 100)}% tổng số câu hỏi.`);
    }
    
    if (analysis.needHelpPlayers.length > 0) {
      recommendations.push(`👥 **${analysis.needHelpPlayers.length} học sinh cần hỗ trợ thêm** với tỷ lệ đúng < 50%.`);
    }
    
    if (analysis.easyTerms.length > analysis.termDifficulty.length * 0.7) {
      recommendations.push(`✅ **Tốt!** ${Math.round((analysis.easyTerms.length / analysis.termDifficulty.length) * 100)}% khái niệm được hiểu tốt (> 80% đúng).`);
    } else {
      recommendations.push(`⚠️ **Cần cải thiện:** Chỉ ${Math.round((analysis.easyTerms.length / analysis.termDifficulty.length) * 100)}% khái niệm được hiểu tốt.`);
    }
    
    recommendations.push(`💡 **Đề xuất:** Tổ chức buổi ôn tập tập trung vào ${analysis.hardTerms.slice(0, 5).map((t: any) => t.term).join(', ')}.`);
    
    return recommendations.join('\n\n');
  }

  function copyRoomCode() {
    if (room) {
      navigator.clipboard.writeText(room.room_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-white/50">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-full mb-4 shadow-lg">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600 mb-3">
              MC DASHBOARD
            </h1>
            <p className="text-lg text-gray-600 font-semibold">Người Dẫn Chương Trình</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                🎤 Tên người dẫn (MC)
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="Nhập tên của bạn"
                className="w-full px-5 py-4 border-3 border-gray-300 rounded-xl focus:ring-4 focus:ring-pink-500 focus:border-pink-500 transition-all text-lg font-medium shadow-sm"
                onKeyPress={(e) => e.key === 'Enter' && createRoom()}
              />
            </div>

            <button
              onClick={createRoom}
              disabled={!hostName.trim()}
              className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-red-700 hover:to-pink-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-xl"
            >
              🚀 Tạo Phòng Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-pink-900 to-purple-900 p-4">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="relative max-w-7xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-6 border-4 border-white/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600">MC Dashboard</h1>
              <p className="text-gray-600 font-semibold text-lg">🎤 Người dẫn: <span className="font-black text-red-600">{room.host_name}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={loadPlayers}
                className="p-3 hover:bg-gray-100 rounded-xl transition-colors shadow-md"
                title="Refresh danh sách người chơi"
              >
                <RefreshCw className="w-6 h-6 text-gray-600" />
              </button>
              <div className="text-right bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-2xl border-3 border-red-200 shadow-lg">
                <div className="text-sm text-gray-600 mb-1 font-bold">🔑 Mã phòng</div>
                <div className="flex items-center gap-3">
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-pink-600 tracking-wider">
                    {room.room_code}
                  </div>
                  <button
                    onClick={copyRoomCode}
                    className="p-3 hover:bg-white rounded-xl transition-colors shadow-md"
                    title="Sao chép mã phòng"
                  >
                    {copied ? (
                      <CheckCircle className="w-7 h-7 text-green-600" />
                    ) : (
                      <Copy className="w-7 h-7 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {room.status === 'waiting' && (
            <button
              onClick={startGame}
              disabled={players.length === 0}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 rounded-2xl font-black text-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl border-4 border-white"
            >
              <PlayCircle className="w-8 h-8" />
              🎮 Bắt Đầu Game
            </button>
          )}

          {room.status === 'playing' && (
            <div className="space-y-5">
              <button
                onClick={drawQuestion}
                disabled={room.current_question !== null && !room.answer_revealed}
                className="w-full bg-gradient-to-r from-red-600 to-pink-600 text-white py-5 rounded-2xl font-black text-xl hover:from-red-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-xl border-4 border-white"
              >
                <RefreshCw className="w-8 h-8" />
                🎲 Bốc Câu Hỏi Mới
              </button>

              {room.current_question && (
                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-black text-yellow-800 uppercase tracking-wide">
                      🎯 Câu Hỏi Hiện Tại:
                    </div>
                    {timerActive && (
                      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl font-black text-2xl shadow-lg ${
                        timeLeft <= 10 ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse scale-110' : 'bg-white text-gray-900 border-3 border-gray-300'
                      }`}>
                        <Clock className="w-7 h-7" />
                        {timeLeft}s
                      </div>
                    )}
                  </div>
                  <div className="text-3xl font-black text-gray-900 mb-5 leading-tight">
                    {room.current_question}
                  </div>
                  
                  {/* Chỉ hiện đáp án khi đã công bố */}
                  {room.answer_revealed && (
                    <div className="text-lg text-gray-700 mb-5 bg-white/70 p-4 rounded-xl">
                      Đáp án: <span className="font-black text-red-600 text-2xl">{room.current_term}</span>
                    </div>
                  )}
                  
                  {!room.answer_revealed ? (
                    <button
                      onClick={revealAnswer}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-black text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg border-3 border-white"
                    >
                      ✅ Công Bố Đáp Án
                    </button>
                  ) : (
                    <div className="bg-green-500 border-3 border-green-600 rounded-xl p-4 text-center shadow-lg">
                      <span className="text-white font-black text-lg">
                        ✅ Đã công bố đáp án cho người chơi
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {room.status === 'finished' && (
            <div className="bg-green-50 border-4 border-green-400 rounded-xl p-6 text-center mb-6">
              <Trophy className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <div className="text-2xl font-bold text-gray-900 mb-2">
                🎉 Game Đã Kết Thúc! 🎉
              </div>
              <div className="text-lg text-gray-700 mb-4">
                {room.winners_count || 0} người thắng cuộc
              </div>
              <button
                onClick={generateAIReport}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center gap-2 mx-auto"
              >
                <BarChart3 className="w-6 h-6" />
                📊 Xem Báo Cáo AI
              </button>
            </div>
          )}

          {/* AI Report Modal - New Design with Charts */}
          {showAIReport && aiReportData && (
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <div 
                className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col relative"
                style={{
                  transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
                  cursor: isDragging ? 'grabbing' : 'default'
                }}
              >
                {/* Header - Draggable */}
                <div 
                  className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 rounded-t-3xl flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  title="Kéo để di chuyển"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <Brain className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white flex items-center gap-2">
                          Báo Cáo AI - Phân Tích Học Tập
                          <span className="text-xs text-white/60 font-normal">✋ Kéo để di chuyển</span>
                        </h2>
                        <p className="text-white/80 text-xs mt-1">Phòng: {aiReportData.roomInfo.code} | {aiReportData.roomInfo.timestamp}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAIReport(false)}
                      className="text-white hover:bg-white/30 rounded-xl px-4 py-2 font-bold transition-all text-xl"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto flex-1 modal-content">
                  {/* Stats Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-6 h-6 text-blue-500" />
                        <h3 className="text-sm font-bold text-gray-700">Người Chơi</h3>
                      </div>
                      <p className="text-3xl font-black text-blue-600">{aiReportData.roomInfo.playerCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="w-6 h-6 text-green-500" />
                        <h3 className="text-sm font-bold text-gray-700">Câu Hỏi</h3>
                      </div>
                      <p className="text-3xl font-black text-green-600">{aiReportData.roomInfo.questionCount}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-6 h-6 text-purple-500" />
                        <h3 className="text-sm font-bold text-gray-700">Điểm TB</h3>
                      </div>
                      <p className="text-3xl font-black text-purple-600">
                        {Math.round(aiReportData.analysis.topPlayers.reduce((sum: number, p: any) => sum + p.correctRate, 0) / aiReportData.analysis.topPlayers.length)}%
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Phân Tích Khái Niệm với Biểu Đồ */}
                  <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="w-6 h-6 text-indigo-600" />
                      <h3 className="text-xl font-black text-gray-800">📊 Phân Tích Độ Khó Khái Niệm</h3>
                    </div>
                    
                    {/* Pie Chart - Phân bổ độ khó */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                      <div>
                        <h4 className="text-base font-bold text-gray-700 mb-3 text-center">Phân Bổ Độ Khó</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: '🟢 Dễ', value: aiReportData.analysis.easyTerms.length, color: '#10b981' },
                                { name: '🟡 Trung Bình', value: aiReportData.analysis.mediumTerms.length, color: '#f59e0b' },
                                { name: '🔴 Khó', value: aiReportData.analysis.hardTerms.length, color: '#ef4444' }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                { name: '🟢 Dễ', value: aiReportData.analysis.easyTerms.length, color: '#10b981' },
                                { name: '🟡 Trung Bình', value: aiReportData.analysis.mediumTerms.length, color: '#f59e0b' },
                                { name: '🔴 Khó', value: aiReportData.analysis.hardTerms.length, color: '#ef4444' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar Chart - Top 10 khái niệm khó nhất */}
                      <div>
                        <h4 className="text-base font-bold text-gray-700 mb-3 text-center">Top 10 Khó Nhất</h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={aiReportData.analysis.termDifficulty.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="term" angle={-45} textAnchor="end" height={80} style={{ fontSize: '9px' }} />
                            <YAxis style={{ fontSize: '10px' }} />
                            <Tooltip />
                            <Bar dataKey="correctRate" fill="#8b5cf6" name="% đúng" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Danh sách chi tiết */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <h4 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                          🔴 Khái Niệm Khó ({aiReportData.analysis.hardTerms.length})
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {aiReportData.analysis.hardTerms.map((t: any, i: number) => (
                            <div key={i} className="bg-white p-2 rounded text-sm">
                              <div className="font-semibold text-gray-800">{t.term}</div>
                              <div className="text-red-600">{t.correctRate}% đúng</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                        <h4 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                          🟡 Khái Niệm Trung Bình ({aiReportData.analysis.mediumTerms.length})
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {aiReportData.analysis.mediumTerms.map((t: any, i: number) => (
                            <div key={i} className="bg-white p-2 rounded text-sm">
                              <div className="font-semibold text-gray-800">{t.term}</div>
                              <div className="text-orange-600">{t.correctRate}% đúng</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                        <h4 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                          🟢 Khái Niệm Dễ ({aiReportData.analysis.easyTerms.length})
                        </h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {aiReportData.analysis.easyTerms.map((t: any, i: number) => (
                            <div key={i} className="bg-white p-2 rounded text-sm">
                              <div className="font-semibold text-gray-800">{t.term}</div>
                              <div className="text-green-600">{t.correctRate}% đúng</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Top Người Chơi với Biểu Đồ */}
                  <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Award className="w-6 h-6 text-yellow-600" />
                      <h3 className="text-xl font-black text-gray-800">🏆 Bảng Xếp Hạng</h3>
                    </div>
                    
                    <div className="mb-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={aiReportData.analysis.topPlayers}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" style={{ fontSize: '10px' }} />
                          <YAxis style={{ fontSize: '10px' }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="correctCount" fill="#10b981" name="Đúng" />
                          <Bar dataKey="wrongCount" fill="#ef4444" name="Sai" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {aiReportData.analysis.topPlayers.map((player: any, index: number) => (
                        <div key={index} className={`rounded-lg p-3 ${player.isWinner ? 'bg-gradient-to-br from-yellow-100 to-orange-100 border-3 border-yellow-400' : 'bg-gray-50 border border-gray-200'}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`text-2xl font-black ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-gray-500'}`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-gray-900">{player.name}</div>
                              {player.isWinner && <div className="text-xs text-yellow-700 font-semibold">🏆 Thắng</div>}
                            </div>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Đúng:</span>
                              <span className="font-bold text-green-600">{player.correctCount}/{aiReportData.roomInfo.questionCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sai:</span>
                              <span className="font-bold text-red-600">{player.wrongCount}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Độ chính xác:</span>
                              <span className="font-bold text-purple-600">{player.correctRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Điểm:</span>
                              <span className="font-bold text-blue-600">{player.score}/100</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Người Chơi Cần Hỗ Trợ */}
                  {aiReportData.analysis.needHelpPlayers.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-6 h-6 text-orange-600" />
                        <h3 className="text-xl font-black text-gray-800">⚠️ Cần Hỗ Trợ</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {aiReportData.analysis.needHelpPlayers.map((player: any, index: number) => (
                          <div key={index} className="bg-orange-50 border border-orange-300 rounded-lg p-3">
                            <div className="font-bold text-sm text-gray-900 mb-2">{player.name}</div>
                            <div className="space-y-1 text-xs mb-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Đúng:</span>
                                <span className="font-bold text-green-600">{player.correctCount}/{aiReportData.roomInfo.questionCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Độ chính xác:</span>
                                <span className="font-bold text-orange-600">{player.correctRate}%</span>
                              </div>
                            </div>
                            {player.weakTopics.length > 0 && (
                              <div className="bg-white p-2 rounded">
                                <div className="text-xs font-semibold text-gray-600 mb-1">💡 Ôn lại:</div>
                                <div className="text-xs text-gray-800">{player.weakTopics.join(', ')}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Khuyến Nghị */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-lg p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="w-6 h-6 text-indigo-600" />
                      <h3 className="text-xl font-black text-gray-800">💡 Khuyến Nghị AI</h3>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">
                      {aiReportData.recommendations}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="bg-gray-100 p-4 rounded-b-3xl flex gap-3 justify-center flex-shrink-0 border-t-2 border-gray-200">
                  <button
                    onClick={() => {
                      const textReport = `
📊 BÁO CÁO AI - PHÂN TÍCH HỌC TẬP

Phòng: ${aiReportData.roomInfo.code}
Người chơi: ${aiReportData.roomInfo.playerCount}
Câu hỏi: ${aiReportData.roomInfo.questionCount}
Thời gian: ${aiReportData.roomInfo.timestamp}

🎯 PHÂN TÍCH KHÁI NIỆM:
- Khó (🔴): ${aiReportData.analysis.hardTerms.length}
- Trung bình (🟡): ${aiReportData.analysis.mediumTerms.length}
- Dễ (🟢): ${aiReportData.analysis.easyTerms.length}

🏆 TOP NGƯỜI CHƠI:
${aiReportData.analysis.topPlayers.map((p: any, i: number) => `${i+1}. ${p.name} - ${p.correctRate}% (${p.correctCount}/${aiReportData.roomInfo.questionCount})`).join('\n')}

💡 KHUYẾN NGHỊ:
${aiReportData.recommendations}
                      `.trim();
                      navigator.clipboard.writeText(textReport);
                      alert('✅ Đã copy báo cáo vào clipboard!');
                    }}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg flex items-center gap-2"
                  >
                    🖨️ In
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Danh sách yêu cầu BINGO */}
        {room.status === 'playing' && players.some(p => p.bingo_requested && !p.is_winner) && (
          <div className="bg-orange-50 border-4 border-orange-400 rounded-2xl shadow-2xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                🔔 Yêu Cầu BINGO ({players.filter(p => p.bingo_requested && !p.is_winner).length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players
                .filter(p => p.bingo_requested && !p.is_winner)
                .map((player) => (
                  <div
                    key={player.id}
                    className="bg-white border-2 border-orange-400 rounded-lg p-4 animate-pulse"
                  >
                    <div className="font-bold text-xl text-gray-900 mb-3">
                      🎯 {player.player_name}
                    </div>
                    <div className="text-sm text-gray-600 mb-3">
                      Đã chọn: {player.selected_cells.length}/25 ô
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmWinner(player.id)}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-all"
                      >
                        ✅ Xác Nhận
                      </button>
                      <button
                        onClick={() => rejectBingo(player.id)}
                        className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-all"
                      >
                        ❌ Từ Chối
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-red-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Người Chơi ({players.length})
              </h2>
            </div>
          </div>

          {players.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Chưa có người chơi nào tham gia</p>
              <p className="text-sm mt-2">Chia sẻ mã phòng để mời người chơi</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    player.is_winner
                      ? 'border-green-500 bg-green-50'
                      : player.bingo_requested
                      ? 'border-orange-500 bg-orange-50 animate-pulse'
                      : 'border-gray-200 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-lg text-gray-900">
                      {player.player_name}
                      {player.bingo_requested && !player.is_winner && (
                        <span className="ml-2 text-orange-600">🔔</span>
                      )}
                    </div>
                    {player.is_winner && (
                      <Trophy className="w-6 h-6 text-green-600" />
                    )}
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    {(() => {
                      // Tính số ô đúng: những ô nằm trong locked_terms VÀ đã chọn
                      const correctCount = player.selected_cells.filter(([row, col]) => {
                        const term = player.board[row]?.[col];
                        return term && room.locked_terms?.includes(term);
                      }).length;
                      
                      // Tính số câu sai: Tổng câu đã hỏi - Số câu đúng
                      const totalQuestions = room.locked_terms?.length || 0;
                      const wrongCount = Math.max(0, totalQuestions - correctCount);
                      
                      // Số ô đã chọn
                      const selectedCount = player.selected_cells.length;
                      
                      return (
                        <>
                          Đúng: <span className="text-green-600 font-semibold">{correctCount}</span>
                          {' | '}
                          Sai: <span className="text-red-600 font-semibold">{wrongCount}</span>
                          {' | '}
                          Đã chọn: <span className="text-blue-600 font-semibold">{selectedCount}</span>
                        </>
                      );
                    })()}
                  </div>

                  {player.is_winner && (
                    <div className="bg-green-100 border border-green-500 rounded p-2 text-center text-sm font-semibold text-green-700">
                      🏆 Người Thắng Cuộc
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
