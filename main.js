import { Game } from "./game.js";

window.addEventListener("DOMContentLoaded", () => {
  try {
    const game = new Game();
    
    // تشغيل اللعبة وإخفاء شاشة التحميل فوراً
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        game.start();
        
        // كود إخفاء شاشة التحميل (Overlay) بعد بدء اللعبة بنجاح
        const overlay = document.getElementById("loading-overlay");
        if (overlay) {
          overlay.classList.add("hidden"); // أو إزالتها تماماً لتظهر اللعبة
          // إذا لم تكن كلمة hidden مفعّلة في الـ CSS الخاص بك، يمكنك استخدام السطر التالي بدلاً منها:
          // overlay.style.display = "none";
        }
      });
    });

    // إتاحة الكائن في الكونسول للتصحيح السريع
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
