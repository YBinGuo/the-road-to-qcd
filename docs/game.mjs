export const SIZE = 4;
export const GOAL = 2048;
export const SAVE_KEY = 'kogut-2048:v1';
const directions = ['left', 'right', 'up', 'down'];

function lines(direction) {
  return Array.from({length: SIZE}, (_, line) =>
    Array.from({length: SIZE}, (_, offset) => {
      const step = direction === 'right' || direction === 'down' ? SIZE - 1 - offset : offset;
      return direction === 'up' || direction === 'down' ? step * SIZE + line : line * SIZE + step;
    })
  );
}

export function slide(board, direction) {
  const next = [...board];
  let points = 0;
  for (const line of lines(direction)) {
    const values = line.map(index => board[index]).filter(Boolean);
    let output = 0;
    for (let input = 0; input < values.length; input++) {
      let value = values[input];
      if (value === values[input + 1]) {
        value *= 2;
        points += value;
        input++;
      }
      next[line[output++]] = value;
    }
    for (; output < SIZE; output++) next[line[output]] = 0;
  }
  return {board: next, points, changed: next.some((value, index) => value !== board[index])};
}

export function hasMoves(board) {
  return directions.some(direction => slide(board, direction).changed);
}

function spawn(board, random) {
  const empty = board.flatMap((value, index) => value === 0 ? [index] : []);
  if (empty.length) board[empty[Math.floor(random() * empty.length)]] = random() < 0.9 ? 2 : 4;
  return board;
}

export function newGame(previous, random = Math.random) {
  const board = spawn(spawn(Array(SIZE ** 2).fill(0), random), random);
  return {
    board, score: 0, best: previous?.best ?? 0,
    unlocked: Math.max(previous?.unlocked ?? 0, ...board),
    continued: false
  };
}

export function outcome(state) {
  if (Math.max(...state.board) >= GOAL && !state.continued) return 'won';
  return hasMoves(state.board) ? 'playing' : 'lost';
}

export function move(state, direction, random = Math.random) {
  if (!directions.includes(direction) || outcome(state) !== 'playing') return state;
  const result = slide(state.board, direction);
  if (!result.changed) return state;
  const board = spawn(result.board, random);
  const score = state.score + result.points;
  return {...state, board, score, best: Math.max(state.best, score), unlocked: Math.max(state.unlocked, ...board)};
}

function tile(value) {
  return Number.isSafeInteger(value) && value >= 2 && Number.isInteger(Math.log2(value));
}

export function restore(raw) {
  try {
    const state = JSON.parse(raw);
    if (!state || !Array.isArray(state.board) || state.board.length !== SIZE ** 2 ||
        !state.board.some(tile) || !state.board.every(value => value === 0 || tile(value)) ||
        !Number.isSafeInteger(state.score) || state.score < 0 ||
        !Number.isSafeInteger(state.best) || state.best < state.score ||
        !tile(state.unlocked) || typeof state.continued !== 'boolean') return null;
    return {...state, unlocked: Math.max(state.unlocked, ...state.board)};
  } catch {
    return null;
  }
}
