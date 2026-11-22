import { describe, it, expect } from 'vitest';
import {
  dist3,
  angle3,
  polygonAreaMm2,
  DicomMeasurementEngine,
} from '../dicom-measurement-engine.service';

describe('3D Patient Voxel Measurement Engine', () => {
  it('calculates 3D Euclidean distance in millimeters using anisotropic pixel spacing', () => {
    const p1 = { x: 10, y: 20, z: 5 };
    const p2 = { x: 40, y: 60, z: 5 };
    // Delta x = 30, Delta y = 40. Hypotenuse = 50 voxels. Spacing = [0.5, 0.5, 2.0]
    // Dx mm = 15, Dy mm = 20. Hypotenuse mm = sqrt(15^2 + 20^2) = 25 mm
    const d = dist3(p1, p2, [0.5, 0.5, 2.0]);
    expect(d).toBeCloseTo(25.0, 2);
  });

  it('calculates across-slice distance with slice thickness', () => {
    const p1 = { x: 0, y: 0, z: 0 };
    const p2 = { x: 0, y: 0, z: 10 };
    // Dz = 10 slices * 3.0 mm thickness = 30 mm
    const d = dist3(p1, p2, [1.0, 1.0, 3.0]);
    expect(d).toBeCloseTo(30.0, 2);
  });

  it('calculates 3-point angle in degrees', () => {
    const vertex = { x: 0, y: 0, z: 0 };
    const p1 = { x: 10, y: 0, z: 0 };
    const p2 = { x: 0, y: 10, z: 0 };
    // Right angle (90 degrees)
    const deg = angle3(p1, vertex, p2, [1, 1, 1]);
    expect(deg).toBeCloseTo(90.0, 1);

    // Straight line (180 degrees)
    const p3 = { x: -10, y: 0, z: 0 };
    const degFlat = angle3(p1, vertex, p3, [1, 1, 1]);
    expect(degFlat).toBeCloseTo(180.0, 1);
  });

  it('calculates polygon area in square millimeters', () => {
    // 10x10 square = 100 voxels area. Spacing = [0.5, 0.5, 1.0] => area = 5mm x 5mm = 25 mm²
    const square = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 10, y: 10, z: 0 },
      { x: 0, y: 10, z: 0 },
    ];
    const area = polygonAreaMm2(square, [0.5, 0.5, 1.0]);
    expect(area).toBeCloseTo(25.0, 2);
  });

  it('supports Undo and Redo command history stack', () => {
    const engine = new DicomMeasurementEngine();
    expect(engine.canUndo()).toBe(false);

    engine.addRuler({ x: 0, y: 0, z: 1 }, { x: 10, y: 0, z: 1 }, 'axial');
    expect(engine.getItems().length).toBe(1);
    expect(engine.canUndo()).toBe(true);

    engine.addRuler({ x: 5, y: 5, z: 1 }, { x: 15, y: 5, z: 1 }, 'axial');
    expect(engine.getItems().length).toBe(2);

    engine.undo();
    expect(engine.getItems().length).toBe(1);
    expect(engine.canRedo()).toBe(true);

    engine.redo();
    expect(engine.getItems().length).toBe(2);
  });
});
