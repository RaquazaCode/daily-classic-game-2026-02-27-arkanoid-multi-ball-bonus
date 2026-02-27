import './style.css';
import { createInitialState, renderGameToText, stepState } from './game.js';

const app = document.querySelector('#app');
app.innerHTML = '<main class="shell"><h1>Arkanoid: Multi-ball Bonus</h1><p>Scaffold in progress.</p></main>';

const state = createInitialState();
window.render_game_to_text = () => renderGameToText(state);
window.advanceTime = (ms) => {
  const frames = Math.max(1, Math.floor(ms / (1000 / 60)));
  for (let i = 0; i < frames; i += 1) {
    stepState(state, { left: false, right: false, launch: false });
  }
  return renderGameToText(state);
};
