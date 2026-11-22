'use client';

// Layer 4: Atlas View Master Orchestrator (<280 lines)
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AtlasHeader } from './atlas-header';
import { AtlasModuleSelector } from './atlas-module-selector';
import { AtlasSliceViewer } from './atlas-slice-viewer';
import { AtlasStructureSidebar } from './atlas-structure-sidebar';
import { AtlasGlobalSearchDialog } from './atlas-global-search-dialog';
import { useAtlasQuiz } from '@/hooks/use-atlas-quiz';
import { useAtlasNavSync } from '@/hooks/use-atlas-nav-sync';
import { useAtlasNavigation } from '@/hooks/use-atlas-navigation';
import { notify } from '@/services/notification.service';
import type { AtlasThemeId } from '@/lib/atlas-icon-map';
import type {
  AnatomyModuleSummary,
  AnatomyModuleDetails,
  AnatomySliceAnnotations,
} from '@/types';

interface AtlasViewProps {
  initialModules: AnatomyModuleSummary[];
}

export function AtlasView({ initialModules }: AtlasViewProps) {
  const [modules] = useState<AnatomyModuleSummary[]>(initialModules);
  const [activeCode, setActiveCode] = useState<string>(initialModules.length > 0 ? initialModules[0].code : '');
  const [moduleDetails, setModuleDetails] = useState<AnatomyModuleDetails | null>(null);
  const [activeSeriesId, setActiveSeriesId] = useState<number>(0);
  const [currentSliceIndex, setCurrentSliceIndex] = useState<number>(0);
  const [annotations, setAnnotations] = useState<AnatomySliceAnnotations>({ points: [], scout_lines: [] });
  const [isSelectorOpen, setIsSelectorOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'la'>('en');
  const [showPins, setShowPins] = useState(true);
  const [activeLayerName, setActiveLayerName] = useState<string | null>(null);
  const [maskOpacity, setMaskOpacity] = useState<number>(65);
  const [activeFilterIds, setActiveFilterIds] = useState<Set<number>>(new Set());
  const [focusedStructureId, setFocusedStructureId] = useState<number | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null);
  const [atlasTheme, setAtlasTheme] = useState<AtlasThemeId>('clay');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const el = document.getElementById('atlas-workspace-container') || document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  }, []);

  const currentSeries = useMemo(() => {
    if (!moduleDetails) return null;
    return (
      moduleDetails.series.find((s) => s.id === activeSeriesId) ||
      moduleDetails.series[0] ||
      null
    );
  }, [moduleDetails, activeSeriesId]);

  // Global & In-study navigation orchestrator
  const {
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    handleNavigateToSlice,
    handleGlobalNavigate,
  } = useAtlasNavigation({
    activeCode,
    setActiveCode,
    activeSeriesId,
    setActiveSeriesId,
    currentSeries,
    moduleDetails,
    setCurrentSliceIndex,
    setSelectedStructureId,
    setShowPins,
    setIsSelectorOpen,
  });

  // Synchronize top workstation navbar, history controls & persisted preferences
  useAtlasNavSync({
    modules, activeCode, setActiveCode, moduleDetails,
    isSelectorOpen, setIsSelectorOpen, atlasTheme, setAtlasTheme,
  });

  // Load Module Details
  useEffect(() => {
    if (!activeCode) return;
    let cancelled = false;

    async function loadModule() {
      try {
        const res = await fetch(`/api/anatomy/module/${activeCode}`);
        if (!res.ok) throw new Error('Failed to load module');
        const json = await res.json();
        if (!cancelled && json.module) {
          const mod: AnatomyModuleDetails = json.module;
          setModuleDetails(mod);
          setActiveFilterIds(new Set(mod.filters.map((f) => f.id)));
          if (mod.series.length > 0) {
            setActiveSeriesId(mod.series[0].id);
            setCurrentSliceIndex(0);
          }
        }
      } catch (err) {
        console.error(err);
        notify.error('Failed to load anatomy module');
      }
    }

    loadModule();
    return () => {
      cancelled = true;
    };
  }, [activeCode]);

  // Series-wide annotation cache for 0ms instantaneous slice lookups
  const seriesAnnotationsCache = useRef<Map<number, Record<number, AnatomySliceAnnotations>>>(new Map());

  // Load Batch Series Annotations in 1 single HTTP request
  useEffect(() => {
    if (!activeSeriesId) return;
    let cancelled = false;

    async function loadSeriesAnnotations() {
      if (seriesAnnotationsCache.current.has(activeSeriesId)) {
        const cached = seriesAnnotationsCache.current.get(activeSeriesId)!;
        const currentSlice = currentSeries?.slices[currentSliceIndex];
        if (currentSlice && cached[currentSlice.id]) {
          setAnnotations(cached[currentSlice.id]);
        }
        return;
      }

      try {
        const res = await fetch(`/api/anatomy/series/${activeSeriesId}/annotations`);
        if (!res.ok) throw new Error('Failed to load series annotations');
        const json = await res.json();
        if (!cancelled && json.success && json.annotations) {
          seriesAnnotationsCache.current.set(activeSeriesId, json.annotations);
          const currentSlice = currentSeries?.slices[currentSliceIndex];
          if (currentSlice && json.annotations[currentSlice.id]) {
            setAnnotations(json.annotations[currentSlice.id]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadSeriesAnnotations();
    return () => {
      cancelled = true;
    };
  }, [activeSeriesId, currentSeries, currentSliceIndex]);

  // Synchronize Annotations on Slice Change (0ms Instant RAM Lookup)
  useEffect(() => {
    if (!currentSeries || !currentSeries.slices[currentSliceIndex]) return;
    const sliceId = currentSeries.slices[currentSliceIndex].id;
    const seriesMap = seriesAnnotationsCache.current.get(activeSeriesId);
    if (seriesMap && seriesMap[sliceId]) {
      setAnnotations(seriesMap[sliceId]);
      return;
    }

    let cancelled = false;
    fetch(`/api/anatomy/slice/${sliceId}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled && json.points) {
          setAnnotations({ points: json.points, scout_lines: json.scout_lines || [] });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentSeries, currentSliceIndex, activeSeriesId]);

  // Category Filter Handlers
  const handleToggleFilter = useCallback((filterId: number) => {
    setActiveFilterIds((prev) => {
      const next = new Set(prev);
      if (next.has(filterId)) next.delete(filterId);
      else next.add(filterId);
      return next;
    });
  }, []);

  const visiblePoints = useMemo(() => {
    if (!activeFilterIds.size) return [];
    return annotations.points.filter((pt) => !pt.filter_id || activeFilterIds.has(pt.filter_id));
  }, [annotations.points, activeFilterIds]);

  // Self Quiz Hook
  const {
    isQuizMode,
    setIsQuizMode,
    quizScore,
    quizTarget,
    quizFeedback,
    selectNextQuizTarget,
    handleQuizPinClick,
  } = useAtlasQuiz(visiblePoints, currentSliceIndex);

  return (
    <div id="atlas-workspace-container" className="flex h-full w-full flex-col overflow-hidden bg-background">
      {!isSelectorOpen && (
        <AtlasHeader
          activeModule={moduleDetails}
          activeSeriesId={activeSeriesId}
          onSelectSeries={(id) => { setActiveSeriesId(id); setCurrentSliceIndex(0); }}
          isQuizMode={isQuizMode}
          onToggleQuiz={() => setIsQuizMode(!isQuizMode)}
          language={language}
          onToggleLanguage={() => setLanguage(language === 'en' ? 'la' : 'en')}
          showPins={showPins}
          onTogglePins={() => setShowPins(!showPins)}
          onChangeModuleClick={() => setIsSelectorOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          activePinsCount={visiblePoints.length}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        />
      )}

      {/* Main Workspace Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {isSelectorOpen ? (
          <AtlasModuleSelector
            modules={modules}
            selectedCode={activeCode}
            currentTheme={atlasTheme}
            onSelectModule={(code) => {
              setActiveCode(code);
              setIsSelectorOpen(false);
            }}
          />
        ) : (
          <>
            {currentSeries ? (
              <AtlasSliceViewer
                moduleCode={activeCode}
                series={currentSeries}
                seriesList={moduleDetails?.series || []}
                onSelectSeries={(id) => { setActiveSeriesId(id); setCurrentSliceIndex(0); }}
                currentSliceIndex={currentSliceIndex}
                onSliceChange={setCurrentSliceIndex}
                annotations={{ points: visiblePoints, scout_lines: annotations.scout_lines }}
                layers={moduleDetails?.layers || []}
                activeLayerName={activeLayerName}
                onSelectLayer={setActiveLayerName}
                maskOpacity={maskOpacity}
                onMaskOpacityChange={setMaskOpacity}
                focusedStructureId={focusedStructureId}
                selectedStructureId={selectedStructureId}
                onSelectStructure={setSelectedStructureId}
                language={language}
                onToggleLanguage={() => setLanguage(language === 'en' ? 'la' : 'en')}
                showPins={showPins} onTogglePins={() => setShowPins(!showPins)}
                isQuizMode={isQuizMode} onToggleQuiz={() => setIsQuizMode(!isQuizMode)}
                quizTargetStructureId={quizTarget?.structure_id}
                onQuizPinClick={handleQuizPinClick}
                quizFeedback={quizFeedback}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                Select an anatomical module to begin.
              </div>
            )}

            {isSidebarOpen && (
              <div
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
              />
            )}

            <AtlasStructureSidebar
              annotations={annotations}
              selectedStructureId={selectedStructureId}
              onSelectStructure={setSelectedStructureId}
              onHoverStructure={setFocusedStructureId}
              language={language}
              filters={moduleDetails?.filters || []}
              activeFilterIds={activeFilterIds}
              onToggleFilter={handleToggleFilter}
              onSelectAllFilters={() => moduleDetails && setActiveFilterIds(new Set(moduleDetails.filters.map((f) => f.id)))}
              onDeselectAllFilters={() => setActiveFilterIds(new Set())}
              onSoloFilter={(id) => setActiveFilterIds(new Set([id]))}
              layers={moduleDetails?.layers || []}
              activeLayerName={activeLayerName}
              onSelectLayer={setActiveLayerName}
              maskOpacity={maskOpacity}
              onMaskOpacityChange={setMaskOpacity}
              isQuizMode={isQuizMode} quizTarget={quizTarget} quizScore={quizScore}
              onNextQuizQuestion={selectNextQuizTarget}
              modules={modules} activeModuleCode={activeCode}
              onSelectModule={(code) => setActiveCode(code)}
              currentTheme={atlasTheme} isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              onNavigateToSlice={handleNavigateToSlice}
            />
          </>
        )}
      </div>

      <AtlasGlobalSearchDialog
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onNavigateToTarget={handleGlobalNavigate}
        currentLanguage={language}
      />
    </div>
  );
}
