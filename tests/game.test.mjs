import {test} from 'node:test';
import assert from 'node:assert/strict';
import {slide, move, newGame, outcome, restore} from '../dist/game.mjs';
import {cards, stages, publishedCards} from '../dist/catalog.mjs';

const padding = row => [...row, ...Array(16 - row.length).fill(0)];
const stateFor = board => ({board, score: 0, best: 0, unlocked: Math.max(...board), continued: false});
const low = () => 0;

test('merge once per tile and add the new tile values to score', () => {
  assert.deepEqual(slide(padding([2, 2, 2, 2]), 'left'), {board: padding([4, 4, 0, 0]), points: 8, changed: true});
  assert.deepEqual(slide(padding([2, 2, 4, 0]), 'left').board, padding([4, 4, 0, 0]));
  assert.deepEqual(slide(padding([2, 2, 2, 0]), 'right').board, padding([0, 0, 2, 4]));
  assert.deepEqual(slide(padding([2, 4, 2, 0, 2, 0, 2, 0]), 'up').board, padding([4, 4, 4, 0]));
  assert.deepEqual(slide(padding([2, 0, 0, 0, 0, 0, 0, 0, 2]), 'down').board, [...Array(12).fill(0), 4, 0, 0, 0]);
});

test('invalid moves preserve state and consume no randomness', () => {
  const state = stateFor(padding([2, 0, 0, 0]));
  const forbidden = () => assert.fail('unexpected spawn');
  assert.equal(move(state, 'left', forbidden), state);
  assert.equal(move(state, 'bad direction', forbidden), state);
});

test('a game starts with two tiles and only a valid slide spawns one', () => {
  assert.equal(newGame(undefined, low).board.filter(Boolean).length, 2);
  const corners = stateFor(padding([0, 0, 0, 2]));
  const shifted = move(corners, 'left', () => 0.95);
  assert.equal(shifted.score, 0);
  assert.deepEqual(shifted.board.filter(Boolean), [2, 4]);
  assert.equal(shifted.unlocked, 4);
});

test('2048 wins, continuation works and only a blocked board loses', () => {
  const state = stateFor(padding([1024, 1024, 0, 0]));
  const won = move(state, 'left', low);
  assert.equal(won.score, 2048);
  assert.equal(won.best, 2048);
  assert.equal(won.unlocked, 2048);
  assert.equal(outcome(won), 'won');
  assert.equal(move(won, 'right', low), won);
  assert.equal(outcome({...won, continued: true}), 'playing');
  assert.equal(outcome(stateFor([2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,2])), 'lost');
  assert.equal(outcome(stateFor([2,4,2,4,4,2,4,2,2,4,2,4,4,2,4,4])), 'playing');
});

test('reload retains the current board and restart retains atlas and best score', () => {
  const state = move(stateFor(padding([64, 64, 0, 0])), 'left', low);
  assert.deepEqual(restore(JSON.stringify(state)), state);
  assert.equal(restore('{'), null);
  assert.equal(restore(JSON.stringify({...state, board: Array(16).fill(3)})), null);
  const restarted = newGame(state, low);
  assert.equal(restarted.score, 0);
  assert.equal(restarted.best, 128);
  assert.equal(restarted.unlocked, 128);
  assert.notDeepEqual(restarted.board, state.board);
});

test('the initial public release contains no cards at any stage', () => {
  assert.deepEqual(stages.map(stage => stage.value), Array.from({length: 11}, (_, i) => 2 ** (i + 1)));
  assert.deepEqual(cards, []);
  for (const {value} of stages) assert.deepEqual(publishedCards(value), []);
});

test('only published cards appear for an existing unlocked stage', () => {
  const restored = restore(JSON.stringify(stateFor(padding([128]))));
  const example = {id: 'test-only', stage: 128, order: 10, status: 'draft'};
  cards.push(example);
  try {
    assert.deepEqual(publishedCards(restored.unlocked), []);
    example.status = 'published';
    assert.deepEqual(publishedCards(restored.unlocked), [example]);
    assert.deepEqual(publishedCards(4), []);
  } finally {
    cards.pop();
  }
});
