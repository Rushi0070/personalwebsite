// One audio element for the whole site, so a preview keeps playing while you
// browse. Clips fade in and out, run on into the next track, and show up in
// the OS media controls with their cover art.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLAYLIST, artAt } from './data';
import type { Track } from './data';

export interface Player {
  tracks: Track[];
  /** Index of the loaded track, -1 before anything plays. */
  index: number;
  track: Track | null;
  playing: boolean;
  /** Seconds into the clip, and its length. */
  time: number;
  duration: number;
  error: string;
  play: (i?: number) => void;
  pause: () => void;
  toggle: (i?: number) => void;
  next: () => void;
  prev: () => void;
  seek: (fraction: number) => void;
}

const FADE_MS = 450;

export function usePlayer(reduceMotion: boolean): Player {
  const audio = useRef<HTMLAudioElement | null>(null);
  const fade = useRef(0);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState('');
  const indexRef = useRef(-1);

  // Volume ramps (ignored by iOS, which is fine: it just cuts).
  const ramp = useCallback(
    (to: number, then?: () => void) => {
      const a = audio.current;
      if (!a) return;
      window.clearInterval(fade.current);
      if (reduceMotion) {
        a.volume = to;
        then?.();
        return;
      }
      const from = a.volume;
      const start = performance.now();
      fade.current = window.setInterval(() => {
        const p = Math.min(1, (performance.now() - start) / FADE_MS);
        a.volume = from + (to - from) * p;
        if (p >= 1) {
          window.clearInterval(fade.current);
          then?.();
        }
      }, 16);
    },
    [reduceMotion],
  );

  const load = useCallback(
    (i: number) => {
      const a = audio.current;
      const t = PLAYLIST[i];
      if (!a || !t) return;
      indexRef.current = i;
      setIndex(i);
      setTime(0);
      setError('');
      a.src = t.preview;
      a.currentTime = 0;
      a.volume = 0;
      a.play()
        .then(() => ramp(1))
        .catch(() => setError('the browser blocked playback'));
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: t.title,
          artist: t.artist,
          album: `${t.album} · preview`,
          artwork: [256, 512, 1200].map((px) => ({ src: artAt(t, px), sizes: `${px}x${px}`, type: 'image/jpeg' })),
        });
      }
    },
    [ramp],
  );

  const pause = useCallback(() => {
    const a = audio.current;
    if (!a || a.paused) return;
    ramp(0, () => a.pause());
  }, [ramp]);

  const play = useCallback(
    (i?: number) => {
      const a = audio.current;
      if (!a) return;
      const target = i ?? (indexRef.current < 0 ? 0 : indexRef.current);
      if (target !== indexRef.current) return load(target);
      a.play()
        .then(() => ramp(1))
        .catch(() => setError('the browser blocked playback'));
    },
    [load, ramp],
  );

  const toggle = useCallback(
    (i?: number) => {
      const a = audio.current;
      if (a && !a.paused && (i === undefined || i === indexRef.current)) pause();
      else play(i);
    },
    [pause, play],
  );

  const next = useCallback(() => load((indexRef.current + 1) % PLAYLIST.length), [load]);
  const prev = useCallback(() => {
    const a = audio.current;
    // like any player: back to the start first, then the previous track
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    load((indexRef.current - 1 + PLAYLIST.length) % PLAYLIST.length);
  }, [load]);

  const seek = useCallback((f: number) => {
    const a = audio.current;
    if (a && Number.isFinite(a.duration)) a.currentTime = Math.max(0, Math.min(1, f)) * a.duration;
  }, []);

  // The element and its events, once.
  useEffect(() => {
    const a = new Audio();
    a.preload = 'none';
    audio.current = a;
    const on = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      timeupdate: () => setTime(a.currentTime),
      loadedmetadata: () => setDuration(Number.isFinite(a.duration) ? a.duration : 30),
      // run on through the playlist once, then stop
      ended: () => {
        if (indexRef.current < PLAYLIST.length - 1) load(indexRef.current + 1);
      },
      error: () => {
        setPlaying(false);
        setError('this preview could not be loaded');
      },
    };
    for (const [k, fn] of Object.entries(on)) a.addEventListener(k, fn);
    return () => {
      for (const [k, fn] of Object.entries(on)) a.removeEventListener(k, fn);
      a.pause();
      window.clearInterval(fade.current);
    };
    // load is stable enough here: it only closes over refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OS media keys / lock screen.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => play());
    ms.setActionHandler('pause', pause);
    ms.setActionHandler('nexttrack', next);
    ms.setActionHandler('previoustrack', prev);
    return () => {
      for (const k of ['play', 'pause', 'nexttrack', 'previoustrack'] as const) ms.setActionHandler(k, null);
    };
  }, [play, pause, next, prev]);

  return useMemo(
    () => ({
      tracks: PLAYLIST,
      index,
      track: index >= 0 ? PLAYLIST[index] : null,
      playing,
      time,
      duration,
      error,
      play,
      pause,
      toggle,
      next,
      prev,
      seek,
    }),
    [index, playing, time, duration, error, play, pause, toggle, next, prev, seek],
  );
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
