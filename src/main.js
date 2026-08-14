import { Game } from './game.js';

const game = new Game({
  canvas: document.getElementById('game-canvas'),
  uiRoot: document.getElementById('app')
});

game.start();
