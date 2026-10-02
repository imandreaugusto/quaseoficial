import assert from 'node:assert/strict';
import test from 'node:test';
import { IdiomTetrisEngine } from '../src/games/IdiomTetrisEngine';

test('starts with a 10 by 20 board and one four-cell piece', () => {
  const engine = new IdiomTetrisEngine();
  const snapshot = engine.snapshot();

  assert.equal(snapshot.cells.length, 20);
  assert.ok(snapshot.cells.every((row) => row.length === 10));
  assert.equal(snapshot.cells.flat().filter((cell) => cell !== 0).length, 4);
  assert.equal(snapshot.gameOver, false);
  assert.equal(snapshot.linesCleared, 0);
});

test('wall movement and rotation keep the active piece inside the board', () => {
  const engine = new IdiomTetrisEngine();
  let snapshot = engine.snapshot();

  for (let moveIndex = 0; moveIndex < 30; moveIndex += 1) {
    snapshot = engine.moveHorizontally(-1);
  }
  snapshot = engine.rotatePiece();

  assert.equal(snapshot.cells.length, 20);
  assert.ok(snapshot.cells.every((row) => row.length === 10));
  assert.equal(snapshot.cells.flat().filter((cell) => cell !== 0).length, 4);
});

test('hard drop locks a piece and spawns the next piece', () => {
  const engine = new IdiomTetrisEngine();
  const snapshot = engine.hardDrop();

  assert.equal(snapshot.cells.flat().filter((cell) => cell !== 0).length, 8);
  assert.equal(snapshot.gameOver, false);
});

test('repeated drops never produce malformed board dimensions or cell values', () => {
  const engine = new IdiomTetrisEngine();
  let snapshot = engine.snapshot();

  for (let dropIndex = 0; dropIndex < 100 && !snapshot.gameOver; dropIndex += 1) {
    snapshot = engine.hardDrop();
    assert.equal(snapshot.cells.length, 20);
    assert.ok(snapshot.cells.every((row) => row.length === 10));
    assert.ok(snapshot.cells.flat().every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 7));
  }
});