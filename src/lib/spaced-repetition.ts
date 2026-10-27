// Spaced Repetition Service using SM-2 algorithm

import type { SavedVocabulary, ReviewItem, ReviewSession } from '@/types';
import { generateId } from './utils';

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface ReviewResult {
  vocabularyId: string;
  grade: ReviewGrade;
  nextReview: number;
  interval: number;
  easeFactor: number;
  reviewCount: number;
}

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const AGAIN_INTERVAL = 1; // minutes
const HARD_INTERVAL_MULTIPLIER = 1.2;
const GOOD_INTERVAL_MULTIPLIER = 2.5;
const EASY_INTERVAL_MULTIPLIER = 3.5;
const MAX_INTERVAL_DAYS = 365;

export class SpacedRepetitionService {
  // Calculate next review based on SM-2 algorithm
  calculateNextReview(
    vocab: SavedVocabulary,
    grade: ReviewGrade
  ): ReviewResult {
    let { interval, easeFactor, reviewCount } = vocab;
    let nextReview: number;

    const now = Date.now();

    switch (grade) {
      case 'again':
        // Reset interval to 1 minute (for immediate review)
        interval = AGAIN_INTERVAL / (24 * 60); // Convert to days
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
        reviewCount = 0;
        nextReview = now + AGAIN_INTERVAL * 60 * 1000; // 1 minute from now
        break;

      case 'hard':
        if (reviewCount === 0) {
          interval = 1 / 24; // 1 hour
        } else if (reviewCount === 1) {
          interval = 6 / 24; // 6 hours
        } else {
          interval = interval * HARD_INTERVAL_MULTIPLIER;
        }
        easeFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
        reviewCount += 1;
        nextReview = now + interval * 24 * 60 * 60 * 1000;
        break;

      case 'good':
        if (reviewCount === 0) {
          interval = 1; // 1 day
        } else if (reviewCount === 1) {
          interval = 6; // 6 days
        } else {
          interval = interval * GOOD_INTERVAL_MULTIPLIER;
        }
        reviewCount += 1;
        nextReview = now + interval * 24 * 60 * 60 * 1000;
        break;

      case 'easy':
        if (reviewCount === 0) {
          interval = 4; // 4 days
        } else if (reviewCount === 1) {
          interval = 10; // 10 days
        } else {
          interval = interval * EASY_INTERVAL_MULTIPLIER;
        }
        easeFactor = easeFactor + 0.15;
        reviewCount += 1;
        nextReview = now + interval * 24 * 60 * 60 * 1000;
        break;
    }

    // Cap interval at max
    interval = Math.min(interval, MAX_INTERVAL_DAYS);

    return {
      vocabularyId: vocab.id,
      grade,
      nextReview,
      interval,
      easeFactor,
      reviewCount,
    };
  }

  // Apply review result to vocabulary item
  applyReview(vocab: SavedVocabulary, grade: ReviewGrade): SavedVocabulary {
    const result = this.calculateNextReview(vocab, grade);
    
    let status: SavedVocabulary['status'] = vocab.status;
    
    // Update status based on review count and ease factor
    if (result.reviewCount >= 8 && result.easeFactor >= 2.5) {
      status = 'mastered';
    } else if (result.reviewCount >= 4) {
      status = 'known';
    } else if (result.reviewCount >= 1) {
      status = 'learning';
    } else {
      status = 'new';
    }

    return {
      ...vocab,
      interval: result.interval,
      easeFactor: result.easeFactor,
      reviewCount: result.reviewCount,
      lastReviewed: Date.now(),
      nextReview: result.nextReview,
      status,
      correctCount: grade === 'good' || grade === 'easy' ? vocab.correctCount + 1 : vocab.correctCount,
    };
  }

  // Get vocabulary due for review
  getDueVocabulary(vocabulary: SavedVocabulary[], limit = 20): SavedVocabulary[] {
    const now = Date.now();
    return vocabulary
      .filter((v) => v.nextReview <= now && v.status !== 'mastered')
      .sort((a, b) => a.nextReview - b.nextReview)
      .slice(0, limit);
  }

  // Get vocabulary overdue for review
  getOverdueVocabulary(vocabulary: SavedVocabulary[]): SavedVocabulary[] {
    const now = Date.now();
    return vocabulary
      .filter((v) => v.nextReview < now - 24 * 60 * 60 * 1000 && v.status !== 'mastered') // Overdue by 1 day
      .sort((a, b) => a.nextReview - b.nextReview);
  }

