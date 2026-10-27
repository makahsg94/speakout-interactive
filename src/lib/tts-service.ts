// Text-to-Speech Service using Web Speech API

import type { TTSOptions } from '@/types';

interface VoiceInfo {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  voiceURI: string;
}

class TTSService {
  private synthesis: SpeechSynthesis | null = null;
  private voices: VoiceInfo[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voicesLoaded = false;
  private voiceLoadPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  private async loadVoices(): Promise<void> {
    if (this.voicesLoaded) return;

    if (this.voiceLoadPromise) {
      return this.voiceLoadPromise;
    }

    this.voiceLoadPromise = new Promise((resolve) => {
      const loadVoicesList = () => {
        const availableVoices = this.synthesis!.getVoices();
        if (availableVoices.length > 0) {
          this.voices = availableVoices.map((v) => ({
            name: v.name,
            lang: v.lang,
            localService: v.localService,
            default: v.default,
            voiceURI: v.voiceURI,
          }));
          this.voicesLoaded = true;
          resolve();
        }
      };

      loadVoicesList();

      if (this.synthesis!.onvoiceschanged !== undefined) {
        this.synthesis!.onvoiceschanged = loadVoicesList;
      }
    });

    return this.voiceLoadPromise;
  }

  async getVoices(): Promise<VoiceInfo[]> {
    await this.loadVoices();
    return this.voices;
  }

  getEnglishVoices(): VoiceInfo[] {
    return this.voices.filter(
      (v) => v.lang.startsWith('en-') || v.lang.startsWith('en_')
    );
  }

  getBritishVoices(): VoiceInfo[] {
    return this.voices.filter((v) => v.lang === 'en-GB' || v.lang.startsWith('en-GB'));
  }

  getAmericanVoices(): VoiceInfo[] {
    return this.voices.filter((v) => v.lang === 'en-US' || v.lang.startsWith('en-US'));
  }

  getVoiceByLang(lang: string): VoiceInfo | undefined {
    return this.voices.find((v) => v.lang === lang || v.lang.startsWith(lang.split('-')[0]));
  }

  speak(options: TTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any current speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(options.text);
      utterance.lang = options.lang;
      utterance.rate = options.rate;
      utterance.pitch = options.pitch;
      utterance.volume = options.volume;

      if (options.voice) {
        utterance.voice = options.voice;
      } else {
        // Try to find a suitable English voice
        const preferredVoices = this.getEnglishVoices();
        if (preferredVoices.length > 0) {
          const voice = this.synthesis.getVoices().find(
            (v) => v.voiceURI === preferredVoices[0].voiceURI
          );
          if (voice) utterance.voice = voice;
        }
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  speakText(
    text: string,
    lang: 'en-GB' | 'en-US' = 'en-GB',
    rate = 1,
    pitch = 1,
    volume = 1
  ): Promise<void> {
    return this.speak({ text, lang, rate, pitch, volume });
  }

  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
      this.currentUtterance = null;
    }
  }

  pause(): void {
    if (this.synthesis) {
      this.synthesis.pause();
    }
  }

  resume(): void {
    if (this.synthesis) {
      this.synthesis.resume();
    }
  }

  isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }

  isPaused(): boolean {
    return this.synthesis?.paused ?? false;
  }

  getPendingUtterance(): SpeechSynthesisUtterance | null {
    return this.currentUtterance;
  }

