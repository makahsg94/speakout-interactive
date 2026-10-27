// Translation Popup Component

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslationCache } from '@/stores';
import { useTranslation } from '@/lib/translation-service';
import { useTTS } from '@/lib/tts-service';
import { useProgressStore } from '@/stores';
import { Volume2, BookmarkPlus, X, Loader2, Mic } from 'lucide-react';
import type { TranslationResult } from '@/types';

interface TranslationPopupProps {
  visible: boolean;
  x: number;
  y: number;
  content: TranslationResult | null;
  onClose: () => void;
  onSaveVocabulary: (word: string, translation: string) => void;
  anchorRect?: DOMRect;
}

export function TranslationPopup({
  visible,
  x,
  y,
  content,
  onClose,
  onSaveVocabulary,
  anchorRect,
}: TranslationPopupProps) {
  const { translate, translating } = useTranslation();
  const { speak, stop } = useTTS();
  const cache = useTranslationCache();
  const [showPronunciation, setShowPronunciation] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!visible || !popupRef.current) return;

    const popupRect = popupRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 16;

    let newX = x;
    let newY = y;

    // Default: show below anchor
    if (anchorRect) {
      newX = anchorRect.left;
      newY = anchorRect.bottom + 8;
    }

    // Adjust horizontal
    if (newX + popupRect.width > viewportWidth - padding) {
      newX = viewportWidth - popupRect.width - padding;
    }
    if (newX < padding) {
      newX = padding;
    }

    // Adjust vertical
    if (newY + popupRect.height > viewportHeight - padding) {
      // Show above anchor instead
      if (anchorRect) {
        newY = anchorRect.top - popupRect.height - 8;
      }
      if (newY < padding) {
        newY = padding;
      }
    }

    setPosition({ x: newX, y: newY });
  }, [visible, x, y, anchorRect]);

  // Close on outside click
  useEffect(() => {
    if (!visible) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [visible, onClose]);

  if (!visible || !content) return null;

  const isAvailable = content.source !== 'unavailable';
  const hasTranslation = content.translation && content.translation.trim() !== '';

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        maxWidth: expanded ? '400px' : '320px',
      }}
      className="animate-scale-in"
      role="dialog"
      aria-label="Translation"
    >
      <div className="panel shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-neutral-50 border-b border-neutral-200">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-semibold text-neutral-900 truncate">{content.word}</span>
            {content.partOfSpeech && (
              <span className="text-xs px-2 py-0.5 bg-neutral-200 text-neutral-600 rounded-full whitespace-nowrap">
                {content.partOfSpeech}
              </span>
            )}
            {content.pronunciation && (
              <span className="text-sm text-neutral-500 font-mono">/{content.pronunciation}/</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn-ghost p-1.5 text-neutral-500 hover:text-neutral-700"
              aria-label={expanded ? 'Show less' : 'Show more'}
            >
              {expanded ? '⌃' : '⌄'}
            </button>
            <button
              onClick={onClose}
              className="btn-ghost p-1.5 text-neutral-500 hover:text-neutral-700"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {/* Main Translation */}
          {hasTranslation ? (
            <div className="mb-3">
              <p className="text-lg font-medium text-neutral-900 rtl">{content.translation}</p>
              {content.alternatives && content.alternatives.length > 0 && (
                <p className="text-sm text-neutral-500 mt-1 rtl">
                  Also: {content.alternatives.join(', ')}
                </p>
              )}
            </div>
          ) : (
            <div className="mb-3 text-neutral-500 italic">
              Translation not available
            </div>
          )}

          {/* Pronunciation */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => speak(content.word)}
              disabled={translating}
              className="btn-secondary px-3 py-1.5"
              aria-label="Play pronunciation"
            >
              <Volume2 className="w-4 h-4 mr-1" />
              <span>Pronounce</span>
            </button>
            {content.audioId && (
              <button
                onClick={() => {
                  // Play from audio service
                }}
                className="btn-secondary px-3 py-1.5"
                aria-label="Play original audio"
              >
                <Mic className="w-4 h-4 mr-1" />
                <span>Original</span>
              </button>
            )}
            {expanded && content.audioUrl && (
              <audio src={content.audioUrl} controls className="flex-1" />
            )}
          </div>

          {/* Context Translation */}
          {expanded && content.contextTranslation && (
            <div className="mb-3 p-3 bg-primary-50 rounded-lg border border-primary-100">
              <p className="text-sm font-medium text-primary-900 mb-1">Context translation:</p>
              <p className="text-sm rtl">{content.contextTranslation}</p>
            </div>
          )}

          {/* Example Sentences */}
          {expanded && content.exampleSentences && content.exampleSentences.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-medium text-neutral-700 mb-2">Examples:</p>
              <div className="space-y-2">
                {content.exampleSentences.slice(0, 3).map((ex, i) => (
                  <div key={i} className="text-sm space-y-1">
                    <p className="text-neutral-900">{ex.en}</p>
                    <p className="text-neutral-600 rtl">{ex.ar}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source Badge */}
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${
                content.source === 'local' ? 'bg-green-500' :
                content.source === 'ai' ? 'bg-purple-500' :
                content.source === 'dictionary' ? 'bg-blue-500' :
                'bg-neutral-400'
              }`}></span>
              Source: {content.source}{content.cached ? ' (cached)' : ''}
            </span>
            {content.cached && <span>⚡</span>}
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="border-t border-neutral-200 p-3 bg-neutral-50">
            <div className="space-y-3">
              {/* Save to Vocabulary */}
              <button
                onClick={() => {
                  if (hasTranslation) {
                    onSaveVocabulary(content.word, content.translation);
                  }
                }}
                disabled={!hasTranslation}
                className="btn-primary w-full justify-center"
              >
                <BookmarkPlus className="w-4 h-4 mr-2" />
                Save to Vocabulary
              </button>

              {/* Translate phrase/sentence */}
              {content.word.split(' ').length === 1 && (
                <button
                  onClick={async () => {
                    // Would trigger phrase translation
                  }}
                  className="btn-secondary w-full justify-center"
                >
                  Translate Phrase
                </button>
              )}

              {/* More options */}
              <div className="flex gap-2">
                <button className="btn-ghost flex-1 text-sm" onClick={() => setShowPronunciation(!showPronunciation)}>
                  {showPronunciation ? 'Hide' : 'Show'} Pronunciation
                </button>
                <button className="btn-ghost flex-1 text-sm" onClick={() => {
                  // Open in dictionary
                }}>
                  Open Dictionary
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {translating && (
          <div className="p-3 text-center text-neutral-500">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            Translating...
          </div>
        )}
      </div>

      {/* Arrow pointer */}
      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 translate-y-1 w-0 h-0 border-6 border-transparent border-b-neutral-900"
      />
    </div>
  );
}

// Contextual translation hook
export function useContextualTranslation() {
  const [popupState, setPopupState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: TranslationResult | null;
    anchorRect?: DOMRect;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: null,
  });

  const { translate } = useTranslation();
  const addVocabulary = useProgressStore((state) => state.addVocabulary);
  const getVocabularyByWord = useProgressStore((state) => state.getVocabularyByWord);

  const showTranslation = useCallback(
    async (text: string, rect: DOMRect, pageNumber: number) => {
      if (!text.trim()) return;

      // Check local vocabulary first
      const existingVocab = getVocabularyByWord(text, 'speakout-b1p');
      
      let result = await translate(text);

      // Enhance with vocabulary data if available
      if (existingVocab) {
        result = {
          ...result,
          translation: existingVocab.translation,
          partOfSpeech: existingVocab.partOfSpeech,
          pronunciation: existingVocab.pronunciation,
          audioId: existingVocab.audioId,
          contextSentence: existingVocab.contextSentence,
          contextTranslation: existingVocab.contextTranslation,
          source: 'local',
        };
      }

      setPopupState({
        visible: true,
        x: rect.left,
        y: rect.bottom + 8,
        content: result,
        anchorRect: rect,
      });
    },
    [translate, getVocabularyByWord]
  );

  const hideTranslation = useCallback(() => {
    setPopupState((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleSaveVocabulary = useCallback(
    (word: string, translation: string) => {
      const vocab = getVocabularyByWord(word, 'speakout-b1p');
      if (vocab) return; // Already saved

      addVocabulary({
        id: `vocab-${Date.now()}`,
        userId: 'user',
        vocabularyId: `vocab-${Date.now()}`,
        word,
        translation,
        sourcePage: popupState.content ? 1 : 1, // Would need actual page
        sourceUnit: '1',
        sourceEdition: 'speakout-b1p',
        dateSaved: Date.now(),
        status: 'new',
        reviewCount: 0,
        correctCount: 0,
        lastReviewed: 0,
        nextReview: Date.now(),
        interval: 0,
        easeFactor: 2.5,
      });
    },
    [addVocabulary, getVocabularyByWord, popupState.content]
  );

  return {
    popupState,
    showTranslation,
    hideTranslation,
    handleSaveVocabulary,
  };
}