// Audio Service for managing audio playback

import type { AudioFile, Transcript, TranscriptSegment } from '@/types';

interface AudioPlayerState {
  audio: HTMLAudioElement | null;
  currentAudio: AudioFile | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  transcript: Transcript | null;
  showTranscript: boolean;
  buffered: number;
}

type AudioEventCallback = (state: AudioPlayerState) => void;

class AudioService {
  private state: AudioPlayerState = {
    audio: null,
    currentAudio: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    transcript: null,
    showTranscript: false,
    buffered: 0,
  };

  private listeners: Set<AudioEventCallback> = new Set();
  private timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  private initAudio(): void {
    this.state.audio = new Audio();
    this.state.audio.preload = 'metadata';
    
    this.state.audio.addEventListener('timeupdate', () => this.handleTimeUpdate());
    this.state.audio.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
    this.state.audio.addEventListener('ended', () => this.handleEnded());
    this.state.audio.addEventListener('error', () => this.handleError());
    this.state.audio.addEventListener('progress', () => this.handleProgress());
    this.state.audio.addEventListener('play', () => this.handlePlay());
    this.state.audio.addEventListener('pause', () => this.handlePause());
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback({ ...this.state }));
  }

  subscribe(callback: AudioEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getState(): AudioPlayerState {
    return { ...this.state };
  }

  async load(audioFile: AudioFile, transcript?: Transcript): Promise<void> {
    if (!this.state.audio) return;

    // Stop current playback
    this.stop();

    this.state.currentAudio = audioFile;
    this.state.transcript = transcript || null;
    this.state.audio.src = audioFile.path;
    this.state.audio.load();

    this.notifyListeners();
  }

  play(): void {
    if (this.state.audio) {
      this.state.audio.play().catch((err) => {
        console.error('Audio play failed:', err);
      });
    }
  }

  pause(): void {
    if (this.state.audio) {
      this.state.audio.pause();
    }
  }

  stop(): void {
    if (this.state.audio) {
      this.state.audio.pause();
      this.state.audio.currentTime = 0;
      this.state.playing = false;
      this.state.currentTime = 0;
      this.notifyListeners();
    }
  }

  seek(time: number): void {
    if (this.state.audio) {
      this.state.audio.currentTime = Math.max(0, Math.min(time, this.state.duration));
    }
  }

  setVolume(volume: number): void {
    if (this.state.audio) {
      this.state.audio.volume = Math.max(0, Math.min(1, volume));
      this.state.volume = this.state.audio.volume;
      this.notifyListeners();
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.state.audio) {
      this.state.audio.playbackRate = Math.max(0.25, Math.min(4, rate));
      this.state.playbackRate = this.state.audio.playbackRate;
      this.notifyListeners();
    }
  }

  togglePlayPause(): void {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  skipForward(seconds = 10): void {
    this.seek(this.state.currentTime + seconds);
  }

  skipBackward(seconds = 10): void {
    this.seek(this.state.currentTime - seconds);
  }

  toggleTranscript(): void {
    this.state.showTranscript = !this.state.showTranscript;
    this.notifyListeners();
  }

  seekToSegment(segment: TranscriptSegment): void {
    this.seek(segment.start);
  }

  getCurrentSegment(): TranscriptSegment | null {
    if (!this.state.transcript?.segments) return null;
    return (
      this.state.transcript.segments.find(
        (s) => this.state.currentTime >= s.start && this.state.currentTime < s.end
      ) || null
    );
  }

  private handleTimeUpdate(): void {
    if (!this.state.audio) return;
    this.state.currentTime = this.state.audio.currentTime;
    this.notifyListeners();
  }

  private handleLoadedMetadata(): void {
    if (!this.state.audio) return;
    this.state.duration = this.state.audio.duration;
    this.notifyListeners();
  }

  private handleEnded(): void {
    this.state.playing = false;
    this.state.currentTime = 0;
    this.notifyListeners();
  }

  private handleError(): void {
    console.error('Audio error:', this.state.audio?.error);
    this.state.playing = false;
    this.notifyListeners();
  }

  private handleProgress(): void {
    if (!this.state.audio) return;
    const buffered = this.state.audio.buffered;
    if (buffered.length > 0) {
      this.state.buffered = buffered.end(buffered.length - 1);
    }
    this.notifyListeners();
  }

  private handlePlay(): void {
    this.state.playing = true;
    this.notifyListeners();
  }

  private handlePause(): void {
    this.state.playing = false;
    this.notifyListeners();
  }

  destroy(): void {
    this.stop();
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }
    this.listeners.clear();
  }
}

