'use client';

import React from 'react';
import { Slice, ArrowDownUp, Eye, EyeOff } from 'lucide-react';
import { useAtlasStore, type ClippingAxis } from '../state/atlasStore';
import { AtlasNavBus } from '../vitrea/AtlasNavBus';
import { SliceCoordinateBridge } from '../vitrea/SliceCoordinateBridge';

export const VitreaClippingPanel: React.FC = () => {
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
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5 text-slate-100 w-72">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Slice className="w-4 h-4" />
          <span className="text-xs font-semibold tracking-wider uppercase">
            Vitrea MPR Slicing
          </span>
        </div>
        <button
          onClick={toggleEnabled}
          className={`text-xs px-2 py-0.5 rounded transition ${
            clippingPlane.enabled
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'bg-slate-800 text-slate-400'
          }`}
        >
          {clippingPlane.enabled ? 'Active' : 'Disabled'}
        </button>
      </div>

      {/* Axis Selector */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
        {(['axial', 'coronal', 'sagittal'] as ClippingAxis[]).map((axis) => (
          <button
            key={axis}
            onClick={() => handleAxisChange(axis)}
            className={`text-[11px] py-1 capitalize font-medium rounded transition ${
              clippingPlane.axis === axis && clippingPlane.enabled
                ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {axis}
          </button>
        ))}
      </div>

      {/* Plane Scrubber Slider */}
      {clippingPlane.enabled && (
        <div className="flex flex-col gap-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Cut Position</span>
            <span className="font-mono text-cyan-400">{Math.round(clippingPlane.offsetMm)} mm</span>
          </div>
          <input
            type="range"
            min="-500"
            max="500"
            step="1"
            value={clippingPlane.offsetMm}
            onChange={handleOffsetChange}
            className="w-full h-1.5 accent-cyan-400 bg-slate-700 rounded cursor-pointer"
          />

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleInverted}
              className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded transition"
            >
              <ArrowDownUp className="w-3 h-3" /> Flip Normal
            </button>
            <button
              onClick={() => setClippingPlane({ showPlaneHelper: !clippingPlane.showPlaneHelper })}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
            >
              {clippingPlane.showPlaneHelper ? (
                <>
                  <Eye className="w-3 h-3" /> Hide Guide
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3" /> Show Guide
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
