import confetti from "canvas-confetti";

export type LegendaryRevealOptions = {
  reducedMotion?: boolean;
};

export type LegendaryRevealLayer = {
  root: HTMLDivElement;
  play: (options?: LegendaryRevealOptions) => void;
  reset: () => void;
};

function clearTimer(timerId: number | null): void {
  if (timerId !== null) {
    window.clearTimeout(timerId);
  }
}

export function burstConfetti(origin?: { x: number; y: number }): void {
  const x = origin ? origin.x / window.innerWidth : 0.5;
  const y = origin ? origin.y / window.innerHeight : 0.28;

  const colors = ["#f7e6a8", "#d4af37", "#ffffff", "#9fb5d6", "#191516"];

  confetti({
    particleCount: 130,
    spread: 78,
    startVelocity: 34,
    ticks: 220,
    origin: { x, y },
    colors,
    scalar: 1.05,
    zIndex: 60,
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 64,
      spread: 130,
      startVelocity: 24,
      ticks: 180,
      origin: { x, y: Math.max(0.08, y - 0.02) },
      colors,
      scalar: 0.9,
      zIndex: 60,
    });
  }, 140);
}

export function burstLegendaryConfetti(origin?: { x: number; y: number }): void {
  const x = origin ? origin.x / window.innerWidth : 0.5;
  const y = origin ? origin.y / window.innerHeight : 0.24;
  const golds = ["#fff7d6", "#f7e6a8", "#d4af37", "#f0c96a", "#9dd5ff", "#ffffff"];

  confetti({
    particleCount: 180,
    spread: 92,
    startVelocity: 42,
    ticks: 260,
    origin: { x, y },
    colors: golds,
    scalar: 1.18,
    drift: 0.12,
    zIndex: 65,
  });

  window.setTimeout(() => {
    confetti({
      particleCount: 96,
      spread: 150,
      startVelocity: 26,
      ticks: 220,
      origin: { x, y: Math.max(0.07, y - 0.04) },
      colors: ["#ffffff", "#d4af37", "#95bfff", "#f3df9b"],
      scalar: 0.96,
      drift: -0.08,
      zIndex: 65,
    });
  }, 130);
}

export function createLegendaryRevealLayer(): LegendaryRevealLayer {
  const root = document.createElement("div");
  root.className = "legendary-reveal";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = `
    <div class="legendary-reveal__sky"></div>
    <div class="legendary-reveal__sun"></div>
    <div class="legendary-reveal__cloud legendary-reveal__cloud--left"></div>
    <div class="legendary-reveal__cloud legendary-reveal__cloud--right"></div>
    <div class="legendary-reveal__beam"></div>
    <div class="legendary-reveal__rainbow"></div>
    <div class="legendary-reveal__sparkles"></div>
    <div class="legendary-reveal__stamp">LEGENDARY</div>
  `;

  let fadeTimer: number | null = null;
  let resetTimer: number | null = null;

  function reset(): void {
    clearTimer(fadeTimer);
    clearTimer(resetTimer);
    fadeTimer = null;
    resetTimer = null;
    root.classList.remove("is-active", "is-fading");
    root.removeAttribute("data-motion");
  }

  function play(options: LegendaryRevealOptions = {}): void {
    reset();
    root.dataset.motion = options.reducedMotion ? "reduced" : "full";
    root.classList.add("is-active");

    fadeTimer = window.setTimeout(() => {
      root.classList.add("is-fading");
    }, options.reducedMotion ? 1800 : 2800);

    resetTimer = window.setTimeout(() => {
      reset();
    }, options.reducedMotion ? 3600 : 5000);
  }

  return {
    root,
    play,
    reset,
  };
}
