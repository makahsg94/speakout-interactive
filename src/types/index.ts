// Core data models for Speakout Interactive Learning Platform

export interface Course {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  edition: BookEdition;
  createdAt: number;
  updatedAt: number;
}

export interface BookEdition {
  id: string;
  courseId: string;
  title: string;
  year: number;
  level: string;
  pdfPath: string;
  totalPages: number;
  units: Unit[];
  audioManifest: AudioManifest;
  videoManifest: VideoManifest;
  grammarTopics: GrammarTopic[];
}

export interface Unit {
  id: string;
  editionId: string;
  number: number;
  title: string;
  description: string;
  startPage: number;
  endPage: number;
  lessons: Lesson[];
  grammarTopics: string[]; // grammar topic IDs
  vocabulary: VocabularyItem[];
}

export interface Lesson {
  id: string;
  unitId: string;
  number: number;
  title: string;
  type: 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing' | 'review';
  startPage: number;
  endPage: number;
  exercises: Exercise[];
  audioIds: string[];
  videoIds: string[];
}

export interface Page {
  id: string;
  editionId: string;
  number: number;
  unitId?: string;
  lessonId?: string;
  annotations: PageAnnotation[];
  textContent?: string; // Extracted text for search
  thumbnailPath?: string;
}

export interface PageAnnotation {
  id: string;
  pageId: string;
  type: 'audio' | 'video' | 'exercise' | 'grammar' | 'vocabulary' | 'translation' | 'note';
  bounds: BoundingBox; // Normalized coordinates (0-1)
  resourceId: string; // Links to audio, video, exercise, etc.
  label?: string;
  data?: Record<string, unknown>;
}

export interface BoundingBox {
  x: number; // 0-1 relative to page width
  y: number; // 0-1 relative to page height
  width: number; // 0-1
  height: number; // 0-1
}

export interface Exercise {
  id: string;
  lessonId: string;
  pageId: string;
  number: string; // e.g., "1A", "2B", "3"
  type: ExerciseType;
  title: string;
  instructions: string;
  content: ExerciseContent;
  answerKey?: ExerciseAnswerKey;
  order: number;
}

export type ExerciseType = 
  | 'multiple-choice'
  | 'true-false'
  | 'fill-blanks'
  | 'matching'
  | 'drag-drop-order'
  | 'sentence-order'
  | 'word-order'
  | 'gap-fill'
  | 'grammar-transform'
  | 'vocabulary'
  | 'reading-comprehension'
  | 'listening-comprehension'
  | 'short-answer'
  | 'writing'
  | 'speaking';

export interface ExerciseContent {
  questions: ExerciseQuestion[];
  media?: {
    audioId?: string;
    videoId?: string;
    transcript?: string;
  };
}

export interface ExerciseQuestion {
  id: string;
  text: string;
  type: ExerciseType;
  options?: string[]; // For multiple choice, matching
  correctAnswer?: string | string[] | Record<string, string>;
  blanks?: number; // For fill-in-blanks
  dragItems?: DragItem[]; // For drag-drop
  wordBank?: string[]; // For word ordering
  readingText?: string; // For comprehension
}

export interface DragItem {
  id: string;
  text: string;
  group?: string; // For matching groups
}

export interface ExerciseAnswerKey {
  answers: Record<string, string | string[] | Record<string, string>>;
  explanations?: Record<string, string>;
  source: 'official' | 'ai-generated' | 'teacher';
  verified: boolean;
}

export interface AudioFile {
  id: string;
  editionId: string;
  unitId: string;
  lessonId?: string;
  pageId?: string;
  exerciseId?: string;
  title: string;
  filename: string;
  path: string;
  duration?: number; // seconds
  type: 'dialogue' | 'vocabulary' | 'pronunciation' | 'listening' | 'review' | 'grammar' | 'other';
  transcriptId?: string;
}

export interface AudioManifest {
  files: AudioFile[];
  transcripts: Transcript[];
}

export interface Transcript {
  id: string;
  audioId: string;
  text: string;
  language: string;
  segments?: TranscriptSegment[]; // With timestamps
}

export interface TranscriptSegment {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  speaker?: string;
}

export interface VideoFile {
  id: string;
  editionId: string;
  unitId: string;
  lessonId?: string;
  pageId?: string;
  exerciseId?: string;
  title: string;
  filename: string;
  path: string;
  duration?: number; // seconds
  type: 'bbc-programme' | 'bbc-vlog' | 'street-interview' | 'other';
  thumbnailPath?: string;
  transcriptId?: string;
  externalUrl?: string; // YouTube, etc.
  embeddable: boolean;
}

export interface VideoManifest {
  files: VideoFile[];
}

export interface GrammarTopic {
  id: string;
  editionId: string;
  unitId?: string;
  lessonId?: string;
  pageId?: string;
  name: string;
  description: string;
  explanationAr: string;
  explanationEn?: string;
  examples: GrammarExample[];
  commonMistakes: string[];
  relatedExercises: string[]; // exercise IDs
  videoResources: GrammarVideoResource[];
  order: number;
  completed: boolean;
}

export interface GrammarExample {
  id: string;
  english: string;
  arabic: string;
  audioId?: string;
}

export interface GrammarVideoResource {
  id: string;
  topicId: string;
  title: string;
  channel: string;
  youtubeId?: string;
  url?: string;
  duration?: number;
  language: 'ar' | 'en';
  level: 'beginner' | 'intermediate' | 'advanced';
  verified: boolean;
  lastChecked?: number;
}