  // Speak with word-by-word highlighting support
  speakWithHighlighting(
    text: string,
    onWordBoundary: (word: string, start: number, end: number) => void,
    lang: 'en-GB' | 'en-US' = 'en-GB',
    rate = 1
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;

      const englishVoices = this.getEnglishVoices();
      if (englishVoices.length > 0) {
        const voice = this.synthesis.getVoices().find(
          (v) => v.voiceURI === englishVoices[0].voiceURI
        );
        if (voice) utterance.voice = voice;
      }

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const word = text.substring(event.charIndex, event.charIndex + event.charLength);
          onWordBoundary(word, event.charIndex, event.charIndex + event.charLength);
        }
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event) => {
        this.currentUtterance = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  // Check if a specific voice is available
  isVoiceAvailable(lang: string): boolean {
    return this.voices.some((v) => v.lang === lang || v.lang.startsWith(lang.split('-')[0]));
  }

  // Get recommended voice for language
  getRecommendedVoice(lang: 'en-GB' | 'en-US'): VoiceInfo | null {
    const voices = lang === 'en-GB' ? this.getBritishVoices() : this.getAmericanVoices();
    
    // Prefer local, non-default voices for better quality
    const localVoices = voices.filter((v) => v.localService);
    if (localVoices.length > 0) return localVoices[0];
    if (voices.length > 0) return voices[0];
    return null;
  }
}

export const ttsService = new TTSService();

// React hook for TTS
import { useState, useCallback, useEffect } from 'react';

export function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceInfo | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [lang, setLang] = useState<'en-GB' | 'en-US'>('en-GB');

  useEffect(() => {
    ttsService.getVoices().then(setVoices);
  }, []);

  useEffect(() => {
    const savedVoice = localStorage.getItem('tts-voice');
    const savedLang = localStorage.getItem('tts-lang') as 'en-GB' | 'en-US' | null;
    const savedRate = parseFloat(localStorage.getItem('tts-rate') || '1');
    const savedPitch = parseFloat(localStorage.getItem('tts-pitch') || '1');
    const savedVolume = parseFloat(localStorage.getItem('tts-volume') || '1');

    if (savedVoice) {
      const voice = voices.find((v) => v.voiceURI === savedVoice);
      if (voice) setSelectedVoice(voice);
    }
    if (savedLang) setLang(savedLang);
    if (!isNaN(savedRate)) setRate(savedRate);
    if (!isNaN(savedPitch)) setPitch(savedPitch);
    if (!isNaN(savedVolume)) setVolume(savedVolume);
  }, [voices]);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      
      setSpeaking(true);
      setPaused(false);
      
      try {
        await ttsService.speak({
          text,
          lang,
          rate,
          pitch,
          volume,
          voice: selectedVoice ? 
            window.speechSynthesis.getVoices().find(v => v.voiceURI === selectedVoice.voiceURI) 
            : undefined,
        });
      } catch (error) {
        console.error('TTS error:', error);
      } finally {
        setSpeaking(false);
        setPaused(false);
      }
    },
    [lang, rate, pitch, volume, selectedVoice, voices]
  );

  const stop = useCallback(() => {
    ttsService.stop();
    setSpeaking(false);
    setPaused(false);
  }, []);

  const pause = useCallback(() => {
    ttsService.pause();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    ttsService.resume();
    setPaused(false);
  }, []);

  const updateVoice = useCallback((voice: VoiceInfo) => {
    setSelectedVoice(voice);
    localStorage.setItem('tts-voice', voice.voiceURI);
  }, []);

  const updateLang = useCallback((newLang: 'en-GB' | 'en-US') => {
    setLang(newLang);
    localStorage.setItem('tts-lang', newLang);
  }, []);

  const updateRate = useCallback((newRate: number) => {
    setRate(newRate);
    localStorage.setItem('tts-rate', newRate.toString());
  }, []);

  const updatePitch = useCallback((newPitch: number) => {
    setPitch(newPitch);
    localStorage.setItem('tts-pitch', newPitch.toString());
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem('tts-volume', newVolume.toString());
  }, []);

  return {
    speak,
    stop,
    pause,
    resume,
    speaking,
    paused,
    voices,
    selectedVoice,
    rate,
    pitch,
    volume,
    lang,
    updateVoice,
    updateLang,
    updateRate,
    updatePitch,
    updateVolume,
  };
}

// Utility to speak selected text
export async function speakSelection(
  lang: 'en-GB' | 'en-US' = 'en-GB',
  rate = 1
): Promise<void> {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  
  const text = selection.toString().trim();
  if (!text) return;
  
  await ttsService.speakText(text, lang, rate);
}