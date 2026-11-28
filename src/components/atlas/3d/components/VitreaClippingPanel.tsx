'use client';

import React from 'react';
import { Slice, ArrowDownUp, Check } from 'lucide-react';
import { useAtlasStore, type ClippingAxis } from '../state/atlasStore';
import { AtlasNavBus } from '../vitrea/AtlasNavBus';
import { SliceCoordinateBridge } from '../vitrea/SliceCoordinateBridge';
import { cn } from '@/lib/utils';

interface VitreaClippingPanelProps {
  className?: string;
}

export const VitreaClippingPanel: React.FC<VitreaClippingPanelProps> = ({ className }) => {
  const { clippingPlane, setClippingPlane } = useAtlasStore();

  const handleAxisChange = (axis: ClippingAxis) => {
    setClippingPlane({ axis, enabled: true });
  };

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setClippingPlane({ offsetMm: val, enabled: true });

    // Emit event to update Rad Suite DICOM slice view in real-time
    const calculatedSlice = SliceCoordinateBridge.millimeterToSliceIndex(
      val,
      120, // baseline series slice count
      clippingPlane.axis
    );
    AtlasNavBus.emitSliceChange({
      axis: clippingPlane.axis,
      sliceIndex: calculatedSlice,
      totalSlices: 120,
      millimeterPosition: val,
      source: 'atlas_3d',
    });
  };

  const toggleEnabled = () => {
    setClippingPlane({ enabled: !clippingPlane.enabled });
  };

  const toggleInverted = () => {
    setClippingPlane({ inverted: !clippingPlane.inverted });
  };

  return (
    <div className={cn('flex flex-col gap-2.5 text-slate-100 select-none', className)}>
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Slice className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold tracking-wider uppercase font-mono">
            Vitrea MPR Slicing
          </span>
        </div>
        <button
          type="button"
          onClick={toggleEnabled}
          className={cn(
            'text-[10px] px-2 py-0.5 rounded-full font-mono transition cursor-pointer font-bold',
            clippingPlane.enabled
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          )}
        >
          {clippingPlane.enabled ? 'ACTIVE' : 'OFF'}
        </button>
      </div>

      {/* Axis Selector */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-xl border border-emerald-500/15">
        {(['axial', 'coronal', 'sagittal'] as ClippingAxis[]).map((axis) => (
          <button
            key={axis}
            type="button"
            onClick={() => handleAxisChange(axis)}
            className={cn(
              'text-[11px] py-1 capitalize font-medium rounded-lg transition cursor-pointer text-center',
              clippingPlane.axis === axis && clippingPlane.enabled
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            )}
          >
            {axis}
          </button>
        ))}
      </div>

      {/* Plane Scrubber Slider */}
      {clippingPlane.enabled && (
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>Cut Plane</span>
            <span className="text-emerald-400 font-bold">{Math.round(clippingPlane.offsetMm)} mm</span>
          </div>
          <input
            type="range"
            min="-500"
            max="500"
            step="1"
            value={clippingPlane.offsetMm}
            onChange={handleOffsetChange}
            className="w-full h-1.5 accent-emerald-400 bg-slate-700 rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={toggleInverted}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-emerald-300 p-1 rounded-md transition cursor-pointer"
            >
              <ArrowDownUp className="w-3 h-3 text-emerald-400" />
              <span>Invert Cut Direction</span>
            </button>
            <span className="text-[10px] text-muted-foreground font-mono">
              {clippingPlane.inverted ? 'Inverted' : 'Standard'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
