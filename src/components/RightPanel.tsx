// Right Panel Component for vocabulary, exercises, audio, etc.

import React, { useState } from 'react';
import { useUIStore, useProgressStore, useContentStore } from '@/stores';
import { useAudioPlayer } from '@/lib/audio-service';
import type { Exercise, AudioFile, VideoFile, SavedVocabulary, GrammarTopic } from '@/types';
import { 
  Volume2, Mic, BookOpen, CheckCircle, X, ChevronLeft, ChevronRight,
  Play, Pause, SkipBack, SkipForward, Repeat, List, Bookmark, MessageSquare
} from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface RightPanelProps {
  editionId: string;
  pageId: string;
  onClose: () => void;
}

export function RightPanel({ editionId, pageId, onClose }: RightPanelProps) {
  const { rightPanelCollapsed, setRightPanelCollapsed, videoPlayer, setVideoPlayer } = useUIStore();
  const audioPlayer = useAudioPlayer();
  const { vocabulary, addVocabulary, getVocabularyByWord } = useProgressStore();
  const { annotations, exercises, audioFiles, videoFiles, grammarTopics } = useContentStore();

  const pageAnnotations = annotations[pageId] || [];
  const pageExercises = Object.values(exercises).filter((e: any) => e.pageId === pageId);
  const pageAudio = Object.values(audioFiles).filter((a: any) => a.pageId === pageId);
  const pageVideo = Object.values(videoFiles).filter((v: any) => v.pageId === pageId);
  const pageGrammar = Object.values(grammarTopics).filter((g: any) => g.pageId === pageId);

  const [activeTab, setActiveTab] = useState<'vocabulary' | 'exercises' | 'audio' | 'video' | 'grammar' | 'notes'>('vocabulary');

  if (rightPanelCollapsed) {
    return (
      <aside className="right-panel w-12 border-l border-neutral-200 bg-white flex flex-col">
        <div className="p-2 flex items-center justify-center border-b border-neutral-200">
          <BookOpen className="w-5 h-5 text-primary-600" />
        </div>
        <nav className="flex-1 overflow-y-auto px-1 py-2 space-y-1">
          {[
            { id: 'vocabulary', label: 'Words', icon: BookOpen, count: pageAnnotations.filter(a => a.type === 'vocabulary').length },
            { id: 'exercises', label: 'Exercises', icon: List, count: pageExercises.length },
            { id: 'audio', label: 'Audio', icon: Volume2, count: pageAudio.length },
            { id: 'video', label: 'Video', icon: Mic, count: pageVideo.length },
            { id: 'grammar', label: 'Grammar', icon: Bookmark, count: pageGrammar.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full p-2 rounded-lg transition-colors flex flex-col items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title={`${tab.label}${tab.count ? ` (${tab.count})` : ''}`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
              {tab.count > 0 && <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">{tab.count}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-neutral-200">
          <button
            onClick={() => setRightPanelCollapsed(false)}
            className="btn-ghost w-full justify-center p-2"
            aria-label="Expand panel"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="right-panel w-80 border-l border-neutral-200 bg-white flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-neutral-900">Page Resources</h2>
        </div>
        <button
          onClick={() => setRightPanelCollapsed(true)}
          className="btn-ghost p-1.5"
          aria-label="Collapse panel"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200 px-3">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {[
            { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen, count: pageAnnotations.filter(a => a.type === 'vocabulary').length },
            { id: 'exercises', label: 'Exercises', icon: List, count: pageExercises.length },
            { id: 'audio', label: 'Audio', icon: Volume2, count: pageAudio.length },
            { id: 'video', label: 'Video', icon: Mic, count: pageVideo.length },
            { id: 'grammar', label: 'Grammar', icon: Bookmark, count: pageGrammar.length },
            { id: 'notes', label: 'Notes', icon: MessageSquare, count: 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`btn-ghost px-3 py-1.5 text-sm whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                  : ''
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'vocabulary' && (
          <VocabularyTab 
            annotations={pageAnnotations.filter(a => a.type === 'vocabulary')}
            vocabulary={vocabulary}
            onAddVocabulary={addVocabulary}
            getVocabularyByWord={getVocabularyByWord}
            editionId={editionId}
          />
        )}
        {activeTab === 'exercises' && (
          <ExercisesTab exercises={pageExercises} />
        )}
        {activeTab === 'audio' && (
          <AudioTab audioFiles={pageAudio} audioPlayer={audioPlayer} setAudioPlayer={() => {}} />
        )}
        {activeTab === 'video' && (
          <VideoTab videoFiles={pageVideo} videoPlayer={videoPlayer} setVideoPlayer={setVideoPlayer} />
        )}
        {activeTab === 'grammar' && (
          <GrammarTab grammarTopics={pageGrammar} />
        )}
        {activeTab === 'notes' && (
          <NotesTab pageId={pageId} />
        )}
      </div>
    </aside>
  );
}

// Vocabulary Tab
function VocabularyTab({ 
  annotations, 
  vocabulary, 
  onAddVocabulary, 
  getVocabularyByWord,
  editionId
}: {
  annotations: any[];
  vocabulary: SavedVocabulary[];
  onAddVocabulary: (vocab: SavedVocabulary) => void;
  getVocabularyByWord: (word: string, editionId: string) => SavedVocabulary | undefined;
  editionId: string;
}) {
  if (annotations.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <BookOpen className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>No vocabulary items on this page</p>
        <p className="text-sm mt-1">Select a word in the text to translate</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-neutral-700">Key Vocabulary</p>
      {annotations.map((annotation) => {
        const word = annotation.data?.word || 'Unknown';
        const saved = getVocabularyByWord(word, editionId);
        
        return (
          <div 
            key={annotation.id} 
            className={`p-3 rounded-lg border transition-colors ${
              saved ? 'bg-green-50 border-green-200' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900">{word}</p>
                {annotation.data?.translation && (
                  <p className="text-sm text-neutral-600 rtl mt-1">{annotation.data.translation}</p>
                )}
                {annotation.data?.partOfSpeech && (
                  <span className="text-xs text-neutral-500">{annotation.data.partOfSpeech}</span>
                )}
              </div>
              {saved ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" aria-label="Already saved" />
              ) : (
                <button
                  onClick={() => {
                    if (annotation.data?.translation) {
                      onAddVocabulary({
                        id: `vocab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        userId: 'user',
                        vocabularyId: annotation.resourceId,
                        word,
                        translation: annotation.data.translation,
                        partOfSpeech: annotation.data.partOfSpeech,
                        pronunciation: annotation.data.pronunciation,
                        audioId: annotation.data.audioId,
                        contextSentence: annotation.data.contextSentence,
                        contextTranslation: annotation.data.contextTranslation,
                        sourcePage: 1,
                        sourceUnit: '1',
                        sourceEdition: editionId,
                        dateSaved: Date.now(),
                        status: 'new',
                        reviewCount: 0,
                        correctCount: 0,
                        lastReviewed: 0,
                        nextReview: Date.now(),
                        interval: 0,
                        easeFactor: 2.5,
                      });
                    }
                  }}
                  className="btn-primary text-sm px-3 py-1 flex-shrink-0"
                >
                  <Bookmark className="w-3 h-3 mr-1" />
                  Save
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Exercises Tab
function ExercisesTab({ exercises }: { exercises: any[] }) {
  if (exercises.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <List className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>No exercises on this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise) => (
        <ExerciseCard key={exercise.id} exercise={exercise} />
      ))}
    </div>
  );
}

function ExerciseCard({ exercise }: { exercise: any }) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    setShowAnswer(true);
  };

  const handleRetry = () => {
    setShowAnswer(false);
    setUserAnswers({});
  };

  const renderQuestion = (question: any, index: number) => {
    const userAnswer = userAnswers[question.id] || '';
    const isCorrect = exercise.answerKey?.answers?.[question.id];
    const showCorrect = showAnswer && isCorrect;

    return (
      <div key={question.id} className="space-y-2 p-3 bg-neutral-50 rounded-lg">
        <p className="font-medium text-neutral-900">{index + 1}. {question.text}</p>
        
        {question.type === 'multiple-choice' && question.options && (
          <div className="space-y-1">
            {question.options.map((option: string, i: number) => (
              <label
                key={i}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                  showAnswer
                    ? option === isCorrect
                      ? 'bg-green-100 text-green-800'
                      : userAnswer === option
                      ? 'bg-red-100 text-red-800'
                      : 'bg-neutral-100'
                    : 'hover:bg-neutral-100'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option}
                  checked={userAnswer === option}
                  onChange={() => !showAnswer && setUserAnswers(prev => ({ ...prev, [question.id]: option }))}
                  disabled={showAnswer}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">{option}</span>
                {showAnswer && option === isCorrect && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
              </label>
            ))}
          </div>
        )}

        {question.type === 'fill-blanks' && (
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => !showAnswer && setUserAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
            disabled={showAnswer}
            className="input w-full max-w-xs"
            placeholder="Type your answer..."
          />
        )}

        {question.type === 'true-false' && (
          <div className="flex gap-4">
            {['True', 'False'].map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                  showAnswer
                    ? opt === isCorrect
                      ? 'bg-green-100 text-green-800'
                      : userAnswer === opt
                      ? 'bg-red-100 text-red-800'
                      : 'bg-neutral-100'
                    : 'hover:bg-neutral-100'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt}
                  checked={userAnswer === opt}
                  onChange={() => !showAnswer && setUserAnswers(prev => ({ ...prev, [question.id]: opt }))}
                  disabled={showAnswer}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm">{opt}</span>
                {showAnswer && opt === isCorrect && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
              </label>
            ))}
          </div>
        )}

        {showAnswer && exercise.answerKey?.explanations?.[question.id] && (
          <p className="text-sm text-primary-700 bg-primary-50 p-2 rounded">
            💡 {exercise.answerKey.explanations[question.id]}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="border border-neutral-200 rounded-xl overflow-hidden">
      <div className="p-3 bg-neutral-50 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-primary-700">
            Exercise {exercise.number}
          </span>
          <span className="text-xs px-2 py-0.5 bg-neutral-200 rounded capitalize">
            {exercise.type.replace('-', ' ')}
          </span>
        </div>
        <p className="text-sm text-neutral-600 mt-1">{exercise.instructions}</p>
      </div>
      
      <div className="p-3 space-y-3">
        {exercise.content.questions.map(renderQuestion)}
      </div>

      <div className="p-3 border-t border-neutral-200 bg-neutral-50 flex gap-2">
        {!showAnswer ? (
          <button
            onClick={handleSubmit}
            className="btn-primary flex-1 justify-center"
            disabled={Object.keys(userAnswers).length === 0}
          >
            Check Answers
          </button>
        ) : (
          <>
            <button onClick={handleRetry} className="btn-secondary flex-1 justify-center">
              Try Again
            </button>
            <button className="btn-primary flex-1 justify-center">
              Next Exercise
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Audio Tab
function AudioTab({ 
  audioFiles, 
  audioPlayer, 
  setAudioPlayer 
}: {
  audioFiles: any[];
  audioPlayer: any;
  setAudioPlayer: (player: any) => void;
}) {
  if (audioFiles.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <Volume2 className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>No audio files for this page</p>
      </div>
    );
  }

  const currentAudio = audioPlayer.currentAudio;
  const isCurrentPageAudio = currentAudio && audioFiles.some(a => a.id === currentAudio.id);

  return (
    <div className="space-y-3">
      {audioFiles.map((audio) => (
        <AudioPlayerCard 
          key={audio.id} 
          audio={audio} 
          isActive={isCurrentPageAudio && audioPlayer.currentAudio?.id === audio.id}
          audioPlayer={audioPlayer}
          setAudioPlayer={setAudioPlayer}
        />
      ))}
    </div>
  );
}

function AudioPlayerCard({ audio, isActive, audioPlayer, setAudioPlayer }: any) {
  const [showTranscript, setShowTranscript] = useState(false);

  const handleLoad = async () => {
    try {
      await audioPlayer.load(audio);
      audioPlayer.play();
    } catch (err) {
      console.error('Audio load failed:', err);
    }
  };

  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      isActive ? 'border-primary-300 bg-primary-50' : 'border-neutral-200 bg-neutral-50'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            audio.type === 'dialogue' ? 'bg-blue-100 text-blue-600' :
            audio.type === 'vocabulary' ? 'bg-green-100 text-green-600' :
            audio.type === 'pronunciation' ? 'bg-purple-100 text-purple-600' :
            audio.type === 'listening' ? 'bg-orange-100 text-orange-600' :
            'bg-neutral-100 text-neutral-600'
          }`}>
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-neutral-900 truncate">{audio.title}</p>
            <p className="text-xs text-neutral-500 capitalize">{audio.type}</p>
          </div>
        </div>
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="btn-ghost p-1.5 text-neutral-500 hover:text-neutral-700"
        >
          <List className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => isActive ? audioPlayer.playing ? audioPlayer.pause() : audioPlayer.play() : handleLoad()}
          className="btn-secondary p-2"
          disabled={!isActive && audioPlayer.playing}
        >
          {isActive && audioPlayer.playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        <button
          onClick={() => isActive && audioPlayer.skipBackward(10)}
          className="btn-ghost p-2"
          disabled={!isActive}
        >
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={() => isActive && audioPlayer.skipForward(10)}
          className="btn-ghost p-2"
          disabled={!isActive}
        >
          <SkipForward className="w-5 h-5" />
        </button>
        <div className="flex-1 h-1.5 bg-neutral-200 rounded-full relative" style={{ cursor: 'pointer' }}>
          <div
            className="h-full bg-primary-600 rounded-full"
            style={{ width: `${isActive ? (audioPlayer.currentTime / Math.max(audioPlayer.duration, 1)) * 100 : 0}%` }}
          />
        </div>
        <span className="text-xs font-mono text-neutral-500 w-16 text-right">
          {isActive ? formatTime(audioPlayer.currentTime) : '0:00'}
        </span>
        <span className="text-xs font-mono text-neutral-500 w-16">
          {isActive ? formatTime(audioPlayer.duration) : '--:--'}
        </span>
      </div>

      {showTranscript && audioPlayer.transcript && (
        <div className="mt-3 p-3 bg-white rounded border border-neutral-200 max-h-40 overflow-y-auto">
          <p className="text-sm text-neutral-600 rtl whitespace-pre-wrap">
            {audioPlayer.transcript.text}
          </p>
        </div>
      )}
    </div>
  );
}

// Video Tab
function VideoTab({ 
  videoFiles, 
  videoPlayer, 
  setVideoPlayer 
}: {
  videoFiles: any[];
  videoPlayer: any;
  setVideoPlayer: (player: any) => void;
}) {
  if (videoFiles.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <Mic className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>No videos for this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videoFiles.map((video) => (
        <div key={video.id} className="p-3 border border-neutral-200 rounded-lg bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
              <Mic className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 truncate">{video.title}</p>
              <p className="text-xs text-neutral-500 capitalize">{video.type}</p>
            </div>
          </div>
          <button
            onClick={() => setVideoPlayer({ currentVideo: video })}
            className="btn-primary w-full mt-2 justify-center"
          >
            <Play className="w-4 h-4 mr-2" />
            Watch Video
          </button>
        </div>
      ))}
    </div>
  );
}

// Grammar Tab
function GrammarTab({ grammarTopics }: { grammarTopics: any[] }) {
  if (grammarTopics.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        <Bookmark className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
        <p>No grammar topics on this page</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grammarTopics.map((topic) => (
        <div key={topic.id} className="p-3 border border-neutral-200 rounded-lg bg-neutral-50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-semibold text-neutral-900">{topic.name}</p>
              <p className="text-sm text-neutral-600 mt-1 rtl">{topic.explanationAr}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {topic.videoResources.slice(0, 2).map((video: any) => (
                  <button key={video.id} className="btn-ghost text-xs px-2 py-1">
                    {video.title}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-secondary text-sm px-3 py-1 flex-shrink-0">
              Practice
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Notes Tab
function NotesTab({ pageId }: { pageId: string }) {
  const [notes, setNotes] = useState('');

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add your personal notes for this page..."
        className="input min-h-[200px] resize-y"
        rows={8}
      />
      <div className="flex gap-2">
        <button className="btn-primary flex-1 justify-center">Save Notes</button>
        <button className="btn-secondary flex-1 justify-center">Clear</button>
      </div>
    </div>
  );
}