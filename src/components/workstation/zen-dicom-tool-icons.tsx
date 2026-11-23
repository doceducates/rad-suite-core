'use client';

import React from 'react';

/**
 * Authentic Vitrea 3-Point Angle Measurement Icon (Infinity10_mTool_08).
 * Exact vector paths matching Vitrea Classic / MMViewer.
 */
export function AngleToolIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="16"
      height="16"
      fill="currentColor"
      {...props}
    >
      <rect x="5" y="22" width="22" height="2" />
      <polygon points="7.54 22 22.69 6 20.15 6 5 22 7.54 22" />
      <path d="M16.85,23.15c0-2.53-1.64-5.87-4.23-6.77l-1.7.85a5.9,5.9,0,0,1,4.23,5.92Z" />
    </svg>
  );
}

/**
 * Authentic Vitrea Cobb Angle Spinal Curvature Measurement Icon (Infinity10_mTool_17).
 * Exact vector paths from Vitrea MMViewer showing dual intersecting endplates with angle arc.
 */
export function CobbAngleToolIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="16"
      height="16"
      fill="currentColor"
      {...props}
    >
      <path d="M16.74,22c-.39-2.25-1.84-4.71-3.95-5.54L22.69,6H20.15L9.21,17.55a8.23,8.23,0,0,1,1.55,1l1-1.05A5.8,5.8,0,0,1,15.05,22H13.29a8.87,8.87,0,0,1,.58,2H27V22Z" />
      <path d="M13.29,22H5v2h8.87A8.87,8.87,0,0,0,13.29,22Z" opacity="0.6" />
      <path d="M10.76,18.59a8.23,8.23,0,0,0-1.55-1L5,22H7.54Z" opacity="0.6" />
    </svg>
  );
}

/**
 * Authentic Vitrea MMV Pane Re-arrange Images / Swap Tool (Infinity10_ih_function_13).
 * Hand tool used to drag-and-drop or click-to-swap diagnostic panes.
 */
export function VitreaRearrangeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="13"
      height="13"
      fill="currentColor"
      {...props}
    >
      <path d="M12.45,16.57V6.9s0-1.06.75-1.06.73.45.72,1v7.41L15.34,14V5.08l0-.13c.05-.47.06-1,.64-1,.77,0,1,.78,1,1.15L17,5v8.93h.12c.15,0,1,0,1.15,0v-8h0A.77.77,0,0,1,19.13,5a.87.87,0,0,1,.87.85h0v8.6A4.44,4.44,0,0,1,21,15V9c0-.68,0-1,.5-1a.7.7,0,0,1,.75.65c0,.23,0,8.56,0,8.56S22,22,20.08,24.71c-.18.26-.14.68-.08.29v2H13V25.05C11,23,11.67,22,10.43,20a35.7,35.7,0,0,1-2.32-4.8h0c-.25-.56-.53-1.3.24-1.67S10,14.4,10,14.4l2,2.71Z" />
    </svg>
  );
}

/**
 * Authentic Vitrea MMV Linked Sync Icon (Infinity10_ih_function_02).
 * Indicates viewport is linked in lockstep scroll, pan, zoom with other views.
 */
export function VitreaLinkedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="13"
      height="13"
      fill="currentColor"
      {...props}
    >
      <path d="M15.91,19.76l-4.39,4.39L7.76,20.38,12.15,16l1.34,1.33L12.32,18.5l1.26,1.25,1.16-1.16.55.54Zm.63-1.88L16,17.33l1.25-1.25.54.55.63.62a1.79,1.79,0,0,0,2.52,0l4.56-4.39a1.81,1.81,0,0,0,0-2.53L21.53,6.57a1.77,1.77,0,0,0-2.5,0L14.64,11a1.78,1.78,0,0,0,0,2.5L16,14.83l-1.25,1.25-1.33-1.33a1.8,1.8,0,0,0-2.53,0L6.51,19.14a1.8,1.8,0,0,0,0,2.53l3.76,3.76a1.77,1.77,0,0,0,2.5,0L17.18,21a1.77,1.77,0,0,0,0-2.5Zm2.5-2.5-.54-.55,1.35-1.34L18.6,12.24l-1.35,1.34-1.34-1.34L20.3,7.85l3.76,3.76L19.67,16Z" />
    </svg>
  );
}

/**
 * Authentic Vitrea MMV Unlinked Independent Icon (Infinity10_ih_function_03).
 * Indicates viewport is unlinked and scrolls independently.
 */
export function VitreaUnlinkedIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="13"
      height="13"
      fill="currentColor"
      {...props}
    >
      <path d="M15.92,19.61,11.52,24,7.77,20.24l4.37-4.38.78.77,1.26-1.25-.78-.78a1.78,1.78,0,0,0-2.51,0L6.5,19a1.79,1.79,0,0,0,0,2.51l3.76,3.76a1.76,1.76,0,0,0,2.5,0l4.39-4.39a1.77,1.77,0,0,0,0-2.5l-.74-.75-1.26,1.25Z" />
      <path d="M25.47,10.19,21.52,6.42a1.77,1.77,0,0,0-2.49,0l-4.39,4.39a1.78,1.78,0,0,0,0,2.51l.78.77,1.26-1.25-.78-.78L20.3,7.7l3.76,3.76-4.38,4.38-.75-.75-1.25,1.25.74.76a1.78,1.78,0,0,0,2.51,0l4.56-4.39A1.77,1.77,0,0,0,25.47,10.19Z" />
      <polygon points="18.46 23.61 19.48 23.2 20.57 25.55 19.59 26.08 18.46 23.61" />
      <polygon points="22.9 19.21 22.45 20.26 24.92 21.28 25.34 20.18 22.9 19.21" />
      <polygon points="23.54 23.36 22.79 24.22 20.82 22.26 21.55 21.49 23.54 23.36" />
    </svg>
  );
}

/**
 * Authentic Vitrea MMV Digital Subtraction Icon (VG2p_ih_function_Subtraction).
 * Toggles DSA / subtraction mode between active series and pre-contrast mask.
 */
export function VitreaSubtractionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="13"
      height="13"
      fill="currentColor"
      {...props}
    >
      <rect x="5" y="7" width="13" height="13" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="13" height="13" rx="1.5" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="2" />
      <line x1="8" y1="13.5" x2="15" y2="13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Authentic Vitrea MMV Snapshot Camera Icon (Infinity10_ih_function_04).
 * Captures calibrated diagnostic snapshot with patient demographics.
 */
export function VitreaSnapshotIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      width="13"
      height="13"
      fill="currentColor"
      {...props}
    >
      <rect x="6" y="7" width="4" height="1" />
      <path d="M23,9,21,7H15L13,9H6V24H27V9ZM9,22H8V12H9Zm9,0a5.5,5.5,0,1,1,5.5-5.5A5.5,5.5,0,0,1,18,22Z" />
      <circle cx="18" cy="16.5" r="3.5" />
    </svg>
  );
}
