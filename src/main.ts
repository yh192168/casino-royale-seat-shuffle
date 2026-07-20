import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { createFlightCard, setCardState } from "./cards";
import { generateBestArrangement, orderAssignmentsForShow, type Assignment } from "./algorithm";
import { downloadCsv } from "./csv";
import { burstConfetti } from "./effects";
import { createAudioEngine } from "./audio";
import { createClassroomView, type SeatMetrics } from "./classroom";
import { createDealerStage, type DealerStage } from "./dealer";
import { roster } from "./roster";
import { buildUi, loadSettings, saveSettings, type AppSettings } from "./ui";

import "./styles/main.css";

gsap.registerPlugin(MotionPathPlugin);

type PositionedCard = {
  element: HTMLDivElement;
  assignment: Assignment;
};

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("App root not found.");
}

const shell = document.createElement("div");
shell.className = "app-shell";

const stageHost = document.createElement("div");
stageHost.className = "casino-stage";

const classroom = createClassroomView();
const cardLayer = document.createElement("div");
cardLayer.className = "card-layer";

shell.append(stageHost, classroom.root, cardLayer);
appRoot.append(shell);

const initialSettings = loadSettings();
let currentSettings: AppSettings = initialSettings;

const audio = createAudioEngine(initialSettings);
const stage: DealerStage = createDealerStage(stageHost, {
  reducedMotion: initialSettings.reducedMotion,
});

const ui = buildUi({
  settings: initialSettings,
  onStart: () => {
    void startShow();
  },
  onSkip: () => {
    skipShow();
  },
  onCsv: () => {
    downloadCsv(finalAssignments);
  },
  onSettingsChange: (settings) => {
    currentSettings = settings;
    stage.setReducedMotion(settings.reducedMotion);
    audio.setSettings(settings);
    saveSettings(settings);
  },
});

shell.append(ui.root);

const arrangement = generateBestArrangement(roster, initialSettings.reducedMotion ? 12000 : 20000);
const drawOrder = orderAssignmentsForShow(arrangement.assignments);
const finalAssignments = arrangement.assignments;

const placedCards = new Map<string, PositionedCard>();
let seatMetrics = new Map<string, SeatMetrics>();
let animationRunId = 0;
let currentTimeline: gsap.core.Timeline | null = null;
let currentTimelineResolve: ((value?: HTMLDivElement | null) => void) | null = null;
let started = false;
let completed = false;

classroom.hide();

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function wait(ms: number): Promise<void> {
  return new Promise<HTMLDivElement | null>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function syncLayout(): void {
  stage.resize(stageHost.clientWidth || window.innerWidth, stageHost.clientHeight || window.innerHeight);
  seatMetrics = classroom.measureSlots();
  syncPlacedCardPositions();
}

function syncPlacedCardPositions(): void {
  for (const [seatLabel, positionedCard] of placedCards) {
    const metrics = seatMetrics.get(seatLabel);
    if (!metrics) {
      continue;
    }

    gsap.set(positionedCard.element, {
      xPercent: -50,
      yPercent: -50,
      x: metrics.centerX,
      y: metrics.centerY,
      scale: metrics.scale,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
    });
  }
}

function placeCardInstantly(card: HTMLDivElement, seatLabel: string): void {
  const metrics = seatMetrics.get(seatLabel);
  if (!metrics) {
    return;
  }

  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: metrics.centerX,
    y: metrics.centerY,
    scale: metrics.scale,
    rotateZ: 0,
    rotateY: 0,
  });
  setCardState(card, "front");
}

function createPlacedCard(assignment: Assignment): PositionedCard | null {
  const metrics = seatMetrics.get(assignment.seat.label);
  if (!metrics) {
    return null;
  }

  const element = createFlightCard({
    seatLabel: assignment.seat.label,
    name: assignment.student.name,
  });
  cardLayer.append(element);
  setCardState(element, "front");
  element.classList.add("is-settled");
  placeCardInstantly(element, assignment.seat.label);
  return {
    element,
    assignment,
  };
}

function renderFinalLayout(): void {
  cardLayer.replaceChildren();
  placedCards.clear();
  classroom.reveal();

  for (const assignment of finalAssignments) {
    classroom.setSeatOccupied(assignment.seat.label, assignment.student.name);
    const positionedCard = createPlacedCard(assignment);
    if (positionedCard) {
      placedCards.set(assignment.seat.label, positionedCard);
    }
  }

  syncPlacedCardPositions();
}

function finishShow(): void {
  if (completed) {
    return;
  }

  completed = true;
  ui.setProgress(finalAssignments.length, finalAssignments.length);
  ui.setStatus("COMPLETE");
  ui.setSkipEnabled(false);
  ui.setCsvVisible(true);
  classroom.setComplete();
  classroom.pulseAll();
  stage.celebrate();
  audio.play("complete");
  audio.stopAmbience();
  burstConfetti(stage.getHandPoint());
}

function cancelActiveTimeline(): void {
  currentTimeline?.kill();
  currentTimeline = null;
  currentTimelineResolve?.();
  currentTimelineResolve = null;
}

function animateCardFlight(assignment: Assignment): Promise<HTMLDivElement | null> {
  const metrics = seatMetrics.get(assignment.seat.label);
  if (!metrics) {
    return Promise.resolve(null);
  }

  const launchPoint = stage.getDeckPoint();
  const endPoint = {
    x: metrics.centerX,
    y: metrics.centerY,
  };
  const lift = randomBetween(92, 150);
  const drift = randomBetween(-110, 110);
  const midPointA = {
    x: launchPoint.x + drift * 0.2,
    y: launchPoint.y - lift * 0.58,
  };
  const midPointB = {
    x: (launchPoint.x + endPoint.x) * 0.5 + drift,
    y: Math.min(launchPoint.y, endPoint.y) - lift,
  };
  const midPointC = {
    x: endPoint.x + drift * 0.08,
    y: endPoint.y - lift * 0.15,
  };

  const card = createFlightCard({
    seatLabel: assignment.seat.label,
    name: assignment.student.name,
  });
  cardLayer.append(card);
  gsap.set(card, {
    xPercent: -50,
    yPercent: -50,
    x: launchPoint.x,
    y: launchPoint.y,
    scale: 1.04,
    rotateZ: randomBetween(-6, 6),
    rotateY: 180,
  });
  setCardState(card, "back");

  stage.dealPulse();
  audio.play("draw");

  return new Promise((resolve) => {
    const timeline = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        currentTimeline = null;
        currentTimelineResolve = null;
        setCardState(card, "front");
        gsap.set(card, {
          x: endPoint.x,
          y: endPoint.y,
          scale: metrics.scale,
          rotateZ: 0,
          rotateY: 0,
        });
        resolve(card);
      },
    });

    currentTimeline = timeline;
    currentTimelineResolve = resolve;

    timeline
      .to(card, {
        scale: 1.08,
        y: launchPoint.y - 24,
        duration: currentSettings.reducedMotion ? 0.08 : 0.16,
        ease: "power2.out",
      }, 0)
      .to(card, {
        motionPath: {
          path: [launchPoint, midPointA, midPointB, midPointC, endPoint],
          curviness: 1.55,
          autoRotate: false,
        },
        duration: currentSettings.reducedMotion ? 0.8 : 1.28,
        ease: "power4.inOut",
      }, 0.06)
      .to(card, {
        rotateY: 0,
        duration: currentSettings.reducedMotion ? 0.42 : 0.78,
        ease: "power1.inOut",
      }, 0.16)
      .to(card, {
        scale: metrics.scale * 1.03,
        duration: 0.18,
        ease: "back.out(2.6)",
      }, ">-0.04")
      .to(card, {
        scale: metrics.scale,
        duration: 0.14,
        ease: "power2.out",
      });
  });
}

async function completeCard(assignment: Assignment, index: number): Promise<void> {
  ui.setStatus(assignment.student.name);
  ui.setProgress(index, finalAssignments.length);
  stage.setDeckRemaining(finalAssignments.length - index - 1);
  classroom.setSeatOccupied(assignment.seat.label, assignment.student.name);

  const card = await animateCardFlight(assignment);
  if (!card) {
    return;
  }

  const metrics = seatMetrics.get(assignment.seat.label);
  if (!metrics) {
    return;
  }

  const finalCard: PositionedCard = {
    element: card,
    assignment,
  };
  finalCard.element.classList.add("is-settled");
  placedCards.set(assignment.seat.label, finalCard);
  gsap.to(finalCard.element, {
    scale: metrics.scale * 1.02,
    duration: 0.16,
    ease: "power2.out",
    yoyo: true,
    repeat: 1,
  });

  audio.play("land");
  ui.setProgress(index + 1, finalAssignments.length);
  syncPlacedCardPositions();
}

async function startShow(): Promise<void> {
  if (started) {
    return;
  }

  started = true;
  completed = false;
  animationRunId += 1;
  const runId = animationRunId;

  cancelActiveTimeline();
  ui.setCsvVisible(false);
  ui.setSkipEnabled(true);
  ui.setStartVisible(false);
  ui.setStatus("Lighting the room");
  await audio.unlock();
  audio.startAmbience();
  audio.play("light");
  stage.intro();

  classroom.hide();
  await wait(currentSettings.reducedMotion ? 120 : 920);
  if (runId !== animationRunId) {
    return;
  }

  classroom.reveal();
  syncLayout();
  audio.play("shuffle");

  for (let index = 0; index < drawOrder.length; index += 1) {
    if (runId !== animationRunId) {
      return;
    }

    const assignment = drawOrder[index];
    await completeCard(assignment, index);
  }

  if (runId !== animationRunId) {
    return;
  }

  finishShow();
}

function skipShow(): void {
  if (!started || completed) {
    return;
  }

  animationRunId += 1;
  cancelActiveTimeline();
  renderFinalLayout();
  finishShow();
}

window.addEventListener("resize", () => {
  syncLayout();
});

requestAnimationFrame(() => {
  syncLayout();
  ui.setProgress(0, finalAssignments.length);
  ui.setStatus("Opening");
  ui.setSkipEnabled(false);
  ui.setCsvVisible(false);
});
