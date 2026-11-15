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

export function slide(board, direction, motion) {
  const next = [...board];
  let points = 0;
  for (const line of lines(direction)) {
    const occupied = line.filter(index => board[index]);
    let output = 0;
    for (let input = 0; input < occupied.length; input++) {
      const from = occupied[input];
      const to = line[output++];
      const partner = occupied[input + 1];
      let value = board[from];
      if (from !== to) motion?.paths.push({from, to});
      if (value === board[partner]) {
        if (motion) {
          motion.paths.push({from: partner, to});
          motion.merged.push(to);
        }
        value *= 2;
        points += value;
        input++;
      }
      next[to] = value;
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

export function planMove(state, direction, random = Math.random) {
  if (!directions.includes(direction) || outcome(state) !== 'playing') return null;
  const motion = {paths: [], merged: []};
  const result = slide(state.board, direction, motion);
  if (!result.changed) return null;
  const board = spawn([...result.board], random);
  const score = state.score + result.points;
  const next = {...state, board, score, best: Math.max(state.best, score), unlocked: Math.max(state.unlocked, ...board)};
  return {...motion, spawned: board.findIndex((value, index) => value !== result.board[index]), state: next};
}

export function move(state, direction, random = Math.random) {
  return planMove(state, direction, random)?.state ?? state;
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
