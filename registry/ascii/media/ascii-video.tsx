'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import type { AsciiScene } from '../engine/types';
import { AsciiCanvas, type SceneProps } from '../react/ascii-canvas';
import { canvasFeed, type MediaFeed } from './feed';
import { createMediaScene, type Backdrop, type MediaColor, type MediaMode } from './media-scene';
import { forPaper, wheelPalette } from './palette';
import type { MediaFit } from './sample';
import { useBackdrop } from './use-backdrop';

export interface VideoOptions {
  /** A video's URL, played muted on a loop. Same origin or served with CORS, since its pixels are read. */
  src?: string;
  /**
   * `webcam` draws the reader's camera, mirrored, once they press Start camera; `video` plays
   * `src`. Default `video` when there is a `src`, otherwise `webcam`.
   */
  source?: 'video' | 'webcam';
  /** `glyphs` draws a density ramp of type; `blocks` draws solid lit blocks with a glyph cut in. Default `glyphs`. */
  mode?: MediaMode;
  /** `source` takes each cell's colour from the picture; `mono` draws in one ink. Default `mono`. */
  color?: MediaColor;
  /** The ink for `mono`, as a CSS colour. Default violet. */
  tint?: string;
  /** `cover` fills the frame; `contain` shows the whole picture with room around it. Default `cover`. */
  fit?: MediaFit;
  /** Swap which end of the tones gets the dense glyphs. Default false. */
  invert?: boolean;
  /** Above 1 pushes tones apart, below 1 pulls them together. Default 1.2. */
  contrast?: number;
  /** Characters the pointer stirs the picture into. */
  scramble?: string;
}

export type AsciiVideoProps = SceneProps<VideoOptions>;

type Status = 'idle' | 'starting' | 'live' | 'still' | 'error';

/** Colours for any picture, since a video's change from frame to frame. */
const WHEEL = wheelPalette();
const PALETTE = { dark: WHEEL, light: forPaper(WHEEL) };

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useOnScreen(element: RefObject<HTMLElement | null>) {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = element.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setOnScreen(entry?.isIntersecting ?? true),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [element]);
  return onScreen;
}

/** A copy of a video's current frame, as a still picture. */
function snapshot(video: HTMLVideoElement, mirror: boolean): MediaFeed {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (mirror) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
  }
  return canvasFeed(
    canvas,
    () => [canvas.width, canvas.height],
    () => 1,
  );
}

/** A feed that reads a video's current frame, counting a new frame whenever its clock moves. */
function videoFeed(video: HTMLVideoElement, mirror: boolean): MediaFeed {
  return canvasFeed(
    video,
    () => [video.videoWidth, video.videoHeight],
    () => Math.round(video.currentTime * 1000),
    mirror,
  );
}

const buttonStyle: CSSProperties = {
  pointerEvents: 'auto',
  fontFamily: MONO,
  fontSize: 13,
  letterSpacing: '0.02em',
  color: 'inherit',
  background: 'color-mix(in srgb, currentColor 7%, transparent)',
  border: '1px solid color-mix(in srgb, currentColor 32%, transparent)',
  borderRadius: 999,
  padding: '9px 18px',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
};

/**
 * A video or the reader's camera, drawn in type. Each frame is read at the grid's resolution and
 * drawn as glyphs or lit blocks. The camera starts only when the reader asks, is mirrored like a
 * mirror, and stops when the component leaves the screen or unmounts. With reduced motion, a
 * video shows one still frame and the camera takes one picture.
 */
export function AsciiVideo(props: AsciiVideoProps) {
  const url = props.src?.trim() || '';
  const kind = props.source ?? (url ? 'video' : 'webcam');
  // A new source starts afresh.
  return <VideoStage key={kind === 'webcam' ? 'webcam' : `video:${url}`} {...props} />;
}

