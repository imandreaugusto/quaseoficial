const COLUMNS = 10;
const ROWS = 20;

const PIECES = [
  [[1, 1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]]
];

export interface IdiomTetrisSnapshot {
  cells: number[][];
  linesCleared: number;
  gameOver: boolean;
}

export class IdiomTetrisEngine {
  private board: number[][] = [];
  private piece: number[][] = [];
  private pieceId = 0;
  private x = 0;
  private y = 0;
  private linesCleared = 0;
  private gameOver = false;

  constructor() {
    this.reset();
  }

  reset(): IdiomTetrisSnapshot {
    this.board = Array.from({ length: ROWS }, () => Array(COLUMNS).fill(0));
    this.linesCleared = 0;
    this.gameOver = false;
    this.spawnPiece();
    return this.snapshot();
  }

  moveHorizontally(offset: number): IdiomTetrisSnapshot {
    if (this.canPlace(this.x + offset, this.y, this.piece)) this.x += offset;
    return this.snapshot();
  }

  rotatePiece(): IdiomTetrisSnapshot {
    const rotated = this.piece[0].map((_, column) => this.piece.map((row) => row[column]).reverse());
    const wallKicks = [0, -1, 1, -2, 2];
    const validOffset = wallKicks.find((offset) => this.canPlace(this.x + offset, this.y, rotated));
    if (validOffset !== undefined) {
      this.piece = rotated;
      this.x += validOffset;
    }
    return this.snapshot();
  }

  softDrop(): IdiomTetrisSnapshot {
    if (this.canPlace(this.x, this.y + 1, this.piece)) this.y += 1;
    else this.lockPiece();
    return this.snapshot();
  }

  hardDrop(): IdiomTetrisSnapshot {
    while (this.canPlace(this.x, this.y + 1, this.piece)) this.y += 1;
    this.lockPiece();
    return this.snapshot();
  }

  step(): IdiomTetrisSnapshot {
    if (!this.gameOver) this.softDrop();
    return this.snapshot();
  }

  snapshot(): IdiomTetrisSnapshot {
    const cells = this.board.map((row) => [...row]);
    if (!this.gameOver) {
      this.piece.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
        if (cell && this.y + rowIndex >= 0 && this.y + rowIndex < ROWS && this.x + columnIndex >= 0 && this.x + columnIndex < COLUMNS) {
          cells[this.y + rowIndex][this.x + columnIndex] = this.pieceId;
        }
      }));
    }
    return { cells, linesCleared: this.linesCleared, gameOver: this.gameOver };
  }

  private spawnPiece() {
    this.pieceId = Math.floor(Math.random() * PIECES.length) + 1;
    this.piece = PIECES[this.pieceId - 1].map((row) => [...row]);
    this.x = Math.floor((COLUMNS - this.piece[0].length) / 2);
    this.y = 0;
    if (!this.canPlace(this.x, this.y, this.piece)) this.gameOver = true;
  }

  private canPlace(x: number, y: number, piece: number[][]) {
    return piece.every((row, rowIndex) => row.every((cell, columnIndex) => {
      if (!cell) return true;
      const boardX = x + columnIndex;
      const boardY = y + rowIndex;
      return boardX >= 0 && boardX < COLUMNS && boardY < ROWS && (boardY < 0 || this.board[boardY][boardX] === 0);
    }));
  }

  private lockPiece() {
    this.piece.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
      if (!cell) return;
      const boardY = this.y + rowIndex;
      if (boardY < 0) this.gameOver = true;
      else this.board[boardY][this.x + columnIndex] = this.pieceId;
    }));
    if (this.gameOver) return;
    this.clearFullRows();
    this.spawnPiece();
  }

  private clearFullRows() {
    for (let rowIndex = ROWS - 1; rowIndex >= 0; rowIndex -= 1) {
      if (this.board[rowIndex].some((cell) => cell === 0)) continue;
      this.board.splice(rowIndex, 1);
      this.board.unshift(Array(COLUMNS).fill(0));
      this.linesCleared += 1;
      rowIndex += 1;
    }
  }
}