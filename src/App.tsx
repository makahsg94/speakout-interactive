// Main App Component

import React, { useState, useEffect, useCallback } from 'react';
import { PDFViewer } from './components/PDFViewer';
import { Sidebar } from './components/Sidebar';
import { RightPanel } from './components/RightPanel';
import { TranslationPopup } from './components/TranslationPopup';
import { useUIStore, useSettingsStore, useProgressStore, useContentStore } from '@/stores';
import { pdfService } from '@/lib/pdf-service';
import { translationService } from '@/lib/translation-service';
import { ttsService } from '@/lib/tts-service';
import { audioService, useAudioPlayer } from '@/lib/audio-service';
import { videoService } from '@/lib/video-service';
import { Menu, X, ChevronLeft, ChevronRight, Play, Pause, Volume2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';
import type { Unit, Lesson, AudioFile, VideoFile, Exercise } from '@/types';
import { audioFiles as realAudioFiles, videoFiles as realVideoFiles } from '@/assets/media-manifest';
import { pdfManifest } from '@/assets/pdf-extracted/pdf-manifest';

export function App() {
  const { 
    sidebarOpen, 
    setSidebarOpen, 
    rightPanelOpen, 
    setRightPanelOpen,
    viewport,
    setViewport,
    selection,
    setSelection,
    popup,
    setPopup,
    closePopup,
    currentEditionId,
    currentUnitId,
    currentLessonId,
    currentPage,
    setCurrentContext,
    fullscreen,
  } = useUIStore();

  const { settings, updateSettings } = useSettingsStore();
  const { progress, setProgress, updateProgress } = useProgressStore();
  const { setEdition, setPages, setAnnotations, setExercises, setAudioFiles, setVideoFiles, setGrammarTopics, setVocabulary } = useContentStore();
  const audioPlayer = useAudioPlayer();

  const [initialized, setInitialized] = useState(false);
  const [editionId] = useState('speakout-b1p-3rd');
  const [pdfUrl] = useState('/speakout-b1p.pdf');

  // Initialize services and load content
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize services
        await translationService.initialize();
        await ttsService.getVoices();
        
        // Page count is known; PDF is displayed via pre-rendered page images
        const doc = { numPages: 136 };
        
        // Load real audio and video files
        const rawAudioFiles = realAudioFiles as AudioFile[];
        const rawVideoFiles = realVideoFiles as VideoFile[];

        // Link media files to their lesson's start page so the right panel can show them
        const lessonStartPage = new Map<string, number>();
        const unitStartPage = new Map<string, number>();
        // filled after units are created; use pdfManifest ranges via mockEdition later
        // We'll populate after createMockUnits
        const mockUnitsForMedia = createMockUnits(doc.numPages);
        mockUnitsForMedia.forEach((u: Unit) => {
          unitStartPage.set(u.id, u.startPage);
          u.lessons.forEach((l: Lesson) => {
            lessonStartPage.set(l.id, l.startPage);
          });
        });

        const baseUrl = import.meta.env.BASE_URL?.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL || '/'}`
        const toAssetUrl = (p: string) => {
          if (/^https?:\/\//.test(p)) return p
          const clean = p.startsWith('/') ? p.slice(1) : p
          return `${baseUrl}${clean}`
        }

        const audioFiles = rawAudioFiles.map((a) => ({
          ...a,
          path: toAssetUrl(a.path),
          pageId: a.pageId || (a.lessonId ? `page-${lessonStartPage.get(a.lessonId) ?? unitStartPage.get(a.unitId) ?? 1}` : a.pageId),
        })) as AudioFile[];

        const videoFiles = rawVideoFiles.map((v) => ({
          ...v,
          path: toAssetUrl(v.path),
          pageId: v.pageId || (v.lessonId ? `page-${lessonStartPage.get(v.lessonId) ?? unitStartPage.get(v.unitId) ?? 1}` : v.pageId),
        })) as VideoFile[];
        
        // Create mock edition data (in real app, this would come from a manifest)
        const mockEdition = {
          id: editionId,
          courseId: 'speakout',
          title: 'Speakout 3rd Edition B1+',
          year: 2022,
          level: 'B1+',
          pdfPath: pdfUrl,
          totalPages: doc.numPages,
          units: createMockUnits(doc.numPages),
          audioManifest: { files: audioFiles, transcripts: [] },
          videoManifest: { files: videoFiles },
          grammarTopics: createMockGrammarTopics(),
        };

        const mockPages = Array.from({ length: doc.numPages }, (_, i) => ({
          id: `page-${i + 1}`,
          editionId,
          number: i + 1,
          annotations: [],
        }));

        const mockAnnotations = createMockAnnotations(doc.numPages);
        const baseExercises = createMockExercises();
        const generatedExercises: Exercise[] = mockUnitsForMedia.flatMap((u: Unit) =>
          u.lessons.map((l: Lesson) => ({
            id: `ex-${l.id}`,
            lessonId: l.id,
            pageId: `page-${l.startPage}`,
            number: 'T1',
            type: 'multiple-choice' as const,
            title: `Test: ${l.title}`,
            instructions: 'Answer the questions for this lesson.',
            content: {
              questions: [
                {
                  id: 'q1',
                  text: `Which lesson is this? ${l.title}`,
                  type: 'multiple-choice' as const,
                  options: [l.title, 'Other lesson', 'Review'],
                  correctAnswer: l.title,
                },
              ],
            },
            answerKey: {
              answers: { q1: l.title },
              source: 'teacher' as const,
              verified: false,
            },
            order: 1,
          }))
        );
        const mockExercises = [...baseExercises, ...generatedExercises];
        const mockVocabulary = createMockVocabulary();
        setEdition(mockEdition);
        setPages(mockPages);
        Object.entries(mockAnnotations).forEach(([pageId, anns]) => setAnnotations(pageId, anns as any[]));
        setExercises(mockExercises);
        setAudioFiles(audioFiles);
        setVideoFiles(videoFiles);
        setGrammarTopics(mockEdition.grammarTopics);
        setVocabulary(mockVocabulary);
        setCurrentContext({ editionId, unitId: 'unit-1', page: 1 });

        // Initialize progress
        if (!progress) {
          setProgress({
            userId: 'user',
            editionId,
            currentUnit: 'unit-1',
            currentPage: 1,
            completedUnits: [],
            completedLessons: [],
            completedExercises: [],
            vocabularyStats: { totalSaved: 0, dueForReview: 0, mastered: 0 },
            grammarStats: { studied: 0, completed: 0 },
            listeningStats: { completed: 0, totalDuration: 0 },
            lastActive: Date.now(),
            streak: 0,
          });
        }

        setInitialized(true);
      } catch (error) {
        console.error('Initialization failed:', error);
        setInitialized(true); // Still show UI even if init fails
      }
    };

    init();
  }, [pdfUrl, editionId, progress, setProgress, setEdition, setPages, setAnnotations, setExercises, setAudioFiles, setVideoFiles, setGrammarTopics, setVocabulary]);

  // Handle text selection for translation
  const handleTextSelect = useCallback(async (text: string, rect: DOMRect, pageNumber: number) => {
    if (!text.trim()) return;

    setSelection({ text, rect, pageNumber, timestamp: Date.now() });

    try {
      const result = await translationService.translate(text);
      
      if (result.source !== 'unavailable') {
        setPopup({
          visible: true,
          x: rect.left,
          y: rect.bottom + 8,
          content: result,
          type: 'translation',
          anchorRect: rect,
        });
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  }, [setSelection, setPopup]);

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: any) => {
    if (annotation.type === 'audio') {
      setRightPanelOpen(true);
      // Would switch to audio tab
    } else if (annotation.type === 'video') {
      setRightPanelOpen(true);
      // Would switch to video tab
    } else if (annotation.type === 'exercise') {
      setRightPanelOpen(true);
      // Would switch to exercise tab
    } else if (annotation.type === 'vocabulary') {
      // Show translation popup
      if (annotation.data?.word) {
        setPopup({
          visible: true,
          x: annotation.bounds.x * window.innerWidth,
          y: annotation.bounds.y * window.innerHeight,
          content: {
            word: annotation.data.word,
            translation: annotation.data.translation || '',
            partOfSpeech: annotation.data.partOfSpeech,
            pronunciation: annotation.data.pronunciation,
            audioId: annotation.data.audioId,
            source: 'local',
            cached: false,
          },
          type: 'translation',
        });
      }
    }
  }, [setRightPanelOpen, setPopup]);

  // Handle unit/lesson/page navigation
  const handleUnitSelect = useCallback((unitId: string) => {
    const edition = useContentStore.getState().editions[editionId];
    const unit = edition?.units?.find((u: Unit) => u.id === unitId);
    if (unit?.startPage) {
      setViewport({ page: unit.startPage });
      setCurrentContext({ unitId, page: unit.startPage });
    } else {
      setCurrentContext({ unitId });
    }
    setRightPanelOpen(false);
  }, [editionId, setViewport, setCurrentContext, setRightPanelOpen]);

  const handleLessonSelect = useCallback((lessonId: string) => {
    const edition = useContentStore.getState().editions[editionId];
    let targetPage: number | undefined;
    for (const unit of edition?.units || []) {
      const lesson = unit.lessons?.find((l: Lesson) => l.id === lessonId);
      if (lesson?.startPage) {
        targetPage = lesson.startPage;
        break;
      }
    }
    if (targetPage) {
      setViewport({ page: targetPage });
      setCurrentContext({ lessonId, page: targetPage });
    } else {
      setCurrentContext({ lessonId });
    }
    setRightPanelOpen(false);
  }, [editionId, setViewport, setCurrentContext, setRightPanelOpen]);

  const handlePageSelect = useCallback((page: number) => {
    setViewport({ page });
    setCurrentContext({ page });
  }, [setViewport, setCurrentContext]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-neutral-600 text-lg">Loading Speakout Interactive...</p>
          <p className="text-sm text-neutral-400 mt-2">Initializing services and loading content</p>
        </div>
      </div>
    );
  }

  const edition = useContentStore.getState().editions[editionId];
  const currentUnit = edition?.units?.find((u: Unit) => u.id === currentUnitId);
  const currentLesson = currentUnit?.lessons?.find((l: Lesson) => l.id === currentLessonId);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Top Bar (Mobile) */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-neutral-200">
        <div className="flex items-center justify-between h-14 px-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-ghost p-2"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center">
            <h1 className="font-semibold text-neutral-900 truncate">Speakout Interactive</h1>
            <p className="text-xs text-neutral-500">
              {currentUnit ? `Unit ${currentUnit.number}: ${currentUnit.title}` : 'Select a unit'}
            </p>
          </div>
          <button
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
            className="btn-ghost p-2"
            aria-label={rightPanelOpen ? 'Close panel' : 'Open panel'}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 lg:pt-0 pt-14">
        {/* Mobile Sidebar Overlay */}
        <div
          className={`${sidebarOpen ? 'block' : 'hidden'} fixed inset-0 z-40 lg:hidden`}
          onClick={() => setSidebarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <Sidebar
            editionId={editionId}
            onUnitSelect={handleUnitSelect}
            onLessonSelect={handleLessonSelect}
            onPageSelect={handlePageSelect}
          />
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <Sidebar
            editionId={editionId}
            onUnitSelect={handleUnitSelect}
            onLessonSelect={handleLessonSelect}
            onPageSelect={handlePageSelect}
          />
        </aside>

        {/* Center - PDF Viewer */}
        <main className="flex-1 flex flex-col min-w-0">
          <PDFViewer
            pdfUrl={pdfUrl}
            annotations={useContentStore.getState().annotations[`page-${currentPage}`] || []}
            onPageChange={(page) => {
              setViewport({ page });
              setCurrentContext({ page });
              updateProgress({ currentPage: page, lastActive: Date.now() });
            }}
            onAnnotationClick={handleAnnotationClick}
            onTextSelect={handleTextSelect}
            className="flex-1"
          />
        </main>

        {/* Right Panel */}
        <aside className="hidden lg:block">
          <RightPanel
            editionId={editionId}
            pageId={`page-${currentPage}`}
            onClose={() => setRightPanelOpen(false)}
          />
        </aside>

        {/* Mobile Right Panel Overlay */}
        <div
          className={`${rightPanelOpen ? 'block' : 'hidden'} fixed inset-0 z-40 lg:hidden`}
          onClick={() => setRightPanelOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <RightPanel
            editionId={editionId}
            pageId={`page-${currentPage}`}
            onClose={() => setRightPanelOpen(false)}
          />
        </div>
      </div>

      {/* Translation Popup */}
      <TranslationPopup
        visible={popup.visible}
        x={popup.x}
        y={popup.y}
        content={popup.content}
        onClose={closePopup}
        onSaveVocabulary={(word, translation) => {
          // Handled in popup component
        }}
        anchorRect={popup.anchorRect}
      />

      {/* Floating Audio Player */}
      {audioPlayer.currentAudio && (
        <div className="fixed bottom-4 right-4 z-50 bg-white shadow-xl rounded-xl p-3 w-72 border border-neutral-200">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-primary-600 flex-shrink-0" />
            <p className="text-sm font-medium text-neutral-900 truncate flex-1">
              {audioPlayer.currentAudio.title}
            </p>
            <button
              onClick={() => audioPlayer.stop()}
              className="btn-ghost p-1"
              aria-label="Close player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => (audioPlayer.playing ? audioPlayer.pause() : audioPlayer.play())}
              className="btn-primary p-2"
              aria-label={audioPlayer.playing ? 'Pause' : 'Play'}
            >
              {audioPlayer.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full"
                style={{ width: `${(audioPlayer.currentTime / Math.max(audioPlayer.duration, 1)) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono text-neutral-500">
              {formatTime(audioPlayer.currentTime)}/{formatTime(audioPlayer.duration)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data creation functions - using real PDF manifest data
function createMockUnits(totalPages: number) {
  // Use real unit page ranges from pdfManifest
  const unitRanges = pdfManifest.unitPageRanges;
  
  return unitRanges.map((unitRange) => {
    const unitNum = unitRange.unit;
    const unitId = `unit-${unitNum}`;
    
    // Build lessons from the manifest
    const lessons = unitRange.lessons.map((lessonRange) => {
      const lessonId = `${unitId}-lesson-${lessonRange.lesson.toLowerCase()}`;
      return {
        id: lessonId,
        unitId,
        number: lessonRange.lesson.charCodeAt(0) - 64, // A=1, B=2, etc.
        title: `Lesson ${lessonRange.lesson}: ${lessonRange.title}`,
        type: getLessonType(lessonRange.lesson),
        startPage: lessonRange.startPage,
        endPage: lessonRange.endPage,
        exercises: [],
        audioIds: [],
        videoIds: [],
      };
    });
    
    return {
      id: unitId,
      editionId: 'speakout-b1p-3rd',
      number: unitNum,
      title: `Unit ${unitNum}: ${unitRange.title}`,
      description: `Learn about ${unitRange.title}`,
      startPage: unitRange.startPage,
      endPage: unitRange.endPage,
      lessons,
      grammarTopics: [],
      vocabulary: [],
    };
  });
}

function getLessonType(lesson: string): 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing' | 'review' {
  switch (lesson) {
    case 'A': return 'vocabulary';
    case 'B': return 'grammar';
    case 'C': return 'reading';
    case 'D': return 'speaking';
    case 'Review': return 'review';
    default: return 'vocabulary';
  }
}

function createMockAnnotations(totalPages: number) {
  const annotations: Record<string, any[]> = {};
  // Add some sample annotations for demo
  for (let page = 1; page <= Math.min(totalPages, 10); page++) {
    annotations[`page-${page}`] = [
      {
        id: `ann-${page}-1`,
        pageId: `page-${page}`,
        type: 'vocabulary',
        bounds: { x: 0.1, y: 0.2, width: 0.15, height: 0.05 },
        resourceId: `vocab-${page}-1`,
        label: 'VOCAB',
        data: { word: 'introduce', translation: 'يقدم / يعرّف', partOfSpeech: 'verb', pronunciation: '/ˌɪn.trəˈdjuːs/' },
      },
      {
        id: `ann-${page}-2`,
        pageId: `page-${page}`,
        type: 'audio',
        bounds: { x: 0.8, y: 0.1, width: 0.05, height: 0.05 },
        resourceId: `audio-${page}-1`,
        label: '🔊',
        data: {},
      },
    ];
  }
  return annotations;
}

function createMockExercises() {
  return [
    {
      id: 'ex-1',
      lessonId: 'unit-1-lesson-a',
      pageId: 'page-2',
      number: '1A',
      type: 'multiple-choice',
      title: 'Choose the correct option',
      instructions: 'Complete the sentences with the correct form of the verb.',
      content: {
        questions: [
          { id: 'q1', text: 'I _____ from Egypt.', type: 'multiple-choice', options: ['am', 'is', 'are'], correctAnswer: 'am' },
          { id: 'q2', text: 'She _____ a teacher.', type: 'multiple-choice', options: ['am', 'is', 'are'], correctAnswer: 'is' },
          { id: 'q3', text: 'We _____ students.', type: 'multiple-choice', options: ['am', 'is', 'are'], correctAnswer: 'are' },
        ],
      },
      answerKey: {
        answers: { q1: 'am', q2: 'is', q3: 'are' },
        explanations: { q1: 'Use "am" with "I"', q2: 'Use "is" with "he/she/it"', q3: 'Use "are" with "we/you/they"' },
        source: 'official',
        verified: true,
      },
      order: 1,
    },
    {
      id: 'ex-2',
      lessonId: 'unit-1-lesson-b',
      pageId: 'page-4',
      number: '2B',
      type: 'fill-blanks',
      title: 'Fill in the blanks',
      instructions: 'Complete the sentences with the correct preposition.',
      content: {
        questions: [
          { id: 'q1', text: 'I\'m interested _____ learning English.', type: 'fill-blanks', blanks: 1, correctAnswer: 'in' },
          { id: 'q2', text: 'She\'s good _____ playing tennis.', type: 'fill-blanks', blanks: 1, correctAnswer: 'at' },
        ],
      },
      answerKey: {
        answers: { q1: 'in', q2: 'at' },
        source: 'official',
        verified: true,
      },
      order: 2,
    },
  ];
}

function createMockAudio() {
  return [
    {
      id: 'audio-1',
      editionId: 'speakout-b1p-3rd',
      unitId: 'unit-1',
      lessonId: 'unit-1-lesson-a',
      pageId: 'page-2',
      title: 'Unit 1: Introductions',
      filename: 'SO3_B1+_SB_1A_Audio_1_01.mp3',
      path: '/688_3- Speakout 3rd B1+ Class Audio/Speakout_B1P_SB_Unit_1_Audio/SO3_B1+_SB_1A_Audio_1_01.mp3',
      duration: 45,
      type: 'dialogue',
    },
    {
      id: 'audio-2',
      editionId: 'speakout-b1p-3rd',
      unitId: 'unit-1',
      lessonId: 'unit-1-lesson-b',
      pageId: 'page-4',
      title: 'Grammar: Present Simple',
      filename: 'SO3_B1+_SB_1B_Audio_1_02.mp3',
      path: '/688_3- Speakout 3rd B1+ Class Audio/Speakout_B1P_SB_Unit_1_Audio/SO3_B1+_SB_1B_Audio_1_02.mp3',
      duration: 30,
      type: 'grammar',
    },
  ];
}

function createMockVideo() {
  return [
    {
      id: 'video-1',
      editionId: 'speakout-b1p-3rd',
      unitId: 'unit-1',
      lessonId: 'unit-1-lesson-c',
      pageId: 'page-5',
      title: 'BBC Vlog: Meeting People',
      filename: 'SO3 B1+ U1 BBC Vlogs.mp4',
      path: '/688_4- Speakout 3rd B1+ Video/SO3 B1+ U1 BBC Vlogs.mp4',
      duration: 180,
      type: 'bbc-vlog',
      embeddable: true,
    },
  ];
}

function createMockGrammarTopics() {
  return [
    {
      id: 'grammar-1',
      editionId: 'speakout-b1p-3rd',
      unitId: 'unit-1',
      lessonId: 'unit-1-lesson-b',
      pageId: 'page-4',
      name: 'Present Simple',
      description: 'Used for habits, facts, and permanent situations',
      explanationAr: 'يستخدم المضارع البسيط للتعبير عن العادات والحقائق والأوضاع الدائمة',
      explanationEn: 'Used for habits, facts, and permanent situations',
      examples: [
        { id: 'ex-1', english: 'I live in London.', arabic: 'أسكن في لندن.' },
        { id: 'ex-2', english: 'She works at a bank.', arabic: 'تعمل في بنك.' },
        { id: 'ex-3', english: 'The sun rises in the east.', arabic: 'تشرق الشمس من الشرق.' },
      ],
      commonMistakes: ['Using present continuous for habits', 'Forgetting -s with he/she/it'],
      relatedExercises: ['ex-2'],
      videoResources: [
        { id: 'vid-1', topicId: 'grammar-1', title: 'Present Simple - English Grammar', channel: 'BBC Learning English', youtubeId: 'abc123', duration: 300, language: 'en', level: 'intermediate', verified: true },
      ],
      order: 1,
      completed: false,
    },
    {
      id: 'grammar-2',
      editionId: 'speakout-b1p-3rd',
      unitId: 'unit-2',
      lessonId: 'unit-2-lesson-b',
      pageId: 'page-12',
      name: 'Present Continuous',
      description: 'Used for actions happening now or around now',
      explanationAr: 'يستخدم المضارع المستمر للأفعال التي تحدث الآن أو في الفترة الحالية',
      explanationEn: 'Used for actions happening now or around now',
      examples: [
        { id: 'ex-1', english: 'I am studying English.', arabic: 'أدرس الإنجليزية الآن.' },
        { id: 'ex-2', english: 'She is reading a book.', arabic: 'هي تقرأ كتاباً.' },
      ],
      commonMistakes: ['Using present simple for current actions', 'Forgetting -ing form'],
      relatedExercises: [],
      videoResources: [],
      order: 2,
      completed: false,
    },
  ];
}

function createMockVocabulary() {
  return [
    {
      id: 'vocab-1',
      editionId: 'speakout-b1p-3rd',
      unitId: 'unit-1',
      lessonId: 'unit-1-lesson-a',
      pageId: 'page-2',
      word: 'introduce',
      translation: 'يقدم / يعرّف',
      partOfSpeech: 'verb',
      pronunciation: '/ˌɪn.trəˈdjuːs/',
      audioId: 'audio-1',
      contextSentence: 'Let me introduce myself.',
      contextTranslation: 'دعني أعرّف بنفسي.',
      difficulty: 2,
      frequency: 85,
    },
    {
      id: 'vocab-2',
      editionId: 'speakout-b1p-3rd',
      unitId: 'unit-1',
      lessonId: 'unit-1-lesson-a',
      pageId: 'page-2',
      word: 'nationality',
      translation: 'جنسية',
      partOfSpeech: 'noun',
      pronunciation: '/ˌnæʃ.ənˈæl.ə.ti/',
      contextSentence: 'What\'s your nationality?',
      contextTranslation: 'ما هي جنسيتك؟',
      difficulty: 3,
      frequency: 70,
    },
  ];
}