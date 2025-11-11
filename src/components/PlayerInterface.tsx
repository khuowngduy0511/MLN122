import { useState, useEffect } from 'react';
import { supabase, Room, Player } from '../lib/supabase';
import { generateBingoBoard, checkBingo } from '../utils/gameLogic';
import { Trophy, Sparkles, Volume2, Clock, AlertCircle } from 'lucide-react';

export default function PlayerInterface() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [board, setBoard] = useState<string[][]>([]);
  const [selectedCells, setSelectedCells] = useState<number[][]>([]);
  const [wrongCells, setWrongCells] = useState<number[][]>([]); // Ô sai tạm thời
  const [canCallBingo, setCanCallBingo] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [lockedTerms, setLockedTerms] = useState<string[]>([]); // Các term bị khóa
  const [canSelect, setCanSelect] = useState(true); // Cho phép chọn trong 30s
  const [totalPlayers, setTotalPlayers] = useState(0); // Tổng số người chơi

  useEffect(() => {
    if (!room) return;

    const roomChannel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`
      }, (payload) => {
        const updatedRoom = payload.new as Room;
        const prevRoom = room;
        
        console.log('🔄 Room Update:', {
          prevStatus: prevRoom.status,
          newStatus: updatedRoom.status,
          updatedRoom
        });
        
        setRoom(updatedRoom);
        setLockedTerms(updatedRoom.locked_terms || []);

        // Khi có câu hỏi mới - reset wrongCells
        if (updatedRoom.current_question !== prevRoom.current_question && updatedRoom.current_question) {
          playSound();
          setWrongCells([]); // Reset ô sai khi có câu mới
          setCanSelect(true); // Cho phép chọn lại
          
          // XÓA wrong_cells trong database để UI người chơi không bị đỏ
          if (player) {
            supabase
              .from('players')
              .update({ wrong_cells: [] })
              .eq('id', player.id)
              .then();
          }
          
          // Tính thời gian còn lại (30 giây)
          const startTime = new Date(updatedRoom.question_start_time!).getTime();
          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, 30 - elapsed);
          setTimeLeft(remaining);
          
          // Nếu hết 30s thì khóa
          if (remaining === 0) {
            setCanSelect(false);
          }
        }

        // Khi MC công bố đáp án
        if (updatedRoom.answer_revealed && updatedRoom.current_term && !prevRoom.answer_revealed) {
          checkAnswers(updatedRoom.current_term);
        }
        
        // Load số người chơi khi có thay đổi
        if (updatedRoom.id) {
          loadTotalPlayers(updatedRoom.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [room, board, selectedCells]);

  // Timer countdown
  useEffect(() => {
    if (!room || !room.question_start_time || room.answer_revealed) return;

    const timer = setInterval(() => {
      const startTime = new Date(room.question_start_time!).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, 30 - elapsed);
      setTimeLeft(remaining);
      
      // Hết 30 giây thì khóa không cho chọn
      if (remaining === 0) {
        setCanSelect(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [room]);

  // Polling room status để check finished
  useEffect(() => {
    if (!room) return;

    const pollInterval = setInterval(async () => {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('status')
        .eq('id', room.id)
        .single();
      
      if (roomData && roomData.status === 'finished' && room.status !== 'finished') {
        console.log('🔄 Detected finished status via polling');
        reloadRoom();
      }
    }, 2000); // Check mỗi 2 giây

    return () => clearInterval(pollInterval);
  }, [room]);

  useEffect(() => {
    if (!player) return;

    const playerChannel = supabase
      .channel(`player:${player.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'players',
        filter: `id=eq.${player.id}`
      }, (payload) => {
        const updatedPlayer = payload.new as Player;
        
        console.log('👤 Player Update:', {
          prevWinner: player?.is_winner,
          newWinner: updatedPlayer.is_winner,
          updatedPlayer
        });
        
        setPlayer(updatedPlayer);
        setSelectedCells(updatedPlayer.selected_cells || []);
        setWrongCells(updatedPlayer.wrong_cells || []);

        if (updatedPlayer.is_winner) {
          playWinSound();
          // Force reload room để check status
          reloadRoom();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(playerChannel);
    };
  }, [player]);

  // Kiểm tra BINGO dựa trên các ô locked (đúng)
  useEffect(() => {
    if (!board || !lockedTerms.length) return;

    const lockedCells: number[][] = [];
    board.forEach((row, rowIndex) => {
      row.forEach((term, colIndex) => {
        if (lockedTerms.includes(term) && selectedCells.some(([r, c]) => r === rowIndex && c === colIndex)) {
          lockedCells.push([rowIndex, colIndex]);
        }
      });
    });

    const hasBingo = checkBingo(lockedCells);
    setCanCallBingo(hasBingo);
  }, [board, lockedTerms, selectedCells]);

  function playSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVKXl7bBiGgU+leD1x3ElBSp+zPLaizsIGGS57OihUhELTKPi8bllHAY2kNbzwm4gBS6Cz/HgjzkHF2q+7+OZRA0QU6Th7b1oHwU8kdr0xHMnBiuBzfPaiD0HF2q+7+CXRAwRVKTk7blmHAU6ktnyxnMmBSuAzPDbjDsHGGS87+OZRA0PVKXl7b1oHQU8kNryyHQlBCqAzfPbiD0HF2u+7+OZRA0QU6Th7b1oHgU8kdvzxnQlBSuBzfPaiD0HGGe+7+OZRA0PVKXl7b1oHQU8kdvyxnQlBSuBzfPbiD0HF2u+7+OZRA0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0QVKXl7b1oHQU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZRA0PVKXl7b1oHgU7kdvzxnQlBSuBzfPaiD0HF2u+7+OZRA0PVKXl7b1oHgU7kdvzxnMlBSuBzfPaiD0HF2u+7+OZRA0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHg==');
    audio.play().catch(() => {});
  }

  function playWinSound() {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVKXl7bBiGgU+leD1x3ElBSp+zPLaizsIGGS57OihUhELTKPi8bllHAY2kNbzwm4gBS6Cz/HgjzkHF2q+7+OZRA0QU6Th7b1oHwU8kdr0xHMnBiuBzfPaiD0HF2q+7+CXRAwRVKTk7blmHAU6ktnyxnMmBSuAzPDbjDsHGGS87+OZRA0PVKXl7b1oHQU8kNryyHQlBCqAzfPbiD0HF2u+7+OZRA0QU6Th7b1oHgU8kdvzxnQlBSuBzfPaiD0HGGe+7+OZRA0PVKXl7b1oHQU8kdvyxnQlBSuBzfPbiD0HF2u+7+OZRA0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0QVKXl7b1oHQU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZRA0PVKXl7b1oHgU7kdvzxnQlBSuBzfPaiD0HF2u+7+OZRA0PVKXl7b1oHgU7kdvzxnMlBSuBzfPaiD0HF2u+7+OZRA0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1oHgU8kdvzxnMlBSuBzfPaiD0HF2u+7+OZQw0PVKXl7b1-oHg==');
    audio.play().catch(() => {});
  }

  async function loadTotalPlayers(roomId: string) {
    const { count } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId);
    
    if (count !== null) {
      setTotalPlayers(count);
    }
  }

  async function reloadRoom() {
    if (!room) return;
    
    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room.id)
      .single();
    
    if (roomData) {
      console.log('🔄 Force Reload Room:', roomData);
      setRoom(roomData);
    }
  }

  function checkAnswers(correctTerm: string) {
    if (!player || !board) return;

    const newWrongCells: number[][] = [];
    const newSelectedCells: number[][] = [];

    // Phân loại: chỉ kiểm tra các ô CHƯA bị locked
    selectedCells.forEach(([row, col]) => {
      const term = board[row][col];
      
      // BỎ QUA các ô đã locked từ trước (đáp án đúng của câu cũ)
      if (lockedTerms.includes(term)) {
        newSelectedCells.push([row, col]); // Giữ lại ô cũ
        return;
      }
      
      // Chỉ kiểm tra các ô MỚI (chưa locked)
      if (term !== correctTerm) {
        // Ô sai - hiển thị đỏ tạm thời, nhưng XÓA khỏi selectedCells
        newWrongCells.push([row, col]);
      } else {
        // Ô đúng - giữ lại trong selectedCells
        newSelectedCells.push([row, col]);
      }
    });

    console.log('🔍 Check Answers:', {
      correctTerm,
      lockedTerms,
      selectedCells,
      newSelectedCells,
      newWrongCells
    });

    setWrongCells(newWrongCells);
    setSelectedCells(newSelectedCells);

    // Cập nhật vào database
    supabase
      .from('players')
      .update({
        wrong_cells: newWrongCells,
        selected_cells: newSelectedCells
      })
      .eq('id', player.id)
      .then();
  }

  async function joinRoom() {
    if (!playerName.trim() || !roomCode.trim()) return;

    const { data: roomData } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .maybeSingle();

    if (!roomData) {
      alert('Không tìm thấy phòng với mã này!');
      return;
    }

    const { data: allTerms } = await supabase
      .from('game_terms')
      .select('term');

    if (!allTerms || allTerms.length < 25) {
      alert('Không đủ thuật ngữ để tạo bảng!');
      return;
    }

    const terms = allTerms.map(t => t.term);
    const bingoBoard = generateBingoBoard(terms);

    const { data: playerData, error } = await supabase
      .from('players')
      .insert({
        room_id: roomData.id,
        player_name: playerName,
        board: bingoBoard,
        selected_cells: [],
        correct_cells: [],
        wrong_cells: [],
        bingo_requested: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error joining room:', error);
      alert('Không thể tham gia phòng!');
      return;
    }

    setRoom(roomData);
    setPlayer(playerData);
    setBoard(bingoBoard);
    setLockedTerms(roomData.locked_terms || []);
  }

  async function toggleCell(row: number, col: number) {
    if (!player || !room || room.status !== 'playing') return;
    
    // Kiểm tra nếu hết 30 giây - không cho chọn nữa
    if (!canSelect || room.answer_revealed) return;
    
    const term = board[row][col];
    
    // Kiểm tra nếu ô này đã bị khóa (đáp án đúng)
    if (lockedTerms.includes(term)) return;

    // Kiểm tra nếu ô này đang sai tạm thời
    const isWrong = wrongCells.some(([r, c]) => r === row && c === col);
    if (isWrong) return;

    const cellIndex = selectedCells.findIndex(([r, c]) => r === row && c === col);
    let newSelectedCells: number[][];

    if (cellIndex >= 0) {
      // Cho phép bỏ chọn ô đã chọn
      newSelectedCells = selectedCells.filter((_, i) => i !== cellIndex);
    } else {
      // GIỚI HẠN: Chỉ cho phép chọn 1 ô mỗi câu hỏi
      // Nếu đã có ô được chọn (chưa locked), thay thế bằng ô mới
      const unlockedSelected = selectedCells.filter(([r, c]) => {
        const cellTerm = board[r][c];
        return !lockedTerms.includes(cellTerm);
      });
      
      if (unlockedSelected.length > 0) {
        // Đã có ô được chọn -> thay thế
        newSelectedCells = [
          ...selectedCells.filter(([r, c]) => lockedTerms.includes(board[r][c])), // Giữ các ô locked
          [row, col] // Ô mới
        ];
      } else {
        // Chưa có ô nào -> thêm ô mới
        newSelectedCells = [...selectedCells, [row, col]];
      }
    }

    await supabase
      .from('players')
      .update({ selected_cells: newSelectedCells })
      .eq('id', player.id);

    setSelectedCells(newSelectedCells);
  }

  async function callBingo() {
    if (!player || !canCallBingo) return;

    await supabase
      .from('players')
      .update({ bingo_requested: true })
      .eq('id', player.id);

    playWinSound();
    alert('🎉 Đã gửi yêu cầu BINGO đến MC! Đang chờ xác nhận...');
  }

  function getCellStyle(row: number, col: number) {
    const term = board[row][col];
    const isLocked = lockedTerms.includes(term);
    const isSelected = selectedCells.some(([r, c]) => r === row && c === col);
    const isWrong = wrongCells.some(([r, c]) => r === row && c === col);

    // Debug log cho ô locked
    if (isLocked) {
      console.log(`🎯 Cell [${row},${col}] "${term}":`, {
        isLocked,
        isSelected,
        isWrong,
        selectedCells,
        lockedTerms
      });
    }

    // Ô sai tạm thời (chỉ trong lúc chờ câu mới)
    if (isWrong) {
      return 'bg-red-500 text-white font-bold opacity-90 cursor-not-allowed';
    }

    // Ô đã bị khóa (đáp án đúng) VÀ người chơi đã chọn - LUÔN XANH LÁ
    if (isLocked && isSelected) {
      return 'bg-green-500 text-white font-bold shadow-lg transform scale-105 cursor-not-allowed';
    }

    // Ô đã bị khóa (đáp án đúng) NHƯNG người chơi CHƯA chọn - GẠCH NGANG
    if (isLocked && !isSelected) {
      return 'bg-gray-200 text-gray-600 font-semibold cursor-not-allowed line-through opacity-60';
    }

    // Hết 30 giây - không cho chọn, nhưng vẫn hiển thị màu đã chọn
    if (!canSelect || room?.answer_revealed) {
      if (isSelected) {
        return 'bg-blue-400 text-white font-bold shadow-md cursor-not-allowed';
      }
      return 'bg-gray-100 text-gray-900 font-semibold cursor-not-allowed opacity-70';
    }

    // Ô đã chọn nhưng chưa biết đúng/sai (còn trong 30s)
    if (isSelected) {
      return 'bg-blue-400 text-white font-bold shadow-md hover:bg-blue-500';
    }

    // Ô bình thường (còn trong 30s)
    return 'bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 hover:shadow-md transition-all';
  }

  function getCorrectCount() {
    let count = 0;
    board.forEach((row, rowIndex) => {
      row.forEach((term, colIndex) => {
        if (lockedTerms.includes(term) && selectedCells.some(([r, c]) => r === rowIndex && c === colIndex)) {
          count++;
        }
      });
    });
    return count;
  }

  if (!player || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-white/50">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-3">
              BINGO GAME
            </h1>
            <p className="text-lg text-gray-600 font-semibold">Kinh Tế Chính Trị</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                📝 Tên của bạn
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nhập tên của bạn"
                className="w-full px-5 py-4 border-3 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-purple-500 transition-all text-lg font-medium shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-2">
                🔑 Mã phòng
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Nhập mã 6 ký tự"
                maxLength={6}
                className="w-full px-5 py-4 border-3 border-gray-300 rounded-xl focus:ring-4 focus:ring-purple-500 focus:border-purple-500 transition-all uppercase tracking-widest text-center text-3xl font-black shadow-sm"
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
            </div>

            <button
              onClick={joinRoom}
              disabled={!playerName.trim() || !roomCode.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 shadow-xl"
            >
              🚀 Tham Gia Phòng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="absolute inset-0 bg-black opacity-20"></div>
      <div className="relative max-w-5xl mx-auto">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 mb-6 border-4 border-white/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">{player.player_name}</h2>
              <p className="text-gray-600 font-semibold text-lg">🎮 Phòng: <span className="font-black text-purple-600">{room.room_code}</span></p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 font-semibold">Trạng thái</div>
              <div className={`text-xl font-black px-4 py-2 rounded-xl ${
                room.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                room.status === 'playing' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {room.status === 'waiting' ? '⏳ Chờ bắt đầu' :
                 room.status === 'playing' ? '🎮 Đang chơi' : '🏁 Kết thúc'}
              </div>
            </div>
          </div>

          {room.status === 'finished' && (
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 border-4 border-purple-300 rounded-2xl p-8 text-center mb-6 shadow-2xl">
              <Trophy className="w-24 h-24 text-yellow-300 mx-auto mb-4 drop-shadow-2xl animate-bounce" />
              <div className="text-5xl font-black text-white mb-4 drop-shadow-lg">
                🏁 TRÒ CHƠI ĐÃ KẾT THÚC! 🏁
              </div>
              {player.is_winner ? (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-4">
                  <div className="text-3xl font-black text-yellow-300 mb-2 drop-shadow-lg">
                    🎉 CHÚC MỪNG! BẠN LÀ NGƯỜI THẮNG CUỘC! 🎉
                  </div>
                  <div className="text-xl text-white font-bold">
                    Bạn đã hoàn thành BINGO trước tiên!
                  </div>
                </div>
              ) : (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-4">
                  <div className="text-2xl font-black text-white mb-2">
                    Đã có người chiến thắng!
                  </div>
                  <div className="text-lg text-white/90 font-semibold">
                    Cảm ơn bạn đã tham gia trò chơi!
                  </div>
                </div>
              )}
              <div className="text-lg text-white font-bold">
                👥 Tổng số người chơi: {totalPlayers}
              </div>
            </div>
          )}

          {player.is_winner && room.status !== 'finished' && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 border-4 border-yellow-300 rounded-2xl p-6 text-center mb-6 animate-pulse shadow-2xl">
              <Trophy className="w-20 h-20 text-white mx-auto mb-4 drop-shadow-lg" />
              <div className="text-4xl font-black text-white mb-2 drop-shadow-lg">
                🎉 CHÚC MỪNG! BẠN THẮNG! 🎉
              </div>
              <div className="text-xl text-white font-bold">
                Bạn đã hoàn thành BINGO!
              </div>
            </div>
          )}

          {player.bingo_requested && !player.is_winner && room.status !== 'finished' && (
            <div className="bg-gradient-to-r from-orange-400 to-red-500 border-4 border-orange-300 rounded-2xl p-5 text-center mb-6 shadow-xl">
              <AlertCircle className="w-14 h-14 text-white mx-auto mb-3 drop-shadow-lg" />
              <div className="text-2xl font-black text-white drop-shadow-lg">
                ⏳ Đang chờ MC xác nhận BINGO...
              </div>
            </div>
          )}

          {room.current_question && room.status === 'playing' && (
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-2xl p-6 mb-6 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-4 flex-1">
                  <Volume2 className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1 drop-shadow" />
                  <div className="flex-1">
                    <div className="text-sm font-black text-yellow-800 mb-2 uppercase tracking-wide">
                      🎯 Câu Hỏi / Gợi Ý:
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                      {room.current_question}
                    </div>
                  </div>
                </div>
                {room.question_start_time && !room.answer_revealed && (
                  <div className={`flex items-center gap-3 px-5 py-3 rounded-xl font-black text-2xl flex-shrink-0 shadow-lg ${
                    timeLeft <= 10 ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white animate-pulse scale-110' : 'bg-white text-gray-900 border-4 border-gray-300'
                  }`}>
                    <Clock className="w-7 h-7" />
                    {timeLeft}s
                  </div>
                )}
              </div>
              {!room.answer_revealed ? (
                <div className="bg-blue-500 border-3 border-blue-600 rounded-xl p-4 text-center shadow-lg">
                  <span className="text-white font-black text-lg">
                    {canSelect 
                      ? '💡 Hãy chọn đáp án trên bảng!'
                      : '⏸️ Hết giờ! Chờ MC công bố đáp án...'}
                  </span>
                </div>
              ) : (
                <div className="bg-green-500 border-3 border-green-600 rounded-xl p-5 text-center shadow-lg">
                  <div className="text-white font-black text-lg mb-2">
                    ✅ Đã công bố đáp án!
                  </div>
                  <div className="text-white font-black text-3xl">
                    {room.current_term}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border-4 border-white/50">
          <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-6 text-center">
            🎯 Bảng BINGO của bạn
          </h3>

          <div className="grid grid-cols-5 gap-3 mb-6">
            {board.map((row, rowIndex) =>
              row.map((term, colIndex) => {
                const cellStyle = getCellStyle(rowIndex, colIndex);
                const isLocked = lockedTerms.includes(term);
                const isWrong = wrongCells.some(([r, c]) => r === rowIndex && c === colIndex);
                const isDisabled = room.status !== 'playing' || isLocked || isWrong || !canSelect || room.answer_revealed;

                return (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    onClick={() => toggleCell(rowIndex, colIndex)}
                    disabled={isDisabled}
                    className={`aspect-square p-3 rounded-xl text-base font-black transition-all ${cellStyle} ${
                      !isDisabled ? 'transform hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl' : 'shadow-md'
                    }`}
                  >
                    {term}
                  </button>
                );
              })
            )}
          </div>

          {canCallBingo && room.status === 'playing' && !player.is_winner && !player.bingo_requested && (
            <button
              onClick={callBingo}
              className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-7 rounded-2xl font-black text-3xl hover:from-red-600 hover:to-pink-700 transition-all transform hover:scale-105 active:scale-95 animate-bounce shadow-2xl border-4 border-white"
            >
              🎯 MẮC BINGO! 🎯
            </button>
          )}

          <div className="mt-6 text-center text-lg font-bold text-gray-700 bg-gray-100 py-4 rounded-xl">
            {(() => {
              const correctCount = getCorrectCount();
              const totalQuestions = lockedTerms.length; // Tổng số câu đã hỏi
              const wrongCount = Math.max(0, totalQuestions - correctCount); // Số câu sai
              
              return (
                <>
                  Đúng: <span className="text-green-600 font-black text-xl">{correctCount}/{totalQuestions}</span>
                  {' | '}
                  Sai: <span className="text-red-600 font-black text-xl">{wrongCount}</span>
                  {' | '}
                  Đã chọn: <span className="text-blue-600 font-black text-xl">{selectedCells.length}</span>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
