export type AppSettings = {
  masterVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  reducedMotion: boolean;
};

export type UiShell = {
  root: HTMLDivElement;
  introOverlay: HTMLDivElement;
  startButton: HTMLButtonElement;
  skipButton: HTMLButtonElement;
  csvButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  settingsPanel: HTMLDivElement;
  progressValue: HTMLDivElement;
  progressLabel: HTMLDivElement;
  progressBarFill: HTMLDivElement;
  statusValue: HTMLSpanElement;
  titleValue: HTMLHeadingElement;
  subtitleValue: HTMLParagraphElement;
  masterVolume: HTMLInputElement;
  sfxVolume: HTMLInputElement;
  ambientVolume: HTMLInputElement;
  reducedMotion: HTMLInputElement;
  setProgress: (current: number, total: number) => void;
  setStatus: (status: string) => void;
  setPhase: (phase: string) => void;
  setStartVisible: (visible: boolean) => void;
  setSkipEnabled: (enabled: boolean) => void;
  setCsvVisible: (visible: boolean) => void;
  setIntroVisible: (visible: boolean) => void;
  applySettings: (settings: AppSettings) => void;
};

export const DEFAULT_SETTINGS: AppSettings = {
  masterVolume: 0.9,
  sfxVolume: 0.9,
  ambientVolume: 0.35,
  reducedMotion: window.matchMedia("(max-width: 720px)").matches,
};

const STORAGE_KEY = "casino-royale-seat-shuffle.settings";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      masterVolume: Number.isFinite(parsed.masterVolume) ? Number(parsed.masterVolume) : DEFAULT_SETTINGS.masterVolume,
      sfxVolume: Number.isFinite(parsed.sfxVolume) ? Number(parsed.sfxVolume) : DEFAULT_SETTINGS.sfxVolume,
      ambientVolume: Number.isFinite(parsed.ambientVolume) ? Number(parsed.ambientVolume) : DEFAULT_SETTINGS.ambientVolume,
      reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Local storage is a convenience only.
  }
}

