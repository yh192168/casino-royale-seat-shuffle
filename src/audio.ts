import { Howl, Howler } from "howler";
import type { AppSettings } from "./ui";

export type SoundName = "shuffle" | "draw" | "land" | "light" | "complete" | "ambient";

export type AudioEngine = {
  unlock: () => Promise<void>;
  setSettings: (settings: AppSettings) => void;
  startAmbience: () => void;
  stopAmbience: () => void;
  play: (name: SoundName) => void;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;

  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }

  return btoa(binary);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

function createWaveUrl(
  duration: number,
  generator: (time: number) => number,
  sampleRate = 22050,
): string {
  const sampleCount = Math.max(1, Math.floor(duration * sampleRate));
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, sampleCount * 2, true);

  let offset = 44;
  for (let index = 0; index < sampleCount; index += 1) {
    const time = index / sampleRate;
    const sample = Math.max(-1, Math.min(1, generator(time)));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return `data:audio/wav;base64,${bytesToBase64(new Uint8Array(buffer))}`;
}

function makeTone(duration: number, frequencies: number[], decay = 3.5, gain = 0.8): string {
  return createWaveUrl(duration, (time) => {
    const envelope = Math.exp(-time * decay);
    const wobble = 1 + Math.sin(time * 3.3) * 0.012;
    const value = frequencies.reduce((sum, frequency, index) => {
      const phase = index * 0.41;
      return sum + Math.sin((time * frequency * Math.PI * 2 * wobble) + phase);
    }, 0);

    return (value / frequencies.length) * envelope * gain;
  });
}

function makeNoiseBurst(duration: number, gain = 0.8): string {
  return createWaveUrl(duration, (time) => {
    const envelope = Math.exp(-time * 12);
    const carrier = Math.sin(time * 1320) * 0.45 + Math.sin(time * 1970) * 0.3 + Math.sin(time * 2860) * 0.18;
    const spark = Math.sin(time * 63) * 0.08;
    return (carrier + spark + (Math.random() - 0.5) * 0.35) * envelope * gain;
  });
}

function makeAmbientDrone(duration: number): string {
  return createWaveUrl(duration, (time) => {
    const slow = Math.sin(time * 0.55) * 0.18;
    const pulse = Math.sin(time * 2.1) * 0.05;
    const hum = Math.sin(time * 55.0) * 0.35 + Math.sin(time * 110.0 + 0.7) * 0.15;
    const shimmer = Math.sin(time * 220.0) * 0.05;
    return (hum + slow + pulse + shimmer) * 0.65;
  });
}

export function createAudioEngine(initialSettings: AppSettings): AudioEngine {
  const shuffle = new Howl({
    src: [makeNoiseBurst(0.24, 0.9)],
    preload: true,
    volume: initialSettings.masterVolume * initialSettings.sfxVolume,
  });

  const draw = new Howl({
    src: [makeTone(0.16, [440, 660, 880], 5.2, 0.8)],
    preload: true,
    volume: initialSettings.masterVolume * initialSettings.sfxVolume,
  });

  const land = new Howl({
    src: [makeTone(0.12, [190, 290], 6.2, 0.9)],
    preload: true,
    volume: initialSettings.masterVolume * initialSettings.sfxVolume,
  });

  const light = new Howl({
    src: [makeTone(0.38, [523.25, 659.25, 783.99], 4.8, 0.75)],
    preload: true,
    volume: initialSettings.masterVolume * initialSettings.sfxVolume,
  });

  const complete = new Howl({
    src: [makeTone(0.72, [392, 523.25, 659.25, 783.99], 3.8, 0.78)],
    preload: true,
    volume: initialSettings.masterVolume * initialSettings.sfxVolume,
  });

  const ambient = new Howl({
    src: [makeAmbientDrone(3.5)],
    preload: true,
    loop: true,
    volume: initialSettings.masterVolume * initialSettings.ambientVolume,
  });

  const allSfx = [shuffle, draw, land, light, complete];
  let settings = initialSettings;

  function applyVolumes(): void {
    const sfxVolume = settings.masterVolume * settings.sfxVolume;
    for (const sound of allSfx) {
      sound.volume(sfxVolume);
    }
    ambient.volume(settings.masterVolume * settings.ambientVolume);
  }

  return {
    unlock: async () => {
      if (Howler.ctx && Howler.ctx.state !== "running") {
        await Howler.ctx.resume();
      }
    },
    setSettings: (nextSettings) => {
      settings = nextSettings;
      applyVolumes();
    },
    startAmbience: () => {
      if (!ambient.playing()) {
        ambient.play();
      }
    },
    stopAmbience: () => {
      if (ambient.playing()) {
        ambient.fade(ambient.volume(), 0, 300);
        window.setTimeout(() => {
          ambient.stop();
        }, 320);
      }
    },
    play: (name) => {
      switch (name) {
        case "shuffle":
          shuffle.stop();
          shuffle.play();
          break;
        case "draw":
          draw.stop();
          draw.play();
          break;
        case "land":
          land.stop();
          land.play();
          break;
        case "light":
          light.stop();
          light.play();
          break;
        case "complete":
          complete.stop();
          complete.play();
          break;
        case "ambient":
          ambient.stop();
          ambient.play();
          break;
        default:
          break;
      }
    },
  };
}
