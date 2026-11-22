'use client';

// Layer 4: Atlas Callout Overlay with Cached Sub-pixel Geometry (<200 lines)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  pickTopPrioritized,
  relaxVerticalPositions,
  computeCalloutPaths,
  brightenAnatomyColor,
  getResponsiveLayoutConfig,
  type LayoutPoint,
  type ResponsiveLayoutConfig,
} from '@/lib/anatomy-layout';
import { AtlasCalloutItem } from './atlas-callout-item';
import type { AnatomyAnnotationPoint, AnatomyScoutLine } from '@/types';

interface AtlasCalloutOverlayProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  imageRef: React.RefObject<HTMLImageElement | null>;
  points: AnatomyAnnotationPoint[];
  scoutLines?: AnatomyScoutLine[];
  selectedStructureId?: number | null;
  focusedStructureId?: number | null;
  onSelectStructure: (id: number | null) => void;
  language: 'en' | 'la';
  showPins: boolean;
  isQuizMode: boolean;
  quizTargetStructureId?: number | null;
  onQuizPinClick?: (id: number) => void;
  zoom?: number;
  pan?: { x: number; y: number };
  transformKey?: string;
  textSize?: 'sm' | 'md' | 'lg';
}

interface ViewportGeo {
  cWidth: number;
  cHeight: number;
  iw: number;
  ih: number;
}