export const audioService = new AudioService();

// React hook for audio player
import { useState, useEffect, useCallback } from 'react';

export function useAudioPlayer() {
  const [state, setState] = useState<AudioPlayerState>(audioService.getState());

  useEffect(() => {
    const unsubscribe = audioService.subscribe(setState);
    return unsubscribe;
  }, []);

  const load = useCallback(async (audioFile: AudioFile, transcript?: Transcript) => {
    await audioService.load(audioFile, transcript);
  }, []);

  const play = useCallback(() => audioService.play(), []);
  const pause = useCallback(() => audioService.pause(), []);
  const stop = useCallback(() => audioService.stop(), []);
  const togglePlayPause = useCallback(() => audioService.togglePlayPause(), []);
  const seek = useCallback((time: number) => audioService.seek(time), []);
  const setVolume = useCallback((volume: number) => audioService.setVolume(volume), []);
  const setPlaybackRate = useCallback((rate: number) => audioService.setPlaybackRate(rate), []);
  const skipForward = useCallback((seconds?: number) => audioService.skipForward(seconds), []);
  const skipBackward = useCallback((seconds?: number) => audioService.skipBackward(seconds), []);
  const toggleTranscript = useCallback(() => audioService.toggleTranscript(), []);
  const seekToSegment = useCallback((segment: TranscriptSegment) => audioService.seekToSegment(segment), []);
  const getCurrentSegment = useCallback(() => audioService.getCurrentSegment(), []);

  return {
    ...state,
    load,
    play,
    pause,
    stop,
    togglePlayPause,
    seek,
    setVolume,
    setPlaybackRate,
    skipForward,
    skipBackward,
    toggleTranscript,
    seekToSegment,
    getCurrentSegment,
  };
}

// Utility to load transcript from file
export async function loadTranscript(path: string): Promise<Transcript | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    const data = await response.json();
    return data as Transcript;
  } catch {
    return null;
  }
}

// Parse transcript from text (simple format: timestamp text)
export function parseTranscript(text: string, audioId: string): Transcript {
  const segments: TranscriptSegment[] = [];
  const lines = text.split('\n').filter((line) => line.trim());
  
  let currentTime = 0;
  lines.forEach((line, index) => {
    // Try to parse timestamp formats: [00:00] or 00:00 or 00:00.000
    const timestampMatch = line.match(/^\[?(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?\]?\s+(.+)$/);
    
    if (timestampMatch) {
      const minutes = parseInt(timestampMatch[1], 10);
      const seconds = parseInt(timestampMatch[2], 10);
      const extraSeconds = timestampMatch[3] ? parseInt(timestampMatch[3], 10) : 0;
      const milliseconds = timestampMatch[4] ? parseInt(timestampMatch[4].padEnd(3, '0'), 10) : 0;
      
      currentTime = minutes * 60 + seconds + extraSeconds + milliseconds / 1000;
      const segmentText = timestampMatch[5];
      
      segments.push({
        id: `${audioId}-seg-${index}`,
        start: currentTime,
        end: currentTime + 5, // Default 5 seconds, will be adjusted
        text: segmentText,
      });
    } else {
      // No timestamp, estimate
      segments.push({
        id: `${audioId}-seg-${index}`,
        start: currentTime,
        end: currentTime + 3,
        text: line,
      });
      currentTime += 3;
    }
  });

  // Adjust end times based on next segment start
  segments.forEach((seg, i) => {
    if (i < segments.length - 1) {
      seg.end = segments[i + 1].start;
    }
  });

  return {
    id: audioId,
    audioId,
    text: lines.join(' '),
    language: 'en',
    segments,
  };
}