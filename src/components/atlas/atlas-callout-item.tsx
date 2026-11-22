'use client';

// Layer 4: Atlas Anatomy Callout Item with Crisp Text & Visual Priority (<160 lines)
import React from 'react';
import {
  type LayoutPoint,
  type CalloutPaths,
  type ResponsiveLayoutConfig,
  getResponsiveLayoutConfig,
} from '@/lib/anatomy-layout';

interface AtlasCalloutItemProps {
  item: LayoutPoint;
  paths: CalloutPaths;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  isQuizMode: boolean;
  containerWidth?: number;
  textSize?: 'sm' | 'md' | 'lg';
  responsiveConfig?: ResponsiveLayoutConfig;
  onSelectStructure: (id: number | null) => void;
  onQuizPinClick?: (id: number) => void;
  onHover: (id: number | null) => void;
}

export function AtlasCalloutItem({
  item,
  paths,
  isSelected,
  isHovered,
  isDimmed,
  isQuizMode,
  containerWidth,
  textSize = 'md',
  responsiveConfig,
  onSelectStructure,
  onQuizPinClick,
  onHover,
}: AtlasCalloutItemProps) {
  const isActive = isSelected || isHovered;
  const baseColor = item.color || '#38bdf8';
  const displayColor = isActive ? '#ffff00' : baseColor;
  // Keep dimmed structures legible (0.45 instead of 0.15)
  const opacity = isDimmed ? 0.45 : 1.0;
  const labelLines = isQuizMode ? ['[ ? ]'] : paths.lines;

  const fontConfig = responsiveConfig || getResponsiveLayoutConfig(containerWidth || 1000, textSize);

  const lineCount = labelLines.length;
  const isMulti = lineCount > 1;
  const maxLen = Math.max(...labelLines.map((l) => l.length));
  const pillWidth = Math.max(28, maxLen * fontConfig.charWidth + 14);
  const pillHeight = lineCount === 3 ? fontConfig.h3 : lineCount === 2 ? fontConfig.h2 : fontConfig.h1;
  const targetY = item.targetY ?? item.py;
  const pillY = targetY - pillHeight / 2;

  // Safe horizontal clamping: guarantees 100% on-screen visibility on any mobile/desktop screen
  const isLeft = paths.anchor === 'end';
  const rawPillX = isLeft ? paths.textX - pillWidth : paths.textX;
  const minX = 8;
  const maxX = containerWidth ? Math.max(minX, containerWidth - pillWidth - 8) : 9999;
  const pillX = Math.max(minX, Math.min(maxX, rawPillX));
  const textX = pillX + 6;

  return (
    <g
      opacity={opacity}
      className="cursor-pointer pointer-events-auto transition-opacity duration-150"
      onPointerEnter={(e) => {
        // Crucial: Only mouse triggers hover! Touch taps must NOT latch hover states
        if (e.pointerType === 'mouse') {
          onHover(item.structure_id);
        }
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse') {
          onHover(null);
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        onHover(null); // Clear any hover on click/tap
        if (isQuizMode && onQuizPinClick) {
          onQuizPinClick(item.structure_id);
        } else {
          onSelectStructure(isSelected ? null : item.structure_id);
        }
      }}
    >
      {/* Responsive Leader line with dark halo (pointerEvents="none" prevents accidental line hover flicker) */}
      <path
        d={paths.leaderD}
        pointerEvents="none"
        stroke="rgba(0, 0, 0, 0.85)"
        strokeWidth={isActive ? fontConfig.strokeHaloActive : fontConfig.strokeHaloNormal}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={paths.leaderD}
        pointerEvents="none"
        stroke={displayColor}
        strokeWidth={isActive ? fontConfig.strokeLeaderActive : fontConfig.strokeLeaderNormal}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Responsive Margin bracket with dark halo (pointerEvents="none") */}
      <path
        d={paths.bracketD}
        pointerEvents="none"
        stroke="rgba(0, 0, 0, 0.85)"
        strokeWidth={isActive ? fontConfig.strokeHaloActive : fontConfig.strokeHaloNormal}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={paths.bracketD}
        pointerEvents="none"
        stroke={displayColor}
        strokeWidth={isActive ? fontConfig.strokeLeaderActive : fontConfig.strokeLeaderNormal}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Generous invisible hit-target circle for effortless pin hover / touch */}
      <circle
        cx={item.px}
        cy={item.py}
        r={Math.max(14, fontConfig.pinRadiusActive + 8)}
        fill="transparent"
        className="cursor-pointer"
      />

      {/* High-visibility Pin Marker: Halo + Vivid Core + Focal Dot */}
      <circle
        cx={item.px}
        cy={item.py}
        r={isActive ? fontConfig.pinRadiusActive + 1.2 : fontConfig.pinRadiusNormal + 1}
        fill="rgba(0, 0, 0, 0.9)"
      />
      <circle
        cx={item.px}
        cy={item.py}
        r={isActive ? fontConfig.pinRadiusActive : fontConfig.pinRadiusNormal}
        fill={displayColor}
        stroke="#ffffff"
        strokeWidth={1.2}
      />
      <circle
        cx={item.px}
        cy={item.py}
        r={isActive ? 2.4 : 1.4}
        fill="#ffffff"
      />

      {/* Clean high-contrast backdrop pill */}
      <rect
        x={pillX}
        y={pillY}
        width={pillWidth}
        height={pillHeight}
        rx="4"
        fill="rgba(8, 12, 18, 0.90)"
        stroke={isActive ? '#ffff00' : 'rgba(255, 255, 255, 0.15)'}
        strokeWidth={isActive ? 1.5 : 0.6}
        className="transition-all duration-150"
      />

      {/* Crisp White Callout Text without font-choking stroke */}
      <text
        x={textX}
        y={
          lineCount === 3
            ? targetY + fontConfig.y3
            : lineCount === 2
            ? targetY + fontConfig.y2
            : targetY + fontConfig.y1
        }
        textAnchor="start"
        fill={isQuizMode ? '#38bdf8' : (isActive ? '#ffff00' : '#ffffff')}
        stroke="rgba(0, 0, 0, 0.6)"
        strokeWidth="0.4"
        style={{ fontSize: `${fontConfig.fontSizePx}px`, paintOrder: 'stroke fill' }}
        className="font-semibold tracking-tight select-none"
      >
        {labelLines.map((line, idx) => (
          <tspan key={idx} x={textX} dy={idx === 0 ? 0 : `${fontConfig.lineHeight}px`}>
            {line}
          </tspan>
        ))}
      </text>

      <title>
        {item.name_en}
        {item.name_la ? ` (${item.name_la})` : ''}
      </title>
    </g>
  );
}
