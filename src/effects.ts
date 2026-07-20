import confetti from "canvas-confetti";

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

