import { describe, it, expect } from 'vitest';
import {
  computeViewportImageRect,
  toScreen,
  toImage,
  voxelToImage,
  imageToVoxel,
  VolumePlaneGeometry,
} from '../dicom-voxel-coords.service';

describe('DICOM Voxel Coordinates & Responsive Viewport Engine', () => {
  it('correctly calculates fitted viewport image bounding box with aspect preservation', () => {
    // 512x512 image in a 1024x768 container
    const rect = computeViewportImageRect(1024, 768, 512, 512, 1, { x: 0, y: 0 });
    // Scale should be 768 / 512 = 1.5
    expect(rect.scale).toBeCloseTo(1.5, 3);
    expect(rect.w).toBeCloseTo(768, 1);
    expect(rect.h).toBeCloseTo(768, 1);
    // Centered horizontally: (1024 - 768) / 2 = 128
    expect(rect.x).toBeCloseTo(128, 1);
    expect(rect.y).toBeCloseTo(0, 1);
  });

  it('accurately round-trips screen and image coordinates with zoom and pan', () => {
    const rect = computeViewportImageRect(800, 600, 512, 512, 2.0, { x: 50, y: -20 });
    const originalImagePt = { x: 120, y: 240 };

    const screenPt = toScreen(rect, originalImagePt.x, originalImagePt.y);
    const roundTripPt = toImage(rect, screenPt.x, screenPt.y);

    expect(roundTripPt.x).toBeCloseTo(originalImagePt.x, 2);
    expect(roundTripPt.y).toBeCloseTo(originalImagePt.y, 2);
  });

  it('transforms 3D patient voxel to 2D image coordinates for Axial plane', () => {
    const geo: VolumePlaneGeometry = {
      width: 512,
      height: 512,
      sliceCount: 100,
      pixelSpacing: [0.75, 0.75],
      sliceThickness: 2.0,
    };
    const dims = { width: 512, height: 512, depth: 100 };

    const voxel = { x: 200, y: 300, z: 45 };
    const imgPt = voxelToImage(voxel, geo, dims, 'axial');
    expect(imgPt.x).toBe(200);
    expect(imgPt.y).toBe(300);

    const backVoxel = imageToVoxel(imgPt.x, imgPt.y, 45, geo, dims, 'axial');
    expect(backVoxel.x).toBe(200);
    expect(backVoxel.y).toBe(300);
    expect(backVoxel.z).toBe(45);
  });

  it('transforms 3D patient voxel to 2D image coordinates for Coronal plane', () => {
    const geo: VolumePlaneGeometry = {
      width: 512,
      height: 512,
      sliceCount: 50,
      pixelSpacing: [0.75, 0.75],
      sliceThickness: 2.0,
    };
    const dims = { width: 512, height: 512, depth: 50 };

    const voxel = { x: 150, y: 250, z: 25 };
    const imgPt = voxelToImage(voxel, geo, dims, 'coronal');
    expect(imgPt.x).toBe(150);

    const backVoxel = imageToVoxel(imgPt.x, imgPt.y, 250, geo, dims, 'coronal');
    expect(backVoxel.x).toBe(150);
    expect(backVoxel.y).toBe(250);
    expect(backVoxel.z).toBe(25);
  });
});
