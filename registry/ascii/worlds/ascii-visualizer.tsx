'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AsciiCanvas, useSceneProps, type SceneProps } from '../react/ascii-canvas';
import { createRidges, type RidgesOptions } from './ridges';

export interface AsciiVisualizerOptions extends Omit<RidgesOptions, 'listen'> {
  /**
   * Audio to play and draw: a URL on the same origin or served with CORS. Without one, and
   * without `microphone`, a short built-in loop plays.
   */
  src?: string;
  /** Listen to the microphone instead. The browser asks the reader first. Default false. */
  microphone?: boolean;
  /** Show the small play and pause button. Default true. */
  controls?: boolean;
}

type Source = { stop: () => void; resume?: () => void; pause?: () => void };

/** A loop of soft plucked notes, so the visualiser has something to draw with no file at all. */
function builtInLoop(ctx: AudioContext, out: AudioNode): Source {
  const notes = [0, 7, 12, 15, 19, 15, 12, 7, 3, 10, 15, 19, 22, 19, 15, 10];
  const bass = [0, 0, -4, -2];
  const step = 0.18;
  let next = ctx.currentTime + 0.05;
  let index = 0;
  const pluck = (
    at: number,
    semitone: number,
    length: number,
    gainValue: number,
    type: OscillatorType,
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = 220 * Math.pow(2, semitone / 12);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(gainValue, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + length + 0.05);
  };
  const timer = window.setInterval(() => {
    while (next < ctx.currentTime + 0.4) {
      pluck(next, notes[index % notes.length]!, 0.5, 0.12, 'triangle');
      if (index % 4 === 0) pluck(next, bass[(index / 4) % bass.length]! - 24, 0.7, 0.2, 'sine');
      if (index % 2 === 1)
        pluck(next, notes[(index + 5) % notes.length]! + 24, 0.12, 0.03, 'square');
      next += step;
      index++;
    }
  }, 100);
  return { stop: () => window.clearInterval(timer) };
}

const BUTTON: CSSProperties = {
  position: 'absolute',
  left: 12,
  bottom: 12,
  padding: '4px 10px',
  border: '1px solid color-mix(in srgb, currentColor 22%, transparent)',
  borderRadius: 999,
  background: 'color-mix(in srgb, currentColor 6%, transparent)',
  color: 'inherit',
  font: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
};

/**
 * Sound drawn as a landscape of ridgelines that rolls back as it plays. Click it, or its button,
 * to play: a file, the microphone, or a built-in loop. It breathes quietly until then.
 */
export function AsciiVisualizer(props: SceneProps<AsciiVisualizerOptions>) {
  const { src, microphone = false, controls = true, ...rest } = props;
  const analyser = useRef<AnalyserNode | null>(null);
  const bins = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audio = useRef<{ ctx: AudioContext; source: Source } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // The scene reads the analyser through a ref, so it never needs rebuilding.
  const listen = useRef(() => {
    const node = analyser.current;
    if (!node || !bins.current) return null;
    node.getByteFrequencyData(bins.current);
    return bins.current;
  }).current;
  const canvas = useSceneProps({ ...rest, listen } as SceneProps<RidgesOptions>, createRidges);

  async function start() {
    const ctx = new AudioContext();
    const node = ctx.createAnalyser();
    node.fftSize = 1024;
    node.smoothingTimeConstant = 0.78;
    analyser.current = node;
    bins.current = new Uint8Array(node.frequencyBinCount);
    let source: Source;
    if (microphone) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ctx.createMediaStreamSource(stream).connect(node);
      source = { stop: () => stream.getTracks().forEach((track) => track.stop()) };
    } else if (src) {
      const element = new Audio();
      element.crossOrigin = 'anonymous';
      element.src = src;
      element.loop = true;
      ctx.createMediaElementSource(element).connect(node);
      node.connect(ctx.destination);
      await element.play();
      source = { stop: () => element.pause() };
    } else {
      const gain = ctx.createGain();
      gain.gain.value = 0.6;
      gain.connect(node);
      node.connect(ctx.destination);
      source = builtInLoop(ctx, gain);
    }
    audio.current = { ctx, source };
  }

  function stop() {
    audio.current?.source.stop();
    void audio.current?.ctx.close();
    audio.current = null;
    analyser.current = null;
  }

  async function toggle() {
    if (playing) {
      stop();
      setPlaying(false);
      return;
    }
    try {
      setProblem(null);
      await start();
      setPlaying(true);
    } catch {
      stop();
      setProblem(microphone ? 'Microphone unavailable' : 'Could not play');
    }
  }

  useEffect(() => stop, []);
  // A new source starts quiet; the reader presses play again.
  useEffect(() => {
    stop();
    setPlaying(false);
  }, [src, microphone]);

  return (
    <div
      style={{ position: 'relative', width: '100%', height: '100%', ...props.style }}
      className={props.className}
      onClick={() => void toggle()}
    >
      <AsciiCanvas {...canvas} className={undefined} style={{ color: props.style?.color }} />
      {controls ? (
        <button
          type="button"
          style={BUTTON}
          onClick={(event) => {
            event.stopPropagation();
            void toggle();
          }}
          aria-pressed={playing}
        >
          {problem ?? (playing ? 'Pause' : microphone ? 'Listen' : 'Play')}
        </button>
      ) : null}
    </div>
  );
}