  // Get review statistics
  getStats(vocabulary: SavedVocabulary[]): {
    total: number;
    new: number;
    learning: number;
    known: number;
    mastered: number;
    due: number;
    overdue: number;
    dueToday: number;
  } {
    const now = Date.now();
    const todayEnd = new Date(now).setHours(23, 59, 59, 999);

    return {
      total: vocabulary.length,
      new: vocabulary.filter((v) => v.status === 'new').length,
      learning: vocabulary.filter((v) => v.status === 'learning').length,
      known: vocabulary.filter((v) => v.status === 'known').length,
      mastered: vocabulary.filter((v) => v.status === 'mastered').length,
      due: vocabulary.filter((v) => v.nextReview <= now && v.status !== 'mastered').length,
      overdue: vocabulary.filter((v) => v.nextReview < now - 24 * 60 * 60 * 1000 && v.status !== 'mastered').length,
      dueToday: vocabulary.filter((v) => v.nextReview <= todayEnd && v.status !== 'mastered').length,
    };
  }

  // Generate review session items
  generateReviewItems(vocabulary: SavedVocabulary[], count = 10): ReviewItem[] {
    const due = this.getDueVocabulary(vocabulary, count);
    const items: ReviewItem[] = [];

    due.forEach((vocab) => {
      // Randomly select review type
      const types: ReviewItem['type'][] = [
        'meaning-recall',
        'word-recall',
        'listening',
        'sentence-complete',
        'multiple-choice',
      ];
      const type = types[Math.floor(Math.random() * types.length)];

      let question = '';
      let answer = '';

      switch (type) {
        case 'meaning-recall':
          question = `What does "${vocab.word}" mean?`;
          answer = vocab.translation;
          break;
        case 'word-recall':
          question = `What is the English word for "${vocab.translation}"?`;
          answer = vocab.word;
          break;
        case 'listening':
          question = 'Listen and identify the word';
          answer = vocab.word;
          break;
        case 'sentence-complete':
          if (vocab.contextSentence) {
            const blanked = vocab.contextSentence.replace(
              new RegExp(`\\b${vocab.word}\\b`, 'i'),
              '_____'
            );
            question = `Complete the sentence: "${blanked}"`;
            answer = vocab.word;
          } else {
            question = `Use "${vocab.word}" in a sentence`;
            answer = vocab.contextSentence || vocab.word;
          }
          break;
        case 'multiple-choice':
          question = `Choose the correct meaning for "${vocab.word}"`;
          answer = vocab.translation;
          break;
      }

      items.push({
        vocabularyId: vocab.id,
        type,
        question,
        answer,
        difficulty: 'good', // Will be updated after user responds
      });
    });

    return items;
  }

  // Create a new review session
  createReviewSession(userId: string, items: ReviewItem[]): ReviewSession {
    return {
      id: generateId('review-'),
      userId,
      items,
      startedAt: Date.now(),
      correctCount: 0,
      totalCount: items.length,
    };
  }

  // Process review answer
  processAnswer(
    session: ReviewSession,
    itemIndex: number,
    userAnswer: string,
    grade: ReviewGrade
  ): ReviewSession {
    const items = [...session.items];
    const item = items[itemIndex];
    
    if (!item) return session;

    const correct = this.checkAnswer(item.answer, userAnswer, item.type);
    
    items[itemIndex] = {
      ...item,
      userAnswer,
      correct,
      difficulty: grade,
      answeredAt: Date.now(),
    };

    const correctCount = items.filter((i) => i.correct === true).length;

    return {
      ...session,
      items,
      correctCount,
      completedAt: items.every((i) => i.answeredAt) ? Date.now() : undefined,
    };
  }

  private checkAnswer(correctAnswer: string, userAnswer: string, type: ReviewItem['type']): boolean {
    if (!userAnswer.trim()) return false;

    const normalizedCorrect = correctAnswer.toLowerCase().trim();
    const normalizedUser = userAnswer.toLowerCase().trim();

    switch (type) {
      case 'meaning-recall':
      case 'word-recall':
        // Allow partial matches for translations
        return normalizedUser === normalizedCorrect || 
               normalizedCorrect.includes(normalizedUser) ||
               normalizedUser.includes(normalizedCorrect);

      case 'sentence-complete':
        // Check if the target word is in the answer
        return normalizedUser.includes(normalizedCorrect);

      case 'multiple-choice':
        return normalizedUser === normalizedCorrect;

      case 'listening':
        return normalizedUser === normalizedCorrect;

      default:
        return normalizedUser === normalizedCorrect;
    }
  }

