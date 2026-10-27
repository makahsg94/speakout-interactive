// PDF.js Service for rendering and text extraction

import * as pdfjsLib from 'pdfjs-dist';
import { generateId } from './utils';

// Configure PDF.js worker - use CDN for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PDFDocument {
  pdf: pdfjsLib.PDFDocumentProxy;
  numPages: number;
  fingerprints: string[];
}

export interface PDFPageRenderOptions {
  scale?: number;
  rotation?: number;
  canvas?: HTMLCanvasElement;
  viewport?: pdfjsLib.PageViewport;
}

export interface PDFPageRenderResult {
  canvas: HTMLCanvasElement;
  viewport: pdfjsLib.PageViewport;
  textContent: any | null;
  annotations: any[] | null;
}

export interface PDFTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
  fontName: string;
}

export interface PDFSearchResult {
  pageNumber: number;
  matches: Array<{
    text: string;
    context: string;
    position: number;
  }>;
}

export interface PDFOutlineItem {
  title: string;
  pageNumber: number;
  level: number;
  items?: PDFOutlineItem[];
}

class PDFService {
  private pdfCache: Map<string, PDFDocument> = new Map();
  private pageCache: Map<string, PDFPageRenderResult> = new Map();
  private textCache: Map<number, any> = new Map();
  private maxCacheSize = 10;

