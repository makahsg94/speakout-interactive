// Image-based PDF Viewer - loads pre-rendered page images

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUIStore } from '@/stores';
import { useContentStore } from '@/stores';
import { audioService } from '@/lib/audio-service';
import { videoService } from '@/lib/video-service';
import type { PageAnnotation, AudioFile, VideoFile } from '@/types';
import { ZoomIn, ZoomOut, RotateCw, Maximize, Minimize, Search, ChevronLeft, ChevronRight, Volume2, Mic, Play, Pause, X, Loader2 } from 'lucide-react';
import searchIndex from '@/assets/pdf-extracted/search-index.json';

interface PDFViewerProps {
  pdfUrl: string;
  annotations?: PageAnnotation[];
  onPageChange?: (page: number) => void;
  onAnnotationClick?: (annotation: PageAnnotation) => void;
  onTextSelect?: (text: string, rect: DOMRect, pageNumber: number) => void;
  className?: string;
}

export function PDFViewer({
  pdfUrl,
  annotations = [],
  onPageChange,
  onAnnotationClick,
  onTextSelect,
  className = '',
}: PDFViewerProps) {
  const {
    viewport,
    setViewport,
    selection,
    setSelection,
    popup,
    setPopup,
    closePopup,
    fullscreen,
    setFullscreen,
    audioPlayer,
    videoPlayer,
    setAudioPlayer,
    setVideoPlayer,
  } = useUIStore();

  const { audioFiles, videoFiles } = useContentStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ page: number; context: string }>>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [totalPages, setTotalPages] = useState(136);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<AudioFile | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);

  // Image URL for current page
  const baseUrl = import.meta.env.BASE_URL?.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL || '/'}`
  const imageUrl = `${baseUrl}pages/page_${String(currentPage).padStart(3, '0')}.jpg`

  // Load total pages on mount
  useEffect(() => {
    // Could fetch from manifest, for now hardcoded
    setTotalPages(136);
  }, []);

  // Sync with store viewport page
  useEffect(() => {
    if (viewport.page && viewport.page !== currentPage) {
      setCurrentPage(viewport.page);
      setImageLoaded(false);
      setImageError(null);
    }
  }, [viewport.page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Get audio/video files for current page
  const pageAudio = Object.values(audioFiles).filter((a: any) => a.pageId === `page-${currentPage}`);
  const pageVideo = Object.values(videoFiles).filter((v: any) => v.pageId === `page-${currentPage}`);

  // Load audio when clicked
  const handlePlayAudio = useCallback((audio: AudioFile) => {
    setCurrentAudio(audio);
    setShowAudioPlayer(true);
    audioService.load(audio).catch(console.error);
  }, []);

  // Load video when clicked
  const handlePlayVideo = useCallback((video: VideoFile) => {
    setCurrentVideo(video);
    setShowVideoPlayer(true);
    videoService.load(video).catch(console.error);
  }, []);

  // Handle page change
  const goToPage = useCallback(
    (page: number) => {
      const clampedPage = Math.max(1, Math.min(totalPages, page));
      setCurrentPage(clampedPage);
      setViewport({ page: clampedPage });
      onPageChange?.(clampedPage);
      setImageLoaded(false);
      setImageError(null);
    },
    [totalPages, setViewport, onPageChange]
  );

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  // Image load handlers
  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(null);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError('Failed to load page image');
  }, []);

  // Zoom controls
  const zoomIn = useCallback(() => {
    const newScale = Math.min(scale * 1.2, 3);
    setScale(newScale);
    setViewport({ zoom: newScale });
  }, [scale, setViewport]);

  const zoomOut = useCallback(() => {
    const newScale = Math.max(scale / 1.2, 0.3);
    setScale(newScale);
    setViewport({ zoom: newScale });
  }, [scale, setViewport]);

  const zoomReset = useCallback(() => {
    setScale(1);
    setViewport({ zoom: 1 });
  }, [setViewport]);

  const zoomFitWidth = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32;
    const imgWidth = imgRef.current.naturalWidth;
    const newScale = containerWidth / imgWidth;
    setScale(newScale);
    setViewport({ zoom: newScale });
  }, [setViewport]);

  const zoomFitPage = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const containerHeight = containerRef.current.clientHeight - 100;
    const containerWidth = containerRef.current.clientWidth - 32;
    const imgHeight = imgRef.current.naturalHeight;
    const imgWidth = imgRef.current.naturalWidth;
    const scaleHeight = containerHeight / imgHeight;
    const scaleWidth = containerWidth / imgWidth;
    const newScale = Math.min(scaleHeight, scaleWidth);
    setScale(newScale);
    setViewport({ zoom: newScale });
  }, [setViewport]);

  const rotate = useCallback(() => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    setViewport({ rotation: newRotation as 0 | 90 | 180 | 270 });
  }, [rotation, setViewport]);

  const toggleFullscreen = useCallback(() => {
    setFullscreen(!fullscreen);
  }, [fullscreen, setFullscreen]);

  // Search using extracted text index
  const handleSearch = useCallback(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const words = q.split(/\\s+/).filter(Boolean);
    const pageSets = words.map((w) => (searchIndex as Record<string, number[]>)[w] || []);
    let pages: number[] = [];
    if (pageSets.length === 1) {
      pages = pageSets[0];
    } else if (pageSets.length > 1) {
      const sets = pageSets.map((arr) => new Set(arr));
      pages = [...sets[0]].filter((p) => sets.slice(1).every((s) => s.has(p)));
    }
    pages = [...new Set(pages)].sort((a, b) => a - b).slice(0, 100);
    const results = pages.map((p) => ({ page: p, context: `Page ${p}` }));
    setSearchResults(results);
    setShowSearch(true);
  }, [searchQuery]);

  const goToSearchResult = useCallback(
    (page: number) => {
      goToPage(page);
      setShowSearch(false);
    },
    [goToPage]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault();
          nextPage();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          prevPage();
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages);
          break;
        case '+':
        case '=':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomReset();
          }
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowSearch(true);
          }
          break;
        case 'Escape':
          setShowSearch(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage, goToPage, totalPages, zoomIn, zoomOut, zoomReset, setShowSearch]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col h-full bg-neutral-100 ${fullscreen ? 'fixed inset-0 z-50 bg-white' : ''} ${className}`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage <= 1}
            className="btn-ghost p-2 disabled:opacity-50"
            aria-label="First page"
            title="First page"
          >
            <ChevronLeft className="w-5 h-5" />
            <ChevronLeft className="w-5 h-5 -ml-3" />
          </button>
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="btn-ghost p-2 disabled:opacity-50"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="btn-ghost p-2 disabled:opacity-50"
            aria-label="Next page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage >= totalPages}
            className="btn-ghost p-2 disabled:opacity-50"
            aria-label="Last page"
            title="Last page"
          >
            <ChevronRight className="w-5 h-5" />
            <ChevronRight className="w-5 h-5 -ml-3" />
          </button>
          <div className="w-px h-6 bg-neutral-200 mx-2" />
          <span className="text-sm font-medium text-neutral-700">
            Page {currentPage} of {totalPages}
          </span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={() => goToPage(parseInt(pageInput) || currentPage)}
            onKeyDown={(e) => e.key === 'Enter' && goToPage(parseInt(pageInput) || currentPage)}
            className="w-20 px-2 py-1 text-center text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Go to page"
          />
          <input
            type="range"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => goToPage(parseInt(e.target.value))}
            className="w-40 accent-primary-600"
            aria-label="Page slider"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
            <button onClick={zoomOut} className="btn-ghost p-1.5" aria-label="Zoom out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm font-mono text-neutral-700">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={zoomIn} className="btn-ghost p-1.5" aria-label="Zoom in">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={zoomFitWidth} className="btn-ghost p-1.5" aria-label="Fit width">
              <Maximize className="w-4 h-4" />
            </button>
            <button onClick={zoomFitPage} className="btn-ghost p-1.5" aria-label="Fit page">
              <Minimize className="w-4 h-4" />
            </button>
            <button onClick={() => setRotation((r) => (r + 90) % 360)} className="btn-ghost p-1.5" aria-label="Rotate">
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="w-px h-6 bg-neutral-200 mx-2" />

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="btn-ghost p-2"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="btn-ghost p-2"
            aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="p-3 bg-white border-b border-neutral-200 sticky top-0 z-10 animate-slide-down">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search in book..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="input flex-1"
            />
            <button className="btn-primary px-3 py-1.5 text-sm" onClick={handleSearch}>
              Search
            </button>
            <button className="btn-ghost p-2" onClick={() => setShowSearch(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto border border-neutral-200 rounded-lg">
              <p className="px-3 py-1 text-xs text-neutral-500 bg-neutral-50">
                {searchResults.length} page(s) found
              </p>
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { goToPage(r.page); setShowSearch(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 border-b border-neutral-100 last:border-b-0"
                >
                  Page {r.page}
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="mt-2 text-sm text-neutral-500 px-1">No results found.</p>
          )}
        </div>
      )}

      {/* Image Container */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
        {/* Loading indicator */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-primary-600 border-t-transparent mx-auto mb-2"></div>
              <p className="text-neutral-600 text-sm">Loading page {currentPage}...</p>
            </div>
          </div>
        )}

        {/* Error display */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-20 p-8">
            <div className="text-center max-w-md">
              <svg className="w-14 h-14 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-600 font-medium mb-2">Failed to load page image</p>
              <p className="text-sm text-neutral-600 mb-4">{imageError}</p>
              <button onClick={() => { setImageError(null); setImageLoaded(false); }} className="btn-primary">Retry</button>
            </div>
          </div>
        )}

        {/* Page Image */}
        <div
          className="pdf-page-container relative"
          style={{
            width: imgRef.current ? `${imgRef.current.width * scale}px` : 'auto',
            height: imgRef.current ? `${imgRef.current.height * scale}px` : 'auto',
          }}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt={`Page ${currentPage}`}
            className="pdf-canvas"
            style={{
              display: 'block',
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />

          {/* Annotation Layer */}
          <div ref={annotationLayerRef} style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto',
          }} />
        </div>
      </div>

      {/* Audio/Video Floating Indicators */}
      {pageAudio.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40" style={{ pointerEvents: 'auto' }}>
          {pageAudio.map((audio: AudioFile) => (
            <button
              key={audio.id}
              onClick={() => handlePlayAudio(audio)}
              className="group flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-neutral-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ pointerEvents: 'auto', zIndex: 50 }}
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left hidden group-hover:block sm:block">
                <p className="text-sm font-semibold text-neutral-900">{audio.title}</p>
                <p className="text-xs text-neutral-500">{audio.type} • {audio.duration ? `${Math.floor(audio.duration / 60)}:${String(audio.duration % 60).padStart(2, '0')}` : ''}</p>
              </div>
              <Play className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            </button>
          ))}
        </div>
      )}

      {pageVideo.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40" style={{ pointerEvents: 'auto' }}>
          {pageVideo.map((video: VideoFile) => (
            <button
              key={video.id}
              onClick={() => handlePlayVideo(video)}
              className="group flex items-center gap-2 px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-neutral-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ pointerEvents: 'auto', zIndex: 50 }}
            >
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Mic className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-left hidden group-hover:block sm:block">
                <p className="text-sm font-semibold text-neutral-900">{video.title}</p>
                <p className="text-xs text-neutral-500">{video.type} • {video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : ''}</p>
              </div>
              <Play className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
            </button>
          ))}
        </div>
      )}

      {/* Audio Player Modal */}
      {showAudioPlayer && currentAudio && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => { setShowAudioPlayer(false); setCurrentAudio(null); audioService.stop(); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Volume2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{currentAudio.title}</p>
                  <p className="text-sm text-neutral-500 capitalize">{currentAudio.type}</p>
                </div>
              </div>
              <button onClick={() => { setShowAudioPlayer(false); setCurrentAudio(null); audioService.stop(); }} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={audioPlayer.volume}
                    onChange={(e) => audioService.setVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Playback Speed</label>
                  <select
                    value={audioPlayer.playbackRate}
                    onChange={(e) => audioService.setPlaybackRate(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1x (Normal)</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </div>

                {/* Progress Bar */}
                <div className="pt-4">
                  <div className="flex items-center justify-between text-sm text-neutral-500 mb-1">
                    <span>{audioPlayer.currentTime > 0 ? `${Math.floor(audioPlayer.currentTime / 60)}:${String(Math.floor(audioPlayer.currentTime) % 60).padStart(2, '0')}` : '0:00'}</span>
                    <span>{audioPlayer.duration > 0 ? `${Math.floor(audioPlayer.duration / 60)}:${String(Math.floor(audioPlayer.duration) % 60).padStart(2, '0')}` : '--:--'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={audioPlayer.duration || 100}
                    step="1"
                    value={audioPlayer.currentTime}
                    onChange={(e) => audioService.seek(parseFloat(e.target.value))}
                    className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button
                    onClick={() => audioService.skipBackward(10)}
                    className="p-3 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    aria-label="Rewind 10s"
                  >
                    <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={() => audioPlayer.playing ? audioService.pause() : audioService.play()}
                    className="p-4 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg"
                    aria-label={audioPlayer.playing ? 'Pause' : 'Play'}
                  >
                    {audioPlayer.playing ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>
                  <button
                    onClick={() => audioService.skipForward(10)}
                    className="p-3 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    aria-label="Forward 10s"
                  >
                    <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showVideoPlayer && currentVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in" onClick={() => { setShowVideoPlayer(false); setCurrentVideo(null); videoService.stop(); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Mic className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">{currentVideo.title}</p>
                  <p className="text-sm text-neutral-500 capitalize">{currentVideo.type}</p>
                </div>
              </div>
              <button onClick={() => { setShowVideoPlayer(false); setCurrentVideo(null); videoService.stop(); }} className="p-2 rounded-lg hover:bg-neutral-100 transition-colors">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="aspect-video bg-black relative">
              <div ref={(el) => { if (el) videoService.mount(el); }} className="w-full h-full" />
            </div>

            <div className="p-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => videoService.skipBackward(10)}
                  className="p-3 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                  aria-label="Rewind 10s"
                >
                  <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
                </button>
                <button
                  onClick={() => videoPlayer.playing ? videoService.pause() : videoService.play()}
                  className="p-4 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg"
                  aria-label={videoPlayer.playing ? 'Pause' : 'Play'}
                >
                  {videoPlayer.playing ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  )}
                </button>
                <button
                  onClick={() => videoService.skipForward(10)}
                  className="p-3 rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
                  aria-label="Forward 10s"
                >
                  <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <span>{videoPlayer.currentTime > 0 ? `${Math.floor(videoPlayer.currentTime / 60)}:${String(Math.floor(videoPlayer.currentTime) % 60).padStart(2, '0')}` : '0:00'}</span>
                  <span className="mx-2">/</span>
                  <span>{videoPlayer.duration > 0 ? `${Math.floor(videoPlayer.duration / 60)}:${String(Math.floor(videoPlayer.duration) % 60).padStart(2, '0')}` : '--:--'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={videoPlayer.duration || 100}
                  step="1"
                  value={videoPlayer.currentTime}
                  onChange={(e) => videoService.seek(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-red-500 max-w-xs"
                />
                <div className="flex items-center gap-2 ml-4">
                  <label className="flex items-center gap-1.5 text-sm text-neutral-600">
                    <input
                      type="checkbox"
                      checked={videoPlayer.captions}
                      onChange={(e) => videoService.toggleCaptions()}
                      className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>CC</span>
                  </label>
                  <button
                    onClick={() => videoService.toggleFullscreen()}
                    className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                    aria-label="Fullscreen"
                  >
                    <Maximize className="w-5 h-5 text-neutral-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}