import {planMove, newGame, outcome, restore, SAVE_KEY} from './game.mjs';
import {stages, types, publishedCards, references} from './catalog.mjs';
import {demos} from './demos.mjs';
import {LANGUAGE_KEY, languages} from './i18n.mjs';

const byId = id => document.getElementById(id);
const stageByValue = new Map(stages.map(stage => [stage.value, stage]));
const board = byId('board');
const dialog = byId('details');
const end = byId('end');
const endAction = byId('end-action');
const stageList = byId('stages');
const keys = new Map([['ArrowLeft', 'left'], ['ArrowUp', 'up'], ['ArrowDown', 'down'], ['ArrowRight', 'right']]);
let displayedUnlock = 0;
let demoSession;
let gesture;
let activeStage;
let activeTurn;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let language = loadLanguage();
let strings = languages[language];

function loadLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'zh-CN' ? 'zh-CN' : 'en';
  } catch {
    return 'en';
  }
}

const stageTitle = stage => language === 'zh-CN' ? stage.zhTitle : stage.title;
const stageShort = stage => language === 'zh-CN' ? stage.zhShort : stage.short;

function renderLanguage() {
  document.documentElement.lang = language;
  document.title = strings.siteTitle;
  document.querySelectorAll('[data-text]').forEach(element => {
    element.textContent = strings[element.dataset.text];
  });
  document.querySelectorAll('[data-label]').forEach(element => {
    element.setAttribute('aria-label', strings[element.dataset.label]);
  });
  document.querySelectorAll('[data-language]').forEach(button => {
    button.lang = language === 'en' ? 'zh-CN' : 'en';
    button.textContent = language === 'en' ? '中文' : 'English';
  });
  renderReferences();
  renderAtlas();
  render();
  if (dialog.open && activeStage) {
    const openCards = new Set(Array.from(dialog.querySelectorAll('[data-card-id][open]'), card => card.dataset.cardId));
    const scroll = dialog.scrollTop;
    renderStageHeader(activeStage);
    if (!demoSession) renderStageCards(activeStage, openCards);
    dialog.scrollTop = scroll;
  }
}

function switchLanguage() {
  stopTurn();
  language = language === 'en' ? 'zh-CN' : 'en';
  strings = languages[language];
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The current page can still change language when storage is unavailable.
  }
  byId('announcement').textContent = '';
  renderLanguage();
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function loadGame() {
  try {
    return restore(localStorage.getItem(SAVE_KEY)) ?? newGame();
  } catch {
    return newGame();
  }
}

let state = loadGame();

function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    byId('storage-message').hidden = true;
  } catch {
    byId('storage-message').hidden = false;
  }
}

function renderAtlas() {
  displayedUnlock = state.unlocked;
  const unlocked = stages.filter(stage => stage.value <= displayedUnlock).length;
  byId('progress-label').textContent = unlocked + ' / ' + stages.length;
  const progress = byId('progress');
  progress.max = stages.length;
  progress.value = unlocked;

  stageList.replaceChildren(...stages.map(stage => {
    const entry = node('li');
    const isUnlocked = stage.value <= displayedUnlock;
    const label = node(isUnlocked ? 'button' : 'div', isUnlocked ? 'stage' : 'stage locked');
    const value = node('span', 'stage-value', String(stage.value));
    value.dataset.value = stage.value;
    const count = isUnlocked ? publishedCards(stage.value).length : 0;
    const suffix = isUnlocked ? (count ? strings.cardCount(count) : strings.unlocked) + ' ›' : strings.locked;
    label.append(value, node('strong', '', stageTitle(stage)), node('span', isUnlocked ? 'stage-state unlocked' : 'stage-state', suffix));
    if (isUnlocked) {
      label.type = 'button';
      label.dataset.stage = stage.value;
      label.addEventListener('click', () => showStage(stage));
    }
    entry.append(label);
    return entry;
  }));
}