  async loadDocument(url: string): Promise<PDFDocument> {
    // Check cache
    if (this.pdfCache.has(url)) {
      return this.pdfCache.get(url)!;
    }

    try {
      const loadingTask = pdfjsLib.getDocument({ url });
      const pdf = await loadingTask.promise;
      
      const fingerprints: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        fingerprints.push(String(pdf.fingerprints?.[i - 1] ?? i));
      }

      const doc: PDFDocument = {
        pdf,
        numPages: pdf.numPages,
        fingerprints,
      };

      this.pdfCache.set(url, doc);
      return doc;
    } catch (error) {
      console.error('Failed to load PDF:', error);
      throw new Error(`Failed to load PDF: ${error}`);
    }
  }

  async loadDocumentFromFile(file: File): Promise<PDFDocument> {
    const arrayBuffer = await file.arrayBuffer();
    return this.loadDocumentFromArrayBuffer(arrayBuffer);
  }

  async loadDocumentFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<PDFDocument> {
    const url = URL.createObjectURL(new Blob([arrayBuffer], { type: 'application/pdf' }));
    try {
      return await this.loadDocument(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async getPage(
    doc: PDFDocument,
    pageNumber: number,
    options: PDFPageRenderOptions = {}
  ): Promise<PDFPageRenderResult> {
    const cacheKey = `${doc.fingerprints[pageNumber - 1]}-${options.scale || 1}-${options.rotation || 0}`;
    
    if (this.pageCache.has(cacheKey)) {
      return this.pageCache.get(cacheKey)!;
    }

    const page = await doc.pdf.getPage(pageNumber);
    const viewport = page.getViewport({ 
      scale: options.scale || 1, 
      rotation: options.rotation || 0 
    });

    const canvas = options.canvas || document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const renderContext = {
      canvasContext: context,
      viewport,
    };

    await page.render(renderContext).promise;

    // Get text content
    const textContent = await page.getTextContent();
    this.textCache.set(pageNumber, textContent);

    // Get annotations
    const annotations = await page.getAnnotations();

    const result: PDFPageRenderResult = {
      canvas,
      viewport,
      textContent,
      annotations,
    };

    // Manage cache size
    if (this.pageCache.size >= this.maxCacheSize) {
      const firstKey = this.pageCache.keys().next().value;
      if (firstKey) this.pageCache.delete(firstKey);
    }
    this.pageCache.set(cacheKey, result);

    return result;
  }

  async getTextContent(doc: PDFDocument, pageNumber: number): Promise<any> {
    if (this.textCache.has(pageNumber)) {
      return this.textCache.get(pageNumber)!;
    }

    const page = await doc.pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    this.textCache.set(pageNumber, textContent);
    return textContent;
  }

  async searchText(doc: PDFDocument, query: string): Promise<PDFSearchResult[]> {
    const results: PDFSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (let i = 1; i <= doc.numPages; i++) {
      const textContent = await this.getTextContent(doc, i);
      const textItems = textContent.items as PDFTextItem[];
      const fullText = textItems.map((item) => item.str).join(' ');
      const lowerText = fullText.toLowerCase();

      const matches: PDFSearchResult['matches'] = [];
      let index = lowerText.indexOf(lowerQuery);
      
      while (index !== -1) {
        const contextStart = Math.max(0, index - 50);
        const contextEnd = Math.min(fullText.length, index + query.length + 50);
        const context = fullText.slice(contextStart, contextEnd);
        
        matches.push({
          text: query,
          context,
          position: index,
        });
        
        index = lowerText.indexOf(lowerQuery, index + 1);
      }

      if (matches.length > 0) {
        results.push({
          pageNumber: i,
          matches,
        });
      }
    }

    return results;
  }

  async getOutline(doc: PDFDocument): Promise<PDFOutlineItem[]> {
    const outline = await doc.pdf.getOutline();
    if (!outline) return [];

    const processOutline = async (items: any[]): Promise<PDFOutlineItem[]> => {
      const results: PDFOutlineItem[] = [];
      for (const item of items) {
        results.push({
          title: item.title,
          pageNumber: item.dest ? await this.getPageNumberFromDest(doc, item.dest) : 0,
          level: 1,
          items: item.items ? await processOutline(item.items) : undefined,
        });
      }
      return results;
    };

    return processOutline(outline);
  }

  private async getPageNumberFromDest(doc: PDFDocument, dest: any): Promise<number> {
    try {
      const pageIndex = await doc.pdf.getPageIndex(dest[0]);
      return pageIndex + 1;
    } catch {
      return 0;
    }
  }

  async extractPageText(doc: PDFDocument, pageNumber: number): Promise<string> {
    const textContent = await this.getTextContent(doc, pageNumber);
    const items = textContent.items as PDFTextItem[];
    return items.map((item) => item.str).join(' ');
  }

  async extractAllText(doc: PDFDocument): Promise<string[]> {
    const texts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      texts.push(await this.extractPageText(doc, i));
    }
    return texts;
  }

  getPageViewport(page: pdfjsLib.PDFPageProxy, scale: number, rotation = 0): pdfjsLib.PageViewport {
    return page.getViewport({ scale, rotation });
  }

  convertViewportToCanvasCoords(
    viewport: pdfjsLib.PageViewport,
    x: number,
    y: number
  ): { x: number; y: number } {
    return { x: viewport.transform[0] * x + viewport.transform[4], y: viewport.transform[1] * y + viewport.transform[5] };
  }

  convertCanvasToViewportCoords(
    viewport: pdfjsLib.PageViewport,
    x: number,
    y: number
  ): { x: number; y: number } {
    const [a, b, c, d, e, f] = viewport.transform as number[];
    const det = a * d - b * c;
    return {
      x: (d * (x - e) - b * (y - f)) / det,
      y: (-c * (x - e) + a * (y - f)) / det,
    };
  }

  normalizeAnnotationBounds(
    annotation: any,
    viewport: pdfjsLib.PageViewport
  ): { x: number; y: number; width: number; height: number } {
    const rect = annotation.rect;
    if (!rect) return { x: 0, y: 0, width: 0, height: 0 };

    const [x1, y1, x2, y2] = rect;
    const width = viewport.width;
    const height = viewport.height;

    return {
      x: Math.min(x1, x2) / width,
      y: Math.min(y1, y2) / height,
      width: Math.abs(x2 - x1) / width,
      height: Math.abs(y2 - y1) / height,
    };
  }

  clearCache(): void {
    this.pdfCache.clear();
    this.pageCache.clear();
    this.textCache.clear();
  }

  clearPageCache(): void {
    this.pageCache.clear();
  }

  getCachedPage(doc: PDFDocument, pageNumber: number, scale: number, rotation: number): PDFPageRenderResult | null {
    const cacheKey = `${doc.fingerprints[pageNumber - 1]}-${scale}-${rotation}`;
    return this.pageCache.get(cacheKey) || null;
  }
}

export const pdfService = new PDFService();

// React hook for PDF rendering
import { useState, useEffect, useCallback, useRef } from 'react';

export interface UsePDFReturn {
  document: PDFDocument | null;
  loading: boolean;
  error: Error | null;
  renderPage: (pageNumber: number, scale?: number, rotation?: number) => Promise<PDFPageRenderResult>;
  getTextContent: (pageNumber: number) => Promise<any>;
  search: (query: string) => Promise<PDFSearchResult[]>;
  getOutline: () => Promise<PDFOutlineItem[]>;
  numPages: number;
}

export function usePDF(url: string): UsePDFReturn {
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [numPages, setNumPages] = useState(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    let mounted = true;

    pdfService.loadDocument(url)
      .then((doc) => {
        if (mounted) {
          setDocument(doc);
          setNumPages(doc.numPages);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  const renderPage = useCallback(async (pageNumber: number, scale = 1, rotation = 0) => {
    if (!document) throw new Error('Document not loaded');
    return pdfService.getPage(document, pageNumber, { scale, rotation });
  }, [document]);

  const getTextContent = useCallback(async (pageNumber: number) => {
    if (!document) throw new Error('Document not loaded');
    return pdfService.getTextContent(document, pageNumber);
  }, [document]);

  const search = useCallback(async (query: string) => {
    if (!document) throw new Error('Document not loaded');
    return pdfService.searchText(document, query);
  }, [document]);

  const getOutline = useCallback(async () => {
    if (!document) throw new Error('Document not loaded');
    return pdfService.getOutline(document);
  }, [document]);

  return {
    document,
    loading,
    error,
    renderPage,
    getTextContent,
    search,
    getOutline,
    numPages,
  };
}

// Text layer utilities
export function renderTextLayer(
  textContent: any,
  container: HTMLElement,
  viewport: pdfjsLib.PageViewport
): void {
  container.innerHTML = '';
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = `${viewport.width}px`;
  container.style.height = `${viewport.height}px`;

  const textLayer = document.createElement('div');
  textLayer.className = 'textLayer';
  textLayer.style.position = 'absolute';
  textLayer.style.top = '0';
  textLayer.style.left = '0';
  textLayer.style.width = '100%';
  textLayer.style.height = '100%';
  textLayer.style.pointerEvents = 'none';

  const items = textContent.items as PDFTextItem[];
  
  items.forEach((item) => {
    if (!('str' in item)) return;
    
    const span = document.createElement('span');
    span.textContent = item.str;
    span.style.position = 'absolute';
    span.style.whiteSpace = 'pre';
    span.style.pointerEvents = 'auto';
    span.style.userSelect = 'text';
    
    // Apply transform
    const [a, b, c, d, e, f] = item.transform;
    const scaleX = Math.sqrt(a * a + b * b);
    const scaleY = Math.sqrt(c * c + d * d);
    const angle = Math.atan2(b, a);
    
    const x = (viewport.transform[0] * e + viewport.transform[4]) / viewport.width * 100;
    const y = (viewport.transform[1] * f + viewport.transform[5]) / viewport.height * 100;
    const width = (item.width * scaleX) / viewport.width * 100;
    const height = (item.height * scaleY) / viewport.height * 100;
    
    span.style.left = `${x}%`;
    span.style.top = `${y}%`;
    span.style.width = `${width}%`;
    span.style.height = `${height}%`;
    span.style.fontSize = `${height}%`;
    span.style.lineHeight = '1';
    span.style.transform = `rotate(${angle}rad)`;
    span.style.transformOrigin = '0 0';
    
    textLayer.appendChild(span);
  });

  container.appendChild(textLayer);
}

export function highlightTextSelection(
  container: HTMLElement,
  startOffset: number,
  endOffset: number,
  color = 'rgba(14, 165, 233, 0.3)'
): void {
  const textLayer = container.querySelector('.textLayer');
  if (!textLayer) return;

  const spans = textLayer.querySelectorAll('span');
  let currentOffset = 0;

  spans.forEach((span) => {
    const text = span.textContent || '';
    const spanStart = currentOffset;
    const spanEnd = currentOffset + text.length;

    if (spanEnd > startOffset && spanStart < endOffset) {
      const highlightStart = Math.max(0, startOffset - spanStart);
      const highlightEnd = Math.min(text.length, endOffset - spanStart);
      
      if (highlightStart < highlightEnd) {
        span.style.backgroundColor = color;
      }
    }

    currentOffset = spanEnd;
  });
}