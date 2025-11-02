export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateBingoBoard(allTerms: string[]): string[][] {
  const shuffled = [...allTerms].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 25);

  const board: string[][] = [];
  for (let i = 0; i < 5; i++) {
    board.push(selected.slice(i * 5, (i + 1) * 5));
  }

  return board;
}

export function checkBingo(selectedCells: number[][]): boolean {
  if (selectedCells.length < 5) return false;

  const cellSet = new Set(selectedCells.map(([r, c]) => `${r},${c}`));

  for (let i = 0; i < 5; i++) {
    let rowWin = true;
    let colWin = true;

    for (let j = 0; j < 5; j++) {
      if (!cellSet.has(`${i},${j}`)) rowWin = false;
      if (!cellSet.has(`${j},${i}`)) colWin = false;
    }

    if (rowWin || colWin) return true;
  }

  let diagonal1 = true;
  let diagonal2 = true;
  for (let i = 0; i < 5; i++) {
    if (!cellSet.has(`${i},${i}`)) diagonal1 = false;
    if (!cellSet.has(`${i},${4 - i}`)) diagonal2 = false;
  }

  return diagonal1 || diagonal2;
}
