import { seatDefinitions, type SeatDefinition } from "./algorithm";

export type SeatMetrics = {
  seat: SeatDefinition;
  element: HTMLDivElement;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  scale: number;
};

export type ClassroomView = {
  root: HTMLDivElement;
  grid: HTMLDivElement;
  slots: Map<string, HTMLDivElement>;
  reveal: () => void;
  hide: () => void;
  setVisible: (visible: boolean) => void;
  setSeatOccupied: (seatLabel: string, studentName: string) => void;
  setSeatIdle: (seatLabel: string) => void;
  setComplete: () => void;
  pulseAll: () => void;
  measureSlots: () => Map<string, SeatMetrics>;
};

function createSeatSlot(seat: SeatDefinition): HTMLDivElement {
  const slot = document.createElement("div");
  slot.className = "seat-slot";
  slot.dataset.seat = seat.label;
  slot.style.gridRow = String(seat.row + 1);
  slot.style.gridColumn = String(seat.col + 1);
  slot.innerHTML = `
    <span class="seat-slot__frame"></span>
    <span class="seat-slot__seat">${seat.label}</span>
    <span class="seat-slot__glow"></span>
  `;
  return slot;
}

export function createClassroomView(): ClassroomView {
  const root = document.createElement("section");
  root.className = "classroom";
  root.setAttribute("aria-label", "Classroom layout");

  const shell = document.createElement("div");
  shell.className = "classroom__shell";

  const header = document.createElement("div");
  header.className = "classroom__header glass-panel";
  header.innerHTML = `
    <div class="classroom__header-kicker">Classroom Layout</div>
    <div class="classroom__header-title">27 Seats in Play</div>
    <div class="classroom__header-subtitle">The cards land where the room decides.</div>
  `;
  header.hidden = true;

  const grid = document.createElement("div");
  grid.className = "classroom__grid";

  const footer = document.createElement("div");
  footer.className = "classroom__footer";
  footer.innerHTML = `
    <span class="classroom__footer-line"></span>
    <span class="classroom__footer-copy">Top-down classroom view, tilted for a cinematic perspective.</span>
  `;
  footer.hidden = true;

  shell.append(header, grid, footer);
  root.append(shell);

  const slots = new Map<string, HTMLDivElement>();
  for (const seat of seatDefinitions) {
    const slot = createSeatSlot(seat);
    grid.appendChild(slot);
    slots.set(seat.label, slot);
  }

  function setVisible(visible: boolean): void {
    root.classList.toggle("is-visible", visible);
  }

  function reveal(): void {
    setVisible(true);
  }

  function hide(): void {
    setVisible(false);
  }

  function setSeatOccupied(seatLabel: string, studentName: string): void {
    const slot = slots.get(seatLabel);
    if (!slot) {
      return;
    }

    slot.dataset.student = studentName;
    slot.classList.add("is-occupied");
  }

  function setSeatIdle(seatLabel: string): void {
    const slot = slots.get(seatLabel);
    if (!slot) {
      return;
    }

    slot.removeAttribute("data-student");
    slot.classList.remove("is-occupied");
  }

  function setComplete(): void {
    root.classList.add("is-complete");
  }

  function pulseAll(): void {
    root.classList.add("is-pulsing");
    window.setTimeout(() => {
      root.classList.remove("is-pulsing");
    }, 1400);
  }

  function measureSlots(): Map<string, SeatMetrics> {
    const metrics = new Map<string, SeatMetrics>();

    for (const seat of seatDefinitions) {
      const slot = slots.get(seat.label);
      if (!slot) {
        continue;
      }

      const rect = slot.getBoundingClientRect();
      metrics.set(seat.label, {
        seat,
        element: slot,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
        scale: rect.width / 320,
      });
    }

    return metrics;
  }

  return {
    root,
    grid,
    slots,
    reveal,
    hide,
    setVisible,
    setSeatOccupied,
    setSeatIdle,
    setComplete,
    pulseAll,
    measureSlots,
  };
}
