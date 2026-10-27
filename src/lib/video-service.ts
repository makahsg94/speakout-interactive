// Video Service for managing video playback

import type { VideoFile } from '@/types';

interface VideoPlayerState {
  video: HTMLVideoElement | null;
  currentVideo: VideoFile | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  fullscreen: boolean;
  captions: boolean;
  buffered: number;
  error: string | null;
}

type VideoEventCallback = (state: VideoPlayerState) => void;

class VideoService {
  private state: VideoPlayerState = {
    video: null,
    currentVideo: null,
    playing: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    fullscreen: false,
    captions: false,
    buffered: 0,
    error: null,
  };

  private listeners: Set<VideoEventCallback> = new Set();
  private container: HTMLElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initVideo();
    }
  }

  private initVideo(): void {
    this.state.video = document.createElement('video');
    this.state.video.preload = 'metadata';
    this.state.video.playsInline = true;
    this.state.video.crossOrigin = 'anonymous';
    
    this.state.video.addEventListener('timeupdate', () => this.handleTimeUpdate());
    this.state.video.addEventListener('loadedmetadata', () => this.handleLoadedMetadata());
    this.state.video.addEventListener('ended', () => this.handleEnded());
    this.state.video.addEventListener('error', () => this.handleError());
    this.state.video.addEventListener('progress', () => this.handleProgress());
    this.state.video.addEventListener('play', () => this.handlePlay());
    this.state.video.addEventListener('pause', () => this.handlePause());
    this.state.video.addEventListener('fullscreenchange', () => this.handleFullscreenChange());
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback({ ...this.state }));
  }

  subscribe(callback: VideoEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  getState(): VideoPlayerState {
    return { ...this.state };
  }

  mount(container: HTMLElement): void {
    this.container = container;
    if (this.state.video && !container.contains(this.state.video)) {
      container.appendChild(this.state.video);
    }
  }

  unmount(): void {
    if (this.container && this.state.video) {
      this.container.removeChild(this.state.video);
    }
    this.container = null;
  }

  async load(videoFile: VideoFile): Promise<void> {
    if (!this.state.video) return;

    this.stop();
    this.state.currentVideo = videoFile;
    this.state.error = null;

    if (videoFile.externalUrl) {
      // External URL (YouTube, etc.) - would need special handling
      this.state.video.src = videoFile.externalUrl;
    } else {
      this.state.video.src = videoFile.path;
    }

    this.state.video.load();
    this.notifyListeners();
  }

  play(): void {
    if (this.state.video) {
      this.state.video.play().catch((err) => {
        this.state.error = err.message;
        this.notifyListeners();
      });
    }
  }

  pause(): void {
    if (this.state.video) {
      this.state.video.pause();
    }
  }

  stop(): void {
    if (this.state.video) {
      this.state.video.pause();
      this.state.video.currentTime = 0;
      this.state.playing = false;
      this.state.currentTime = 0;
      this.notifyListeners();
    }
  }

  seek(time: number): void {
    if (this.state.video) {
      this.state.video.currentTime = Math.max(0, Math.min(time, this.state.duration));
    }
  }

  setVolume(volume: number): void {
    if (this.state.video) {
      this.state.video.volume = Math.max(0, Math.min(1, volume));
      this.state.volume = this.state.video.volume;
      this.notifyListeners();
    }
  }

  setPlaybackRate(rate: number): void {
    if (this.state.video) {
      this.state.video.playbackRate = Math.max(0.25, Math.min(4, rate));
      this.state.playbackRate = this.state.video.playbackRate;
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

  toggleFullscreen(): void {
    if (!this.state.video) return;

    if (!this.state.fullscreen) {
      if (this.state.video.requestFullscreen) {
        this.state.video.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  toggleCaptions(): void {
    this.state.captions = !this.state.captions;
    if (this.state.video) {
      // Toggle track elements
      const tracks = this.state.video.textTracks;
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = this.state.captions ? 'showing' : 'hidden';
      }
    }
    this.notifyListeners();
  }

  addCaptionTrack(src: string, label: string, language: string, defaultTrack = false): void {
    if (!this.state.video) return;

    const track = document.createElement('track');
    track.kind = 'captions';
    track.src = src;
    track.srclang = language;
    track.label = label;
    track.default = defaultTrack;
    this.state.video.appendChild(track);
  }

  removeAllCaptionTracks(): void {
    if (!this.state.video) return;
    
    const tracks = this.state.video.querySelectorAll('track');
    tracks.forEach((track) => track.remove());
  }

  private handleTimeUpdate(): void {
    if (!this.state.video) return;
    this.state.currentTime = this.state.video.currentTime;
    this.notifyListeners();
  }

  private handleLoadedMetadata(): void {
    if (!this.state.video) return;
    this.state.duration = this.state.video.duration;
    this.notifyListeners();
  }

  private handleEnded(): void {
    this.state.playing = false;
    this.state.currentTime = 0;
    this.notifyListeners();
  }

  private handleError(): void {
    this.state.error = this.state.video?.error?.message || 'Unknown video error';
    this.state.playing = false;
    this.notifyListeners();
  }

  private handleProgress(): void {
    if (!this.state.video) return;
    const buffered = this.state.video.buffered;
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

  private handleFullscreenChange(): void {
    this.state.fullscreen = document.fullscreenElement === this.state.video;
    this.notifyListeners();
  }

  destroy(): void {
    this.stop();
    this.unmount();
    this.listeners.clear();
  }
}

export const videoService = new VideoService();

// React hook for video player
import { useState, useEffect, useCallback, useRef } from 'react';

export function useVideoPlayer() {
  const [state, setState] = useState<VideoPlayerState>(videoService.getState());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = videoService.subscribe(setState);
    
    if (containerRef.current) {
      videoService.mount(containerRef.current);
    }

    return () => {
      unsubscribe();
      videoService.unmount();
    };
  }, []);

  const load = useCallback(async (videoFile: VideoFile) => {
    await videoService.load(videoFile);
  }, []);

  const play = useCallback(() => videoService.play(), []);
  const pause = useCallback(() => videoService.pause(), []);
  const stop = useCallback(() => videoService.stop(), []);
  const togglePlayPause = useCallback(() => videoService.togglePlayPause(), []);
  const seek = useCallback((time: number) => videoService.seek(time), []);
  const setVolume = useCallback((volume: number) => videoService.setVolume(volume), []);
  const setPlaybackRate = useCallback((rate: number) => videoService.setPlaybackRate(rate), []);
  const skipForward = useCallback((seconds?: number) => videoService.skipForward(seconds), []);
  const skipBackward = useCallback((seconds?: number) => videoService.skipBackward(seconds), []);
  const toggleFullscreen = useCallback(() => videoService.toggleFullscreen(), []);
  const toggleCaptions = useCallback(() => videoService.toggleCaptions(), []);
  const addCaptionTrack = useCallback(
    (src: string, label: string, language: string, defaultTrack?: boolean) =>
      videoService.addCaptionTrack(src, label, language, defaultTrack),
    []
  );

  return {
    ...state,
    containerRef,
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
    toggleFullscreen,
    toggleCaptions,
    addCaptionTrack,
  };
}

// YouTube embed helper
export function getYouTubeEmbedUrl(videoId: string, options: {
  start?: number;
  end?: number;
  autoplay?: boolean;
  controls?: boolean;
  modestbranding?: boolean;
  rel?: boolean;
} = {}): string {
  const params = new URLSearchParams();
  if (options.start) params.set('start', options.start.toString());
  if (options.end) params.set('end', options.end.toString());
  if (options.autoplay) params.set('autoplay', '1');
  if (options.controls === false) params.set('controls', '0');
  if (options.modestbranding) params.set('modestbranding', '1');
  if (options.rel === false) params.set('rel', '0');
  
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function getYouTubeWatchUrl(videoId: string, start?: number): string {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  if (start) {
    return `${url}&t=${start}s`;
  }
  return url;
}

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}