export interface VocabularyItem {
  id: string;
  editionId: string;
  unitId?: string;
  lessonId?: string;
  pageId?: string;
  word: string;
  translation: string; // Arabic
  partOfSpeech?: string;
  pronunciation?: string; // IPA
  audioId?: string;
  contextSentence?: string;
  contextTranslation?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  frequency: number;
}

export interface SavedVocabulary {
  id: string;
  userId: string;
  vocabularyId: string;
  word: string;
  translation: string;
  partOfSpeech?: string;
  pronunciation?: string;
  audioId?: string;
  contextSentence?: string;
  contextTranslation?: string;
  sourcePage: number;
  sourceUnit: string;
  sourceEdition: string;
  dateSaved: number;
  status: 'new' | 'learning' | 'known' | 'mastered';
  reviewCount: number;
  correctCount: number;
  lastReviewed: number;
  nextReview: number;
  interval: number; // days
  easeFactor: number;
  notes?: string;
}

export interface UserProgress {
  userId: string;
  editionId: string;
  currentUnit: string;
  currentPage: number;
  completedUnits: string[];
  completedLessons: string[];
  completedExercises: ExerciseAttempt[];
  vocabularyStats: {
    totalSaved: number;
    dueForReview: number;
    mastered: number;
  };
  grammarStats: {
    studied: number;
    completed: number;
  };
  listeningStats: {
    completed: number;
    totalDuration: number;
  };
  lastActive: number;
  streak: number;
}

export interface ExerciseAttempt {
  exerciseId: string;
  attempts: number;
  correct: boolean;
  answers: Record<string, string | string[] | Record<string, string>>;
  timeSpent: number; // seconds
  completedAt: number;
  score: number; // 0-100
}

export interface ReviewSession {
  id: string;
  userId: string;
  items: ReviewItem[];
  startedAt: number;
  completedAt?: number;
  correctCount: number;
  totalCount: number;
}

export interface ReviewItem {
  vocabularyId: string;
  type: 'meaning-recall' | 'word-recall' | 'listening' | 'sentence-complete' | 'multiple-choice';
  question: string;
  answer: string;
  userAnswer?: string;
  correct?: boolean;
  difficulty: 'easy' | 'good' | 'hard' | 'again';
  answeredAt?: number;
}

export interface TranslationResult {
  word: string;
  translation: string;
  partOfSpeech?: string;
  pronunciation?: string;
  audioUrl?: string;
  audioId?: string;
  alternatives?: string[];
  contextTranslation?: string;
  contextSentence?: string;
  exampleSentences?: { en: string; ar: string }[];
  source: 'local' | 'dictionary' | 'ai' | 'unavailable';
  cached: boolean;
}

export interface TTSOptions {
  text: string;
  lang: 'en-GB' | 'en-US' | string;
  rate: number;
  pitch: number;
  volume: number;
  voice?: SpeechSynthesisVoice;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ar';
  tts: {
    preferredVoice: 'en-GB' | 'en-US' | 'auto';
    rate: number;
    pitch: number;
    volume: number;
  };
  pdf: {
    defaultZoom: number;
    scrollMode: 'continuous' | 'page';
    showPageNumbers: boolean;
  };
  ui: {
    sidebarCollapsed: boolean;
    rightPanelCollapsed: boolean;
    showAnnotations: boolean;
  };
  translation: {
    provider: 'local' | 'dictionary' | 'ai';
    apiKey?: string;
    cacheEnabled: boolean;
  };
  offline: {
    enabled: boolean;
    cacheAudio: boolean;
    cacheVideo: boolean;
  };
}

// UI State types
export interface ViewportState {
  page: number;
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  scrollMode: 'continuous' | 'page';
  offsetX: number;
  offsetY: number;
}

export interface SelectionState {
  text: string;
  rect: DOMRect | null;
  pageNumber: number;
  timestamp: number;
}

export interface PopupState {
  visible: boolean;
  x: number;
  y: number;
  content: TranslationResult | null;
  type: 'translation' | 'audio' | 'exercise' | 'grammar' | 'vocabulary';
  anchorRect?: DOMRect;
}

export interface AudioPlayerState {
  currentAudio: AudioFile | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  transcript: Transcript | null;
  showTranscript: boolean;
}

export interface VideoPlayerState {
  currentVideo: VideoFile | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  fullscreen: boolean;
  captions: boolean;
}

// Manifest for importing content
export interface ContentManifest {
  version: string;
  edition: BookEdition;
  pages: Page[];
  annotations: PageAnnotation[];
  exercises: Exercise[];
  audio: AudioFile[];
  video: VideoFile[];
  grammar: GrammarTopic[];
  vocabulary: VocabularyItem[];
  transcripts: Transcript[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  missingFiles: string[];
}

export interface ValidationError {
  resourceType: string;
  resourceId: string;
  field: string;
  message: string;
}

export interface ValidationWarning {
  resourceType: string;
  resourceId: string;
  field: string;
  message: string;
}

// Search types
export interface SearchResult {
  pageId: string;
  pageNumber: number;
  context: string;
  matchPosition: number;
  highlights: { start: number; end: number }[];
}

export interface BookmarkItem {
  id: string;
  userId: string;
  pageId: string;
  pageNumber: number;
  title: string;
  note?: string;
  createdAt: number;
}