  // Get recommended review interval for display
  getIntervalText(intervalDays: number): string {
    if (intervalDays < 1 / 24) {
      return '< 1 hour';
    } else if (intervalDays < 1) {
      const hours = Math.round(intervalDays * 24);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (intervalDays < 7) {
      const days = Math.round(intervalDays);
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (intervalDays < 30) {
      const weeks = Math.round(intervalDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''}`;
    } else if (intervalDays < 365) {
      const months = Math.round(intervalDays / 30);
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.round(intervalDays / 365);
      return `${years} year${years > 1 ? 's' : ''}`;
    }
  }

  // Export review data for backup
  exportReviewData(vocabulary: SavedVocabulary[]): string {
    const data = vocabulary.map((v) => ({
      id: v.id,
      word: v.word,
      translation: v.translation,
      interval: v.interval,
      easeFactor: v.easeFactor,
      reviewCount: v.reviewCount,
      lastReviewed: v.lastReviewed,
      nextReview: v.nextReview,
      status: v.status,
      correctCount: v.correctCount,
    }));
    return JSON.stringify(data, null, 2);
  }

  // Import review data
  importReviewData(json: string): Partial<SavedVocabulary>[] {
    try {
      return JSON.parse(json);
    } catch {
      return [];
    }
  }
}

export const spacedRepetitionService = new SpacedRepetitionService();

// React hook for spaced repetition
import { useState, useCallback, useMemo } from 'react';
import { useProgressStore } from '@/stores';

export function useSpacedRepetition() {
  const vocabulary = useProgressStore((state) => state.vocabulary);
  const updateVocabulary = useProgressStore((state) => state.updateVocabulary);
  const addReviewSession = useProgressStore((state) => state.addReviewSession);
  const updateReviewSession = useProgressStore((state) => state.updateReviewSession);

  const [currentSession, setCurrentSession] = useState<ReviewSession | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);

  const stats = useMemo(
    () => spacedRepetitionService.getStats(vocabulary),
    [vocabulary]
  );

  const dueVocabulary = useMemo(
    () => spacedRepetitionService.getDueVocabulary(vocabulary),
    [vocabulary]
  );

  const startReviewSession = useCallback((count = 10) => {
    const items = spacedRepetitionService.generateReviewItems(vocabulary, count);
    if (items.length === 0) return null;

    const session = spacedRepetitionService.createReviewSession('user', items);
    setCurrentSession(session);
    setCurrentItemIndex(0);
    setSessionComplete(false);
    return session;
  }, [vocabulary]);

  const answerCurrentItem = useCallback(
    (userAnswer: string, grade: ReviewGrade) => {
      if (!currentSession) return;

      const updatedSession = spacedRepetitionService.processAnswer(
        currentSession,
        currentItemIndex,
        userAnswer,
        grade
      );

      // Update vocabulary with new review data
      const currentItem = updatedSession.items[currentItemIndex];
      const vocab = vocabulary.find((v) => v.id === currentItem.vocabularyId);
      
      if (vocab) {
        const updatedVocab = spacedRepetitionService.applyReview(vocab, grade);
        updateVocabulary(vocab.id, updatedVocab);
      }

      setCurrentSession(updatedSession);
      updateReviewSession(updatedSession.id, updatedSession);

      // Move to next item or complete session
      if (currentItemIndex < updatedSession.items.length - 1) {
        setCurrentItemIndex(currentItemIndex + 1);
      } else {
        setSessionComplete(true);
        addReviewSession(updatedSession);
      }
    },
    [currentSession, currentItemIndex, vocabulary, updateVocabulary, updateReviewSession, addReviewSession]
  );

  const getCurrentItem = useCallback((): ReviewItem | null => {
    if (!currentSession || currentItemIndex >= currentSession.items.length) return null;
    return currentSession.items[currentItemIndex];
  }, [currentSession, currentItemIndex]);

  const getProgress = useCallback(() => {
    if (!currentSession) return { current: 0, total: 0, percentage: 0 };
    return {
      current: currentItemIndex + 1,
      total: currentSession.items.length,
      percentage: ((currentItemIndex + 1) / currentSession.items.length) * 100,
    };
  }, [currentSession, currentItemIndex]);

  const resetSession = useCallback(() => {
    setCurrentSession(null);
    setCurrentItemIndex(0);
    setSessionComplete(false);
  }, []);

  return {
    stats,
    dueVocabulary,
    currentSession,
    currentItemIndex,
    sessionComplete,
    startReviewSession,
    answerCurrentItem,
    getCurrentItem,
    getProgress,
    resetSession,
  };
}