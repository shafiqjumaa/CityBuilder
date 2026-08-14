export class UIManager {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.elements = {
      money: root.querySelector('#money'),
      population: root.querySelector('#population'),
      happiness: root.querySelector('#happiness'),
      balance: root.querySelector('#balance'),
      clockTime: root.querySelector('#clock-time'),
      clockDate: root.querySelector('#clock-date'),
      pause: root.querySelector('#pause-btn'),
      play: root.querySelector('#play-btn'),
      fast: root.querySelector('#fast-btn'),
      toolbar: root.querySelector('#toolbar'),
      toastStack: root.querySelector('#toast-stack'),
      buildingCount: root.querySelector('#building-count'),
      roadCount: root.querySelector('#road-count')
    };
  }

  bind() {
    this.elements.pause.addEventListener('click', () => {
      this.game.simulation.paused = true;
      this.toast('Simulation paused', 'Time progression is stopped.');
    });

    this.elements.play.addEventListener('click', () => {
      this.game.simulation.paused = false;
      this.game.simulation.speed = 1;
    });

    this.elements.fast.addEventListener('click', () => {
      this.game.simulation.paused = false;
      this.game.simulation.speed = 4;
      this.toast('Fast mode', 'Simulation speed set to 4×.');
    });

    this.elements.toolbar.querySelectorAll('.tool').forEach(btn => {
      btn.addEventListener('click', () => {
        this.elements.toolbar.querySelectorAll('.tool').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.toast('Tool selected', btn.querySelector('small').textContent);
      });
    });
  }

  update(sim) {
    const totalMinutes = Math.floor(sim.minutes);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    this.elements.clockTime.textContent =
      `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;

    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    this.elements.clockDate.textContent =
      `Day ${sim.day} · ${monthNames[sim.month - 1]} ${sim.year}`;

    this.elements.fast.textContent = sim.speed === 4 ? '▶▶✓' : '▶▶';
  }

  toast(title, message) {
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `<b>${this.escape(title)}</b><span>${this.escape(message)}</span>`;
    this.elements.toastStack.appendChild(node);

    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateY(-4px)';
      node.style.transition = '.2s ease';
      setTimeout(() => node.remove(), 220);
    }, 2800);
  }

  escape(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
    }[c]));
  }
}
