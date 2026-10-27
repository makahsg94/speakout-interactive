import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppSettings,
  UserProgress,
  SavedVocabulary,
  ViewportState,
  SelectionState,
  PopupState,
  AudioPlayerState,
  VideoPlayerState,
  ExerciseAttempt,
  ReviewSession,
  BookmarkItem,
} from '@/types';

interface UIState {
  // Layout
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  fullscreen: boolean;
  
  // Viewport
  viewport: ViewportState;
  
  // Selection & Popups
  selection: SelectionState | null;
  popup: PopupState;
  
  // Audio/Video Players
  audioPlayer: AudioPlayerState;
  videoPlayer: VideoPlayerState;
  
  // Current context
  currentEditionId: string | null;
  currentUnitId: string | null;
  currentLessonId: string | null;
  currentPage: number;
  
  // Search
  searchQuery: string;
  searchResults: Array<{ page: number; context: string }>;
  searchActive: boolean;
  
  // Actions
  setSidebarOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  setFullscreen: (fullscreen: boolean) => void;
  setViewport: (viewport: Partial<ViewState>) => void;
  setSelection: (selection: SelectionState | null) => void;
  setPopup: (popup: Partial<PopupState>) => void;
  closePopup: () => void;
  setAudioPlayer: (player: Partial<AudioPlayerState>) => void;
  setVideoPlayer: (player: Partial<VideoPlayerState>) => void;
  setCurrentContext: (context: { editionId?: string; unitId?: string; lessonId?: string; page?: number }) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Array<{ page: number; context: string }>) => void;
  setSearchActive: (active: boolean) => void;
}

type ViewState = ViewportState;

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Initial state
      sidebarOpen: true,
      rightPanelOpen: false,
      sidebarCollapsed: false,
      rightPanelCollapsed: false,
      fullscreen: false,
      viewport: {
        page: 1,
        zoom: 1,
        rotation: 0,
        scrollMode: 'continuous',
        offsetX: 0,
        offsetY: 0,
      },
      selection: null,
      popup: {
        visible: false,
        x: 0,
        y: 0,
        content: null,
        type: 'translation',
      },
      audioPlayer: {
        currentAudio: null,
        playing: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
        transcript: null,
        showTranscript: false,
      },
      videoPlayer: {
        currentVideo: null,
        playing: false,
        currentTime: 0,
        duration: 0,
        volume: 1,
        playbackRate: 1,
        fullscreen: false,
        captions: false,
      },
      currentEditionId: null,
      currentUnitId: null,
      currentLessonId: null,
      currentPage: 1,
      searchQuery: '',
      searchResults: [],
      searchActive: false,
      
      // Actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),
      setFullscreen: (fullscreen) => set({ fullscreen }),
      setViewport: (viewport) => set((state) => ({ viewport: { ...state.viewport, ...viewport } })),
      setSelection: (selection) => set({ selection }),
      setPopup: (popup) => set((state) => ({ popup: { ...state.popup, ...popup } })),
      closePopup: () => set({ popup: { ...get().popup, visible: false } }),
      setAudioPlayer: (player) => set((state) => ({ audioPlayer: { ...state.audioPlayer, ...player } })),
      setVideoPlayer: (player) => set((state) => ({ videoPlayer: { ...state.videoPlayer, ...player } })),
      setCurrentContext: (context) => set((state) => ({
        currentEditionId: context.editionId ?? state.currentEditionId,
        currentUnitId: context.unitId ?? state.currentUnitId,
        currentLessonId: context.lessonId ?? state.currentLessonId,
        currentPage: context.page ?? state.currentPage,
      })),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),
      setSearchActive: (active) => set({ searchActive: active }),
    }),
    {
      name: 'speakout-ui-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelCollapsed: state.rightPanelCollapsed,
        viewport: state.viewport,
        fullscreen: state.fullscreen,
      }),
    }
  )
);