function VideoStage(props: AsciiVideoProps) {
  const {
    cellSize,
    interactive,
    speed,
    label,
    className,
    style,
    src,
    source,
    mode,
    color = 'mono',
    tint = '#8b6cff',
    fit = 'cover',
    invert,
    contrast = 1.2,
    scramble,
  } = props;
  const url = src?.trim() || '';
  const kind = source ?? (url ? 'video' : 'webcam');
  const webcam = kind === 'webcam';
  const box = useRef<HTMLDivElement>(null);
  const backdrop: Backdrop = useBackdrop(
    box,
    typeof style?.color === 'string' ? style.color : undefined,
  );
  const reduced = useReducedMotion();
  const onScreen = useOnScreen(box);
  const [wanted, setWanted] = useState(false);
  /** Counts the reader's presses of Start, so each one asks the camera again. */
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [feed, setFeed] = useState<MediaFeed | null>(null);
  /** Counts each new feed, so the scene is rebuilt around it. */
  const [take, setTake] = useState(0);

  // The camera: started by the reader, stopped off screen and on unmount.
  useEffect(() => {
    if (!webcam || !wanted || !onScreen) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      video.srcObject = null;
    };
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setError('This browser has no camera access here. It needs a secure (https) page.');
      return;
    }
    setStatus('starting');
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = s;
        video.srcObject = s;
        await video.play();
        if (cancelled) return;
        if (reduced) {
          // Reduced motion: one picture, and the camera goes off again.
          setFeed(snapshot(video, true));
          stop();
          setStatus('still');
        } else {
          setFeed(videoFeed(video, true));
          setStatus('live');
        }
        setTake((n) => n + 1);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const denied = e instanceof DOMException && e.name === 'NotAllowedError';
        setStatus('error');
        setError(denied ? 'Camera permission was turned down.' : 'No camera could be started.');
        setWanted(false);
      });
    return () => {
      cancelled = true;
      stop();
    };
  }, [webcam, wanted, onScreen, reduced, attempt]);

  // A video file: plays muted on a loop while on screen; with reduced motion, one still frame.
  const fileVideo = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (webcam || !url) return;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    let cancelled = false;
    setStatus('starting');
    const ready = () => {
      if (cancelled) return;
      if (reduced) {
        const settle = () => {
          if (cancelled) return;
          setFeed(snapshot(video, false));
          setStatus('still');
          setTake((n) => n + 1);
        };
        // A frame a little way in says more than the first.
        video.addEventListener('seeked', settle, { once: true });
        video.currentTime = Math.min(1, (video.duration || 0) / 3);
        return;
      }
      setFeed(videoFeed(video, false));
      setStatus('live');
      setTake((n) => n + 1);
    };
    video.addEventListener('loadeddata', ready, { once: true });
    video.addEventListener(
      'error',
      () => {
        if (cancelled) return;
        setStatus('error');
        setError("This video didn't load.");
      },
      { once: true },
    );
    video.src = url;
    fileVideo.current = video;
    return () => {
      cancelled = true;
      video.pause();
      video.removeAttribute('src');
      video.load();
      fileVideo.current = null;
    };
  }, [webcam, url, reduced]);

  useEffect(() => {
    const video = fileVideo.current;
    if (!video || status !== 'live') return;
    if (onScreen) video.play().catch(() => undefined);
    else video.pause();
  }, [onScreen, status]);

  const showing = status === 'live' || status === 'still';
  const options = { mode, color, tint, fit, invert, contrast, scramble };
  const sceneKey = JSON.stringify({ ...options, take, showing, webcam });
  const scene = useMemo(
    () => (): AsciiScene =>
      createMediaScene({
        ...options,
        feed: showing ? feed : null,
        palette: PALETTE,
        backdrop,
        live: status === 'live',
        viewfinder: webcam,
      }),
    // The key holds every option the scene is built from.
    [sceneKey],
  );

  const start = useCallback(() => {
    setError('');
    setWanted(true);
    setAttempt((n) => n + 1);
  }, []);
  const stopCamera = useCallback(() => {
    setWanted(false);
    setFeed(null);
    setStatus('idle');
  }, []);

  const overlay = webcam && (status === 'idle' || status === 'starting' || status === 'error');
  return (
    <div
      ref={box}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', color: style?.color }}
    >
      <AsciiCanvas
        scene={scene}
        sceneKey={sceneKey}
        cellSize={cellSize}
        interactive={interactive}
        speed={speed}
        label={label}
        style={style}
      />
      {overlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            pointerEvents: 'none',
            fontFamily: MONO,
            textAlign: 'center',
            padding: 24,
          }}
        >
          <button
            type="button"
            className="lilt-ascii-video__start"
            style={buttonStyle}
            onClick={start}
            disabled={status === 'starting'}
          >
            <span
              aria-hidden
              style={{ width: 7, height: 7, borderRadius: 2, background: tint || 'currentColor' }}
            />
            {status === 'starting'
              ? 'Starting…'
              : status === 'error'
                ? 'Try again'
                : 'Start camera'}
          </button>
          <p role={error ? 'alert' : undefined} style={{ margin: 0, fontSize: 12, opacity: 0.55 }}>
            {error || 'The picture stays on your device.'}
          </p>
        </div>
      )}
      {webcam && showing && (
        <button
          type="button"
          className="lilt-ascii-video__stop"
          onClick={status === 'still' ? start : stopCamera}
          style={{
            ...buttonStyle,
            position: 'absolute',
            right: 16,
            bottom: 16,
            fontSize: 12,
            padding: '6px 12px',
            opacity: 0.7,
          }}
        >
          {status === 'still' ? 'Take another' : 'Stop camera'}
        </button>
      )}
    </div>
  );
}
