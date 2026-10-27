// Sidebar Navigation Component

import React, { useState } from 'react';
import { useContentStore, useUIStore, useProgressStore } from '@/stores';
import type { Unit, Lesson } from '@/types';
import { ChevronRight, ChevronDown, BookOpen, CheckCircle, Circle, Bookmark, Award, BarChart2, Settings } from 'lucide-react';

interface SidebarProps {
  editionId: string;
  onUnitSelect: (unitId: string) => void;
  onLessonSelect: (lessonId: string) => void;
  onPageSelect: (page: number) => void;
}

export function Sidebar({ editionId, onUnitSelect, onLessonSelect, onPageSelect }: SidebarProps) {
  const { sidebarCollapsed, setSidebarCollapsed, currentUnitId, currentLessonId, currentPage } = useUIStore();
  const { editions } = useContentStore();
  const { progress } = useProgressStore();

  const edition = editions[editionId];
  const editionUnits = edition?.units || [];
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set());

  const toggleUnit = (unitId: string) => {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const isUnitCompleted = (unitId: string) => {
    return progress?.completedUnits?.includes(unitId) || false;
  };

  const isLessonCompleted = (lessonId: string) => {
    return progress?.completedLessons?.includes(lessonId) || false;
  };

  const getUnitProgress = (unit: Unit) => {
    const completedLessons = unit.lessons.filter((l) => isLessonCompleted(l.id)).length;
    return `${completedLessons}/${unit.lessons.length}`;
  };

  if (sidebarCollapsed) {
    return (
      <aside className="sidebar w-16 border-r border-neutral-200 bg-white flex flex-col">
        <div className="p-3 flex items-center justify-center border-b border-neutral-200">
          <BookOpen className="w-6 h-6 text-primary-600" />
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {editionUnits.map((unit: Unit) => (
            <button
              key={unit.id}
              onClick={() => onUnitSelect(unit.id)}
              className={`w-full p-2 rounded-lg transition-colors flex flex-col items-center gap-1 ${
                currentUnitId === unit.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
              title={unit.title}
            >
              <span className="font-medium text-sm">{unit.number}</span>
              <span className="text-xs truncate w-full text-center">{unit.title}</span>
              {isUnitCompleted(unit.id) && <CheckCircle className="w-4 h-4 text-green-500" />}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-neutral-200">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="btn-ghost w-full justify-center p-2"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar w-72 border-r border-neutral-200 bg-white flex flex-col">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary-600" />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-neutral-900 truncate">{edition?.title || 'Speakout'}</h2>
            <p className="text-xs text-neutral-500">{edition?.level} • {edition?.year}</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarCollapsed(true)}
          className="btn-ghost p-1.5"
          aria-label="Collapse sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-neutral-200 px-3 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'units', label: 'Units', icon: BookOpen },
            { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
            { id: 'progress', label: 'Progress', icon: BarChart2 },
            { id: 'vocabulary', label: 'Vocabulary', icon: Award },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              className="btn-ghost px-3 py-1.5 text-sm whitespace-nowrap flex items-center gap-2"
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Units List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2" aria-label="Course units">
        {editionUnits.map((unit: Unit) => {
          const expanded = expandedUnits.has(unit.id);
          const completed = isUnitCompleted(unit.id);

          return (
            <div key={unit.id} className="group">
              <button
                onClick={() => toggleUnit(unit.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                  currentUnitId === unit.id
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                    completed
                      ? 'bg-green-100 text-green-700'
                      : currentUnitId === unit.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {completed ? <CheckCircle className="w-5 h-5" /> : unit.number}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{unit.title}</p>
                    <p className="text-xs text-neutral-500">{getUnitProgress(unit)} lessons</p>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                />
              </button>

              {expanded && (
                <div className="ml-11 mt-1 space-y-1 border-l-2 border-neutral-200 pl-3">
                  {unit.lessons.map((lesson: Lesson) => {
                    const lessonCompleted = isLessonCompleted(lesson.id);
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => onLessonSelect(lesson.id)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors ${
                          currentLessonId === lesson.id
                            ? 'bg-primary-50 text-primary-700'
                            : lessonCompleted
                            ? 'text-green-700 hover:bg-green-50'
                            : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                          lessonCompleted
                            ? 'bg-green-100'
                            : currentLessonId === lesson.id
                            ? 'bg-primary-100'
                            : 'bg-neutral-100'
                        }`}>
                          {lessonCompleted ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            lesson.number
                          )}
                        </span>
                        <span className="truncate flex-1">{lesson.title}</span>
                        {lesson.type !== 'review' && (
                          <span className="text-xs px-1.5 py-0.5 bg-neutral-200 rounded capitalize">
                            {lesson.type}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {editionUnits.length === 0 && (
          <div className="text-center py-8 text-neutral-500">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
            <p>No units available</p>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-neutral-200">
        <div className="space-y-2">
          <button className="btn-secondary w-full justify-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Learning Dashboard
          </button>
          <button className="btn-ghost w-full justify-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>
    </aside>
  );
}

// Mobile Sidebar Overlay
export function MobileSidebarOverlay({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="sidebar w-72 z-40">
        <div className="panel-header">
          <h2 className="font-semibold">Menu</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  );
}