function render() {
  byId('score').textContent = state.score;
  byId('best').textContent = state.best;
  board.replaceChildren(...state.board.map((value, index) => {
    const tile = node('div', 'tile');
    const stage = stageByValue.get(value);
    const row = Math.floor(index / 4) + 1;
    const column = index % 4 + 1;
    tile.setAttribute('role', 'img');
    tile.setAttribute('aria-label', [strings.tilePosition(row, column), value || strings.emptyTile, stage && stageTitle(stage)].filter(Boolean).join(', '));
    if (value) {
      tile.dataset.value = value;
      tile.dataset.large = value >= 1024;
      tile.append(node('strong', '', String(value)));
      if (stage) tile.append(node('small', '', stageShort(stage)));
    }
    const cell = node('div', 'cell');
    cell.append(tile);
    return cell;
  }));

  if (displayedUnlock !== state.unlocked) renderAtlas();

  const result = outcome(state);
  end.hidden = result === 'playing';
  if (!end.hidden) {
    const won = result === 'won';
    byId('end-title').textContent = won ? strings.won : strings.lost;
    byId('end-copy').textContent = won ? strings.wonCopy : strings.lostCopy;
    endAction.textContent = won ? strings.keepPlaying : strings.playAgain;
  }
}

function commit() {
  save();
  render();
}

function stopTurn() {
  const turn = activeTurn;
  activeTurn = undefined;
  turn?.animations.forEach(animation => animation.cancel());
}

async function shift(direction) {
  if (dialog.open || activeTurn) return;
  const plan = planMove(state, direction);
  if (!plan) return;
  const newlyUnlocked = stages.filter(stage => stage.value > state.unlocked && stage.value <= plan.state.unlocked);
  state = plan.state;
  save();

  if (!reduceMotion.matches && typeof board.animate === 'function') {
    const cells = [...board.children];
    const positions = cells.map(cell => cell.getBoundingClientRect());
    const animations = plan.paths.map(({from, to}) => {
      const x = positions[to].left - positions[from].left;
      const y = positions[to].top - positions[from].top;
      const tile = cells[from].firstElementChild;
      tile.classList.add('moving');
      return tile.animate(
        [{transform: 'translate(0, 0)'}, {transform: 'translate(' + x + 'px, ' + y + 'px)'}],
        {duration: 190, easing: 'cubic-bezier(.2, .65, .3, 1)', fill: 'forwards'}
      );
    });
    const turn = {animations};
    activeTurn = turn;
    await Promise.allSettled(animations.map(animation => animation.finished));
    if (activeTurn !== turn) return;
    render();
    animations.forEach(animation => animation.cancel());

    const pulse = plan.merged.map(index => board.children[index].firstElementChild.animate(
      [{transform: 'scale(.94)'}, {transform: 'scale(1.075)'}, {transform: 'scale(1)'}],
      {duration: 140, easing: 'ease-out'}
    ));
    if (plan.spawned !== -1) {
      pulse.push(board.children[plan.spawned].firstElementChild.animate(
        [{opacity: .2, transform: 'scale(.85)'}, {opacity: 1, transform: 'scale(1)'}],
        {duration: 115, easing: 'ease-out'}
      ));
    }
    turn.animations = pulse;
    await Promise.allSettled(pulse.map(animation => animation.finished));
    if (activeTurn !== turn) return;
    activeTurn = undefined;
  } else {
    render();
  }
  const result = outcome(state);
  byId('announcement').textContent = [
    ...newlyUnlocked.map(stage => strings.unlockEvent(stageTitle(stage))),
    result === 'won' ? strings.won : result === 'lost' ? strings.lost : ''
  ].filter(Boolean).join(strings.separator);
}

function restart() {
  stopTurn();
  state = newGame(state);
  commit();
  byId('announcement').textContent = strings.started;
}

function renderReferences() {
  byId('reference-list').replaceChildren(...references.map(sourceItem));
}

function sourceItem(source) {
  const item = node('li');
  const link = node('a', '', source.label);
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.lang = 'en';
  item.append(link, ' · ' + source.section[language]);
  return item;
}

function renderCard(card, open) {
  const copy = card.copy[language] ?? card.copy.en ?? card.copy['zh-CN'];
  const details = node('details', 'card');
  details.dataset.cardId = card.id;
  details.open = open;
  if (!card.copy[language]) details.lang = card.copy.en ? 'en' : 'zh-CN';
  const summary = node('summary', '', copy.title);
  if (copy.kind) summary.append(node('span', '', copy.kind));
  const body = node('div', 'card-content');
  if (copy.description) body.append(node('p', '', copy.description));
  for (const equation of card.equations ?? []) {
    const wrapper = node('div', 'equation');
    wrapper.innerHTML = equation; // Trusted MathML from the checked-in catalog.
    body.append(wrapper);
    requestAnimationFrame(() => {
      if (wrapper.scrollWidth > wrapper.clientWidth) wrapper.tabIndex = 0;
    });
  }
  if (copy.notes?.length) {
    const definitions = node('dl');
    for (const [term, description] of copy.notes) {
      definitions.append(node('dt', '', term), node('dd', '', description));
    }
    body.append(definitions);
  }
  const footer = node('footer');
  const time = node('time', '', card.updated);
  time.dateTime = card.updated;
  footer.append(strings.updated, time);
  if (card.sources?.length) {
    const list = node('ul');
    list.append(...card.sources.map(sourceItem));
    footer.append(list);
  }
  body.append(footer);
  details.append(summary, body);
  return details;
}

