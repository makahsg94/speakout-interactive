// Utility functions for Speakout Interactive

import type { SelectionState } from '@/types';

export function generateId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

export function normalizeRect(rect: DOMRect, containerRect: DOMRect) {
  return {
    x: (rect.left - containerRect.left) / containerRect.width,
    y: (rect.top - containerRect.top) / containerRect.height,
    width: rect.width / containerRect.width,
    height: rect.height / containerRect.height,
  };
}

export function denormalizeRect(normRect: { x: number; y: number; width: number; height: number }, containerRect: DOMRect) {
  return {
    left: containerRect.left + normRect.x * containerRect.width,
    top: containerRect.top + normRect.y * containerRect.height,
    width: normRect.width * containerRect.width,
    height: normRect.height * containerRect.height,
  };
}

export function getTextSelection(): SelectionState | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return null;
  
  const text = selection.toString().trim();
  if (!text || text.length > 500) return null; // Limit selection length
  
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  return {
    text,
    rect,
    pageNumber: 0, // Will be set by caller
    timestamp: Date.now(),
  };
}

export function clearSelection(): void {
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
}

export function isRTL(text: string): boolean {
  const rtlChars = /[\u0590-\u083F]|[\u08A0-\u08FF]|[\uFB1D-\uFDFF]|[\uFE70-\uFEFF]/;
  return rtlChars.test(text);
}

export function detectLanguage(text: string): 'en' | 'ar' | 'mixed' {
  const enChars = (text.match(/[a-zA-Z]/g) || []).length;
  const arChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  
  if (enChars > arChars * 2) return 'en';
  if (arChars > enChars * 2) return 'ar';
  return 'mixed';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parsePageNumber(str: string): number {
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export function getUnitFromPage(pageNumber: number, units: Array<{ startPage: number; endPage: number; id: string }>): string | null {
  const unit = units.find((u) => pageNumber >= u.startPage && pageNumber <= u.endPage);
  return unit?.id || null;
}

export function getLessonFromPage(pageNumber: number, lessons: Array<{ startPage: number; endPage: number; id: string }>): string | null {
  const lesson = lessons.find((l) => pageNumber >= l.startPage && pageNumber <= l.endPage);
  return lesson?.id || null;
}

export function calculateReadingPosition(page: number, totalPages: number): number {
  if (totalPages <= 1) return 100;
  return Math.round(((page - 1) / (totalPages - 1)) * 100);
}

export function estimateReadingTime(wordCount: number, wpm = 200): number {
  return Math.ceil(wordCount / wpm);
}

export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length).trim() + suffix;
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map((word) => capitalizeFirst(word))
    .join(' ');
}

export function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
    groups[groupKey] = groups[groupKey] || [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T | ((item: T) => number | string), direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return direction === 'asc' ? comparison : -comparison;
  });
}

export function uniqueBy<T>(array: T[], key: keyof T | ((item: T) => string)): T[] {
  const seen = new Set<string>();
  return array.filter((item) => {
    const k = typeof key === 'function' ? key(item) : String(item[key]);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) result[key] = obj[key];
  });
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  return fn().catch((err) => {
    if (retries <= 0) throw err;
    return sleep(delay).then(() => retry(fn, retries - 1, delay * 2));
  });
}

export function createBlobUrl(data: Blob | BufferSource, type: string): string {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  return URL.createObjectURL(blob);
}

export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function getContrastColor(hexColor: string): '#000000' | '#ffffff' {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}