export type BuildUiOptions = {
  settings: AppSettings;
  onStart: () => void;
  onSkip: () => void;
  onCsv: () => void;
  onSettingsChange: (settings: AppSettings) => void;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function createRange(
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  unit = "",
): { row: HTMLDivElement; input: HTMLInputElement; value: HTMLSpanElement } {
  const row = document.createElement("label");
  row.className = "settings-panel__row";
  row.innerHTML = `
    <div class="settings-panel__meta">
      <span class="settings-panel__name">${label}</span>
      <span class="settings-panel__value">${Math.round(value * 100)}${unit}</span>
    </div>
  `;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.className = "settings-panel__range";

  const valueNode = row.querySelector<HTMLSpanElement>(".settings-panel__value");
  row.append(input);

  return {
    row,
    input,
    value: valueNode ?? document.createElement("span"),
  };
}

export function buildUi(options: BuildUiOptions): UiShell {
  const root = document.createElement("div");
  root.className = "ui-shell";

  const grain = document.createElement("div");
  grain.className = "ui-shell__grain";

  const brand = document.createElement("div");
  brand.className = "brand glass-panel";
  brand.innerHTML = `
    <div class="brand__kicker">Casino Royale</div>
    <div class="brand__title">Seat Shuffle</div>
    <div class="brand__subtitle">Presented by Class 1-2</div>
  `;

  const progress = document.createElement("div");
  progress.className = "progress-pill glass-panel";
  progress.innerHTML = `
    <div class="progress-pill__label">Progress</div>
    <div class="progress-pill__value">0 / 27</div>
    <div class="progress-pill__bar"><span></span></div>
  `;

  const status = document.createElement("div");
  status.className = "status-chip glass-panel";
  status.innerHTML = `
    <span class="status-chip__label">Status</span>
    <span class="status-chip__value">Opening</span>
  `;

  const introOverlay = document.createElement("section");
  introOverlay.className = "intro-overlay";
  introOverlay.innerHTML = `
    <div class="intro-overlay__spotlight"></div>
    <div class="intro-overlay__card glass-panel">
      <div class="intro-overlay__eyebrow">A cinematic seating ritual</div>
      <h1 class="intro-overlay__title">SEAT SHUFFLE</h1>
      <p class="intro-overlay__subtitle">One class. One table. Twenty-seven cards of fate.</p>
      <div class="intro-overlay__actions">
        <button class="start-button" type="button">START</button>
      </div>
      <div class="intro-overlay__note">Use the settings panel to tune the audio and reduce motion on mobile.</div>
    </div>
  `;

  const footer = document.createElement("footer");
  footer.className = "ui-shell__footer";

  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.className = "glass-button glass-button--left";
  settingsButton.textContent = "Settings";

  const skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "glass-button glass-button--right";
  skipButton.textContent = "Skip Animation";

  const csvButton = document.createElement("button");
  csvButton.type = "button";
  csvButton.className = "glass-button glass-button--csv";
  csvButton.textContent = "CSV";
  csvButton.hidden = true;

  const settingsPanel = document.createElement("div");
  settingsPanel.className = "settings-panel glass-panel";
  settingsPanel.innerHTML = `
    <div class="settings-panel__header">
      <div class="settings-panel__title">Settings</div>
      <div class="settings-panel__copy">Adjust the mix and motion without leaving the room.</div>
    </div>
  `;

  const masterRange = createRange("Master", options.settings.masterVolume, 0, 1, 0.01);
  const sfxRange = createRange("SFX", options.settings.sfxVolume, 0, 1, 0.01);
  const ambientRange = createRange("Ambient", options.settings.ambientVolume, 0, 1, 0.01);

  const motionRow = document.createElement("label");
  motionRow.className = "settings-panel__toggle";
  motionRow.innerHTML = `
    <span class="settings-panel__name">Reduced Motion</span>
    <input type="checkbox" class="settings-panel__checkbox" />
  `;
  const motionToggle = motionRow.querySelector<HTMLInputElement>(".settings-panel__checkbox");
  if (!motionToggle) {
    throw new Error("Motion toggle failed to initialize.");
  }
  motionToggle.checked = options.settings.reducedMotion;

  settingsPanel.append(masterRange.row, sfxRange.row, ambientRange.row, motionRow);

  const caption = document.createElement("div");
  caption.className = "ui-shell__caption";
  caption.innerHTML = `
    <div class="ui-shell__caption-line"></div>
    <div class="ui-shell__caption-copy">Film-noir presentation mode with glass UI, bloom, and a velvet deck.</div>
  `;

  footer.append(settingsButton, caption, skipButton, csvButton);

  root.append(grain, introOverlay, settingsPanel, footer);

  const startButton = introOverlay.querySelector<HTMLButtonElement>(".start-button");
  const titleValue = introOverlay.querySelector<HTMLHeadingElement>(".intro-overlay__title");
  const subtitleValue = introOverlay.querySelector<HTMLParagraphElement>(".intro-overlay__subtitle");
  const progressValue = progress.querySelector<HTMLDivElement>(".progress-pill__value");
  const progressLabel = progress.querySelector<HTMLDivElement>(".progress-pill__label");
  const progressBarFill = progress.querySelector<HTMLSpanElement>(".progress-pill__bar span");
  const statusValue = status.querySelector<HTMLSpanElement>(".status-chip__value");

  if (!startButton || !titleValue || !subtitleValue || !progressValue || !progressLabel || !progressBarFill || !statusValue) {
    throw new Error("UI shell failed to initialize.");
  }

  const shell = document.createElement("div");
  shell.className = "ui-shell__hud";
  shell.append(brand, progress, status);
  root.insertBefore(shell, introOverlay);

  function setProgress(current: number, total: number): void {
    progressValue.textContent = `${current} / ${total}`;
    progressBarFill.style.transform = `scaleX(${clamp01(total > 0 ? current / total : 0)})`;
  }

  function setStatus(text: string): void {
    statusValue.textContent = text;
  }

  function setPhase(text: string): void {
    progressLabel.textContent = text;
  }

  function setStartVisible(visible: boolean): void {
    introOverlay.classList.toggle("is-hidden", !visible);
  }

  function setSkipEnabled(enabled: boolean): void {
    skipButton.disabled = !enabled;
    skipButton.classList.toggle("is-disabled", !enabled);
  }

  function setCsvVisible(visible: boolean): void {
    csvButton.hidden = !visible;
  }

  function setIntroVisible(visible: boolean): void {
    introOverlay.classList.toggle("is-hidden", !visible);
  }

  function applySettings(settings: AppSettings): void {
    masterRange.input.value = String(settings.masterVolume);
    sfxRange.input.value = String(settings.sfxVolume);
    ambientRange.input.value = String(settings.ambientVolume);
    motionToggle.checked = settings.reducedMotion;
    masterRange.value.textContent = `${Math.round(settings.masterVolume * 100)}%`;
    sfxRange.value.textContent = `${Math.round(settings.sfxVolume * 100)}%`;
    ambientRange.value.textContent = `${Math.round(settings.ambientVolume * 100)}%`;
  }

  const syncSettings = (): void => {
    const nextSettings: AppSettings = {
      masterVolume: Number(masterRange.input.value),
      sfxVolume: Number(sfxRange.input.value),
      ambientVolume: Number(ambientRange.input.value),
      reducedMotion: motionToggle.checked,
    };

    masterRange.value.textContent = `${Math.round(nextSettings.masterVolume * 100)}%`;
    sfxRange.value.textContent = `${Math.round(nextSettings.sfxVolume * 100)}%`;
    ambientRange.value.textContent = `${Math.round(nextSettings.ambientVolume * 100)}%`;
    saveSettings(nextSettings);
    options.onSettingsChange(nextSettings);
  };

  masterRange.input.addEventListener("input", syncSettings);
  sfxRange.input.addEventListener("input", syncSettings);
  ambientRange.input.addEventListener("input", syncSettings);
  motionToggle.addEventListener("change", syncSettings);

  settingsButton.addEventListener("click", () => {
    settingsPanel.classList.toggle("is-open");
  });

  startButton.addEventListener("click", options.onStart);
  skipButton.addEventListener("click", options.onSkip);
  csvButton.addEventListener("click", options.onCsv);

  applySettings(options.settings);
  options.onSettingsChange(options.settings);

  return {
    root,
    introOverlay,
    startButton,
    skipButton,
    csvButton,
    settingsButton,
    settingsPanel,
    progressValue,
    progressLabel,
    progressBarFill,
    statusValue,
    titleValue,
    subtitleValue,
    masterVolume: masterRange.input,
    sfxVolume: sfxRange.input,
    ambientVolume: ambientRange.input,
    reducedMotion: motionToggle,
    setProgress,
    setStatus,
    setPhase,
    setStartVisible,
    setSkipEnabled,
    setCsvVisible,
    setIntroVisible,
    applySettings,
  };
}