function renderStageHeader(stage) {
  byId('details-kicker').textContent = strings.unlocked + ' · ' + stage.value;
  byId('details-title').textContent = stageTitle(stage);
}

function renderStageCards(stage, openCards) {
  const body = byId('details-body');
  body.replaceChildren();
  const cards = publishedCards(stage.value);
  const demo = demos.get(stage.value);
  if (cards.length === 0 && !demo) {
    body.append(node('p', 'storage-message', strings.noCards));
  }
  for (const type of types) {
    const group = cards.filter(card => card.type === type);
    if (!group.length) continue;
    body.append(node('h3', '', strings[type]));
    body.append(...group.map((card, index) => renderCard(card, openCards ? openCards.has(card.id) : index === 0)));
  }
  if (demo) {
    const open = node('button', 'primary', typeof demo.title === 'string' ? demo.title : demo.title[language] ?? demo.title.en);
    open.type = 'button';
    open.addEventListener('click', () => showDemo(stage, demo));
    body.append(open);
  }
}

function showStage(stage) {
  activeStage = stage;
  renderStageHeader(stage);
  renderStageCards(stage);
  dialog.showModal();
  dialog.scrollTop = 0;
}

function stopDemo() {
  const session = demoSession;
  demoSession = undefined;
  session?.controller.abort();
  session?.controls?.dispose?.();
}

async function showDemo(stage, demo) {
  save();
  const controller = new AbortController();
  const session = {controller};
  demoSession = session;
  const body = byId('details-body');
  const host = node('div', 'demo-host');
  const pause = node('button', 'primary', strings.demoPause);
  pause.dataset.text = 'demoPause';
  pause.hidden = true;
  body.replaceChildren(host, pause);
  try {
    const module = await demo.load();
    if (controller.signal.aborted) return;
    const controls = await module.mount(host, {signal: controller.signal, stage});
    if (controller.signal.aborted) {
      controls?.dispose?.();
      return;
    }
    session.controls = controls;
    if (controls?.pause && controls?.resume) {
      pause.hidden = false;
      let paused = false;
      pause.addEventListener('click', () => {
        if (paused) controls.resume();
        else controls.pause();
        paused = !paused;
        pause.dataset.text = paused ? 'demoResume' : 'demoPause';
        pause.textContent = strings[pause.dataset.text];
      });
    }
  } catch {
    if (!controller.signal.aborted) {
      const error = node('p', '', strings.demoError);
      error.dataset.text = 'demoError';
      host.replaceChildren(error);
    }
  }
}

dialog.addEventListener('close', () => {
  stopDemo();
  stageList.querySelector('[data-stage="' + activeStage.value + '"]')?.focus({preventScroll: true});
  activeStage = undefined;
});

document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', switchLanguage));
document.addEventListener('keydown', event => {
  const direction = keys.get(event.key);
  if (!direction || dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  event.preventDefault();
  if (!event.repeat) shift(direction);
});

board.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  gesture = {id: event.pointerId, x: event.clientX, y: event.clientY};
  board.setPointerCapture(event.pointerId);
});
board.addEventListener('pointerup', event => {
  if (event.pointerId !== gesture?.id) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  gesture = undefined;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
  shift(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
});
board.addEventListener('lostpointercapture', event => {
  if (event.pointerId === gesture?.id) gesture = undefined;
});

document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('click', () => shift(button.dataset.direction));
});
byId('restart').addEventListener('click', restart);
endAction.addEventListener('click', () => {
  if (outcome(state) === 'won') {
    stopTurn();
    state = {...state, continued: true};
    commit();
  } else {
    restart();
  }
  if (end.hidden) board.focus();
});

renderLanguage();
save();
