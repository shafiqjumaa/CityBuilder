import { Game } from "./game.js";

window.addEventListener("DOMContentLoaded", () => {
  try {
    const game = new Game();
    // Small delay so the loading overlay is visible for at least a beat,
    // and to make sure the first frame is fully laid out before revealing it.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => game.start());
    });

    // Expose for quick debugging in the browser console.
    window.__game = game;
  } catch (err) {
    console.error("[CityBuilder] Fatal init error:", err);
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.innerHTML =
        '<div class="loader-content"><div class="loader-text">Failed to start — check the console (F12) for details.</div></div>';
    }
  }
});