export function AtlasCalloutOverlay({
  containerRef,
  imageRef,
  points,
  selectedStructureId,
  focusedStructureId,
  onSelectStructure,
  language,
  showPins,
  isQuizMode,
  onQuizPinClick,
  zoom = 1.0,
  pan = { x: 0, y: 0 },
  transformKey,
  textSize = 'md',
}: AtlasCalloutOverlayProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [geo, setGeo] = useState<ViewportGeo>({ cWidth: 0, cHeight: 0, iw: 0, ih: 0 });

  // When active structure is deselected, purge residual hover state
  useEffect(() => {
    if (selectedStructureId === null || selectedStructureId === undefined) {
      setHoveredId(null);
    }
  }, [selectedStructureId]);

  // Measure base container and image layout boxes via ResizeObserver (Zero Forced Reflows)
  const updateDimensions = useCallback(() => {
    const cEl = containerRef.current;
    const imgEl = imageRef.current;
    if (!cEl || !imgEl) return;
    const cWidth = cEl.clientWidth;
    const cHeight = cEl.clientHeight;
    const iw = imgEl.clientWidth || (imgEl.naturalWidth ? Math.min(cWidth - 80, imgEl.naturalWidth) : 0);
    const ih = imgEl.clientHeight || (imgEl.naturalHeight ? Math.min(cHeight - 80, imgEl.naturalHeight) : 0);
    if (cWidth && cHeight && iw && ih) {
      setGeo((prev) => (prev.cWidth === cWidth && prev.cHeight === cHeight && prev.iw === iw && prev.ih === ih ? prev : { cWidth, cHeight, iw, ih }));
    }
  }, [containerRef, imageRef]);

  useEffect(() => {
    updateDimensions();
    const cEl = containerRef.current;
    const imgEl = imageRef.current;
    window.addEventListener('resize', updateDimensions);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateDimensions) : null;
    if (cEl && ro) ro.observe(cEl);
    if (imgEl && ro) ro.observe(imgEl);
    if (imgEl) imgEl.addEventListener('load', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (imgEl) imgEl.removeEventListener('load', updateDimensions);
      ro?.disconnect();
    };
  }, [containerRef, imageRef, updateDimensions]);

  // Compute callout coordinates, leader paths, and brackets (Zero Layout Thrashing)
  const callouts = useMemo(() => {
    if (!showPins || !points.length) return [];

    let { cWidth, cHeight, iw, ih } = geo;
    if (!cWidth || !iw) {
      if (containerRef.current && imageRef.current) {
        cWidth = containerRef.current.clientWidth;
        cHeight = containerRef.current.clientHeight;
        iw = imageRef.current.clientWidth;
        ih = imageRef.current.clientHeight;
      }
    }
    if (!cWidth || !cHeight || !iw || !ih) return [];

    const leftOff = (cWidth - iw) / 2;
    const topOff = (cHeight - ih) / 2;
    const cx = cWidth / 2;
    const cy = cHeight / 2;

    const responsiveConfig = getResponsiveLayoutConfig(cWidth || 1000, textSize);
    const isNarrow = cWidth < 640;
    const topMin = Math.max(20, Math.round(18 * (cWidth >= 1600 ? 1.35 : 1.0)));
    const bottomMax = Math.min(cHeight - 20, cHeight - Math.round(18 * (cWidth >= 1600 ? 1.35 : 1.0)));
    const availableHeight = Math.max(120, bottomMax - topMin);
    const maxPerSide = isNarrow
      ? Math.min(9, Math.max(3, Math.floor(availableHeight / responsiveConfig.minGap)))
      : Math.min(14, Math.max(5, Math.floor(availableHeight / responsiveConfig.minGap)));

    let leftList: LayoutPoint[] = [];
    let rightList: LayoutPoint[] = [];

    for (const pt of points) {
      const px0 = leftOff + pt.x_norm * iw;
      const py0 = topOff + pt.y_norm * ih;
      // Mathematical sub-pixel projection matching CSS transform matrix
      const px = cx + (px0 - cx) * zoom + pan.x;
      const py = cy + (py0 - cy) * zoom + pan.y;

      const item: LayoutPoint = {
        id: pt.point_id,
        structure_id: pt.structure_id,
        filter_id: pt.filter_id,
        name_en: pt.name_en,
        name_la: pt.name_la,
        priority: pt.priority,
        px,
        py,
        isLeft: pt.x_norm < 0.5,
        color: brightenAnatomyColor(pt.color),
      };
      if (item.isLeft) leftList.push(item);
      else rightList.push(item);
    }

    const sel = selectedStructureId ?? focusedStructureId;
    leftList = pickTopPrioritized(leftList, maxPerSide, sel);
    rightList = pickTopPrioritized(rightList, maxPerSide, sel);

    relaxVerticalPositions(leftList, topMin, bottomMax, responsiveConfig.minGap);
    relaxVerticalPositions(rightList, topMin, bottomMax, responsiveConfig.minGap);

    const leftMarginSpace = leftOff;
    const rightMarginSpace = cWidth - (leftOff + iw);

    // Dynamic responsive margin placement utilizing available canvas space
    let leftMarginX = leftOff - 14;
    let rightMarginX = leftOff + iw + 14;

    if (isNarrow) {
      leftMarginX = Math.max(14, Math.min(leftOff + 18, cWidth * 0.22));
      rightMarginX = Math.min(cWidth - 14, Math.max(leftOff + iw - 18, cWidth * 0.78));
    } else {
      if (leftMarginSpace >= 140) {
        const offset = Math.min(leftMarginSpace * 0.35, 75);
        leftMarginX = Math.max(50, leftOff - offset);
      } else if (leftMarginSpace >= 70) {
        leftMarginX = Math.max(20, leftOff - 16);
      } else {
        leftMarginX = Math.max(20, leftOff + 16);
      }

      if (rightMarginSpace >= 140) {
        const offset = Math.min(rightMarginSpace * 0.35, 75);
        rightMarginX = Math.min(cWidth - 50, leftOff + iw + offset);
      } else if (rightMarginSpace >= 70) {
        rightMarginX = Math.min(cWidth - 20, leftOff + iw + 16);
      } else {
        rightMarginX = Math.min(cWidth - 20, leftOff + iw - 16);
      }
    }

    return [...leftList, ...rightList].map((item) => {
      const marginX = item.isLeft ? leftMarginX : rightMarginX;
      const paths = computeCalloutPaths(
        item,
        marginX,
        item.isLeft,
        language,
        responsiveConfig.maxCharsPerLine,
        responsiveConfig.bracketHalfHeight(2)
      );
      return { item, paths, responsiveConfig };
    });
  }, [
    showPins,
    points,
    geo,
    containerRef,
    imageRef,
    selectedStructureId,
    focusedStructureId,
    language,
    zoom,
    pan.x,
    pan.y,
    transformKey,
    textSize,
  ]);

  const activeStructure = selectedStructureId ?? focusedStructureId ?? hoveredId;
  const hasActiveSelection = activeStructure !== null && activeStructure !== undefined;

  // Active / Selected items rendered LAST so they always appear on top (SVG z-order)
  const sortedCallouts = useMemo(() => {
    if (!hasActiveSelection) return callouts;
    return [...callouts].sort((a, b) => {
      const aActive = a.item.structure_id === activeStructure ? 1 : 0;
      const bActive = b.item.structure_id === activeStructure ? 1 : 0;
      return aActive - bActive;
    });
  }, [callouts, activeStructure, hasActiveSelection]);

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none select-none z-20">
      {sortedCallouts.map(({ item, paths, responsiveConfig }) => {
        const isSelected = selectedStructureId === item.structure_id;
        const isHovered = hoveredId === item.structure_id || focusedStructureId === item.structure_id;
        const isDimmed = hasActiveSelection && !isSelected && !isHovered;

        return (
          <AtlasCalloutItem
            key={item.id}
            item={item}
            paths={paths}
            isSelected={isSelected}
            isHovered={isHovered}
            isDimmed={isDimmed}
            isQuizMode={isQuizMode}
            containerWidth={geo.cWidth || containerRef.current?.clientWidth || 360}
            textSize={textSize}
            responsiveConfig={responsiveConfig}
            onSelectStructure={onSelectStructure}
            onQuizPinClick={onQuizPinClick}
            onHover={setHoveredId}
          />
        );
      })}
    </svg>
  );
}