// Settings Store
interface SettingsState {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'system',
  language: 'en',
  tts: {
    preferredVoice: 'auto',
    rate: 1,
    pitch: 1,
    volume: 1,
  },
  pdf: {
    defaultZoom: 1,
    scrollMode: 'continuous',
    showPageNumbers: true,
  },
  ui: {
    sidebarCollapsed: false,
    rightPanelCollapsed: false,
    showAnnotations: true,
  },
  translation: {
    provider: 'local',
    cacheEnabled: true,
  },
  offline: {
    enabled: false,
    cacheAudio: false,
    cacheVideo: false,
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: 'speakout-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// User Progress Store
interface ProgressState {
  progress: UserProgress | null;
  vocabulary: SavedVocabulary[];
  bookmarks: BookmarkItem[];
  reviewSessions: ReviewSession[];
  exerciseAttempts: ExerciseAttempt[];
  
  // Actions
  setProgress: (progress: UserProgress) => void;
  updateProgress: (updates: Partial<UserProgress>) => void;
  addVocabulary: (vocab: SavedVocabulary) => void;
  updateVocabulary: (id: string, updates: Partial<SavedVocabulary>) => void;
  removeVocabulary: (id: string) => void;
  getVocabulary: (id: string) => SavedVocabulary | undefined;
  getVocabularyByWord: (word: string, editionId: string) => SavedVocabulary | undefined;
  getVocabularyForReview: (limit?: number) => SavedVocabulary[];
  addBookmark: (bookmark: BookmarkItem) => void;
  removeBookmark: (id: string) => void;
  addExerciseAttempt: (attempt: ExerciseAttempt) => void;
  getExerciseAttempts: (exerciseId: string) => ExerciseAttempt[];
  addReviewSession: (session: ReviewSession) => void;
  updateReviewSession: (id: string, updates: Partial<ReviewSession>) => void;
  clearAllData: () => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      progress: null,
      vocabulary: [],
      bookmarks: [],
      reviewSessions: [],
      exerciseAttempts: [],
      
      setProgress: (progress) => set({ progress }),
      updateProgress: (updates) =>
        set((state) => ({
          progress: state.progress ? { ...state.progress, ...updates } : null,
        })),
      addVocabulary: (vocab) =>
        set((state) => ({
          vocabulary: [...state.vocabulary, vocab],
        })),
      updateVocabulary: (id, updates) =>
        set((state) => ({
          vocabulary: state.vocabulary.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),
      removeVocabulary: (id) =>
        set((state) => ({
          vocabulary: state.vocabulary.filter((v) => v.id !== id),
        })),
      getVocabulary: (id) => get().vocabulary.find((v) => v.id === id),
      getVocabularyByWord: (word, editionId) =>
        get().vocabulary.find((v) => v.word.toLowerCase() === word.toLowerCase() && v.sourceEdition === editionId),
      getVocabularyForReview: (limit = 20) => {
        const now = Date.now();
        return get()
          .vocabulary
          .filter((v) => v.nextReview <= now && v.status !== 'mastered')
          .sort((a, b) => a.nextReview - b.nextReview)
          .slice(0, limit);
      },
      addBookmark: (bookmark) =>
        set((state) => ({
          bookmarks: [...state.bookmarks, bookmark],
        })),
      removeBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),
      addExerciseAttempt: (attempt) =>
        set((state) => ({
          exerciseAttempts: [...state.exerciseAttempts, attempt],
        })),
      getExerciseAttempts: (exerciseId) =>
        get().exerciseAttempts.filter((a) => a.exerciseId === exerciseId),
      addReviewSession: (session) =>
        set((state) => ({
          reviewSessions: [...state.reviewSessions, session],
        })),
      updateReviewSession: (id, updates) =>
        set((state) => ({
          reviewSessions: state.reviewSessions.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),
      clearAllData: () =>
        set({
          progress: null,
          vocabulary: [],
          bookmarks: [],
          reviewSessions: [],
          exerciseAttempts: [],
        }),
    }),
    {
      name: 'speakout-progress',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Content Store (for loaded book data)
interface ContentState {
  editions: Record<string, any>;
  pages: Record<string, any>;
  annotations: Record<string, any[]>;
  exercises: Record<string, any>;
  audioFiles: Record<string, any>;
  videoFiles: Record<string, any>;
  grammarTopics: Record<string, any>;
  vocabulary: Record<string, any>;
  transcripts: Record<string, any>;
  searchIndex: Record<string, string>;
  
  setEdition: (edition: any) => void;
  setPages: (pages: any[]) => void;
  setAnnotations: (pageId: string, annotations: any[]) => void;
  setExercises: (exercises: any[]) => void;
  setAudioFiles: (files: any[]) => void;
  setVideoFiles: (files: any[]) => void;
  setGrammarTopics: (topics: any[]) => void;
  setVocabulary: (vocab: any[]) => void;
  setTranscripts: (transcripts: any[]) => void;
  setSearchIndex: (index: Record<string, string>) => void;
  getAnnotationsForPage: (pageId: string) => any[];
  getExercisesForPage: (pageId: string) => any[];
  getAudioForPage: (pageId: string) => any[];
  getVideoForPage: (pageId: string) => any[];
}

export const useContentStore = create<ContentState>((set, get) => ({
  editions: {},
  pages: {},
  annotations: {},
  exercises: {},
  audioFiles: {},
  videoFiles: {},
  grammarTopics: {},
  vocabulary: {},
  transcripts: {},
  searchIndex: {},
  
  setEdition: (edition) => set((state) => ({ editions: { ...state.editions, [edition.id]: edition } })),
  setPages: (pages) => set((state) => {
    const newPages = { ...state.pages };
    pages.forEach((p) => { newPages[p.id] = p; });
    return { pages: newPages };
  }),
  setAnnotations: (pageId, annotations) => set((state) => ({ annotations: { ...state.annotations, [pageId]: annotations } })),
  setExercises: (exercises) => set((state) => {
    const newExercises = { ...state.exercises };
    exercises.forEach((e) => { newExercises[e.id] = e; });
    return { exercises: newExercises };
  }),
  setAudioFiles: (files) => set((state) => {
    const newFiles = { ...state.audioFiles };
    files.forEach((f) => { newFiles[f.id] = f; });
    return { audioFiles: newFiles };
  }),
  setVideoFiles: (files) => set((state) => {
    const newFiles = { ...state.videoFiles };
    files.forEach((f) => { newFiles[f.id] = f; });
    return { videoFiles: newFiles };
  }),
  setGrammarTopics: (topics) => set((state) => {
    const newTopics = { ...state.grammarTopics };
    topics.forEach((t) => { newTopics[t.id] = t; });
    return { grammarTopics: newTopics };
  }),
  setVocabulary: (vocab) => set((state) => {
    const newVocab = { ...state.vocabulary };
    vocab.forEach((v) => { newVocab[v.id] = v; });
    return { vocabulary: newVocab };
  }),
  setTranscripts: (transcripts) => set((state) => {
    const newTranscripts = { ...state.transcripts };
    transcripts.forEach((t) => { newTranscripts[t.id] = t; });
    return { transcripts: newTranscripts };
  }),
  setSearchIndex: (index) => set({ searchIndex: index }),
  getAnnotationsForPage: (pageId) => get().annotations[pageId] || [],
  getExercisesForPage: (pageId) => Object.values(get().exercises).filter((e: any) => e.pageId === pageId),
  getAudioForPage: (pageId) => Object.values(get().audioFiles).filter((a: any) => a.pageId === pageId),
  getVideoForPage: (pageId) => Object.values(get().videoFiles).filter((v: any) => v.pageId === pageId),
}));

// Translation Cache Store
interface TranslationCacheState {
  cache: Record<string, any>;
  get: (key: string) => any;
  set: (key: string, value: any) => void;
  has: (key: string) => boolean;
  clear: () => void;
}

export const useTranslationCache = create<TranslationCacheState>()(
  persist(
    (set, get) => ({
      cache: {},
      get: (key) => get().cache[key],
      set: (key, value) => set((state) => ({ cache: { ...state.cache, [key]: value } })),
      has: (key) => key in get().cache,
      clear: () => set({ cache: {} }),
    }),
    {
      name: 'speakout-translation-cache',
      storage: createJSONStorage(() => localStorage),
    }
  )
);