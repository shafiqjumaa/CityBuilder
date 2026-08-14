import { Game } from './game.js';

// Simulated loading progress (asset/module init happens synchronously with
// ES modules, so we fake a short progress bar for a nicer first impression).
const fill = document.getElementById('loading-fill');
const screen = document.getElementById('loading-screen');

let progress = 0;
const loadingTimer = setInterval(() => {
  progress += Math.random() * 18;
  if (progress >= 100) progress = 100;
  fill.style.width = progress + '%';
  if (progress >= 100) clearInterval(loadingTimer);
}, 120);

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.init();

    // expose for debugging in the browser console
    window.__game = game;

    setTimeout(() => {
      screen.style.opacity = '0';
      setTimeout(() => screen.remove(), 650);
    }, 700);
  } catch (err) {
    console.error('[Urbanova] Fatal init error:', err);
    screen.querySelector('.loading-hint').textContent =
      'Failed to start — open the console for details.';
  }
});
