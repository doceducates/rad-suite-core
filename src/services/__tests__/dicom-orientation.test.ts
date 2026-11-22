import { describe, it, expect } from 'vitest';
import {
  getOrientationMarkers,
  getDirectionLetter,
  getOrientationFromIop,
  detectOrientationFromDescription,
} from '../dicom-geometry.service';

describe('DICOM Viewport Anatomical Orientation Markers', () => {
  describe('getDirectionLetter', () => {
    it('correctly maps 3D patient LPS coordinate vectors to anatomical letters', () => {
      // +X is Left, -X is Right
      expect(getDirectionLetter([1, 0, 0])).toBe('L');
      expect(getDirectionLetter([-1, 0, 0])).toBe('R');

      // +Y is Posterior, -Y is Anterior
      expect(getDirectionLetter([0, 1, 0])).toBe('P');
      expect(getDirectionLetter([0, -1, 0])).toBe('A');

      // +Z is Superior, -Z is Inferior
      expect(getDirectionLetter([0, 0, 1])).toBe('S');
      expect(getDirectionLetter([0, 0, -1])).toBe('I');
    });

    it('determines dominant axis for tilted vectors', () => {
      // 80% left, 20% posterior
      expect(getDirectionLetter([0.8, 0.2, 0])).toBe('L');
      // 80% anterior, 20% right
      expect(getDirectionLetter([-0.2, -0.8, 0])).toBe('A');
    });
  });

  describe('getOrientationMarkers with ImageOrientationPatient (IOP)', () => {
    it('computes correct markers for standard Axial slice [1, 0, 0, 0, 1, 0]', () => {
      const axialIop = [1, 0, 0, 0, 1, 0];
      const markers = getOrientationMarkers(undefined, axialIop);
      expect(markers).toEqual({
        top: 'A',
        bottom: 'P',
        left: 'R',
        right: 'L',
      });
    });

    it('computes correct markers for standard Coronal slice [1, 0, 0, 0, 0, -1]', () => {
      const coronalIop = [1, 0, 0, 0, 0, -1];
      const markers = getOrientationMarkers(undefined, coronalIop);
      expect(markers).toEqual({
        top: 'S',
        bottom: 'I',
        left: 'R',
        right: 'L',
      });
    });

    it('computes correct markers for standard Sagittal slice [0, 1, 0, 0, 0, -1]', () => {
      const sagittalIop = [0, 1, 0, 0, 0, -1];
      const markers = getOrientationMarkers(undefined, sagittalIop);
      expect(markers).toEqual({
        top: 'S',
        bottom: 'I',
        left: 'A',
        right: 'P',
      });
    });

    it('computes correct markers for real tilted axial CT', () => {
      const tiltedAxialIop = [0.99754274, 0, -0.07006019, 0.0047075, 0.99774003, 0.06702717];
      const markers = getOrientationMarkers(undefined, tiltedAxialIop);
      expect(markers).toEqual({
        top: 'A',
        bottom: 'P',
        left: 'R',
        right: 'L',
      });
    });
  });

  describe('getOrientationMarkers with textual fallback', () => {
    it('handles AXIAL orientation string case-insensitively', () => {
      expect(getOrientationMarkers('AXIAL')).toEqual({ top: 'A', bottom: 'P', left: 'R', right: 'L' });
      expect(getOrientationMarkers('axial')).toEqual({ top: 'A', bottom: 'P', left: 'R', right: 'L' });
      expect(getOrientationMarkers('Axial')).toEqual({ top: 'A', bottom: 'P', left: 'R', right: 'L' });
    });

    it('handles CORONAL orientation string case-insensitively', () => {
      expect(getOrientationMarkers('CORONAL')).toEqual({ top: 'S', bottom: 'I', left: 'R', right: 'L' });
      expect(getOrientationMarkers('coronal')).toEqual({ top: 'S', bottom: 'I', left: 'R', right: 'L' });
      expect(getOrientationMarkers('Coronal')).toEqual({ top: 'S', bottom: 'I', left: 'R', right: 'L' });
      expect(getOrientationMarkers('CORONAL MPR')).toEqual({ top: 'S', bottom: 'I', left: 'R', right: 'L' });
    });

    it('handles SAGITTAL orientation string case-insensitively', () => {
      expect(getOrientationMarkers('SAGITTAL')).toEqual({ top: 'S', bottom: 'I', left: 'A', right: 'P' });
      expect(getOrientationMarkers('sagittal')).toEqual({ top: 'S', bottom: 'I', left: 'A', right: 'P' });
      expect(getOrientationMarkers('Sagittal')).toEqual({ top: 'S', bottom: 'I', left: 'A', right: 'P' });
      expect(getOrientationMarkers('MR SAGITTAL T1')).toEqual({ top: 'S', bottom: 'I', left: 'A', right: 'P' });
    });

    it('defaults to AXIAL for undefined or empty string', () => {
      expect(getOrientationMarkers(undefined)).toEqual({ top: 'A', bottom: 'P', left: 'R', right: 'L' });
      expect(getOrientationMarkers('')).toEqual({ top: 'A', bottom: 'P', left: 'R', right: 'L' });
    });
  });

  describe('Integration with getOrientationFromIop and detectOrientationFromDescription', () => {
    it('detects orientation from IOP and derives markers', () => {
      const sagIop = [0, 1, 0, -0.07006019, 0, -0.99754274];
      const orient = getOrientationFromIop(sagIop);
      expect(orient).toBe('SAGITTAL');
      expect(getOrientationMarkers(orient)).toEqual({ top: 'S', bottom: 'I', left: 'A', right: 'P' });
    });

    it('detects orientation from descriptions and derives markers', () => {
      expect(detectOrientationFromDescription('Coronal Bone')).toBe('CORONAL');
      expect(getOrientationMarkers(detectOrientationFromDescription('Coronal Bone'))).toEqual({
        top: 'S',
        bottom: 'I',
        left: 'R',
        right: 'L',
      });

      expect(detectOrientationFromDescription('Sagittal T2 FRFSE')).toBe('SAGITTAL');
      expect(getOrientationMarkers(detectOrientationFromDescription('Sagittal T2 FRFSE'))).toEqual({
        top: 'S',
        bottom: 'I',
        left: 'A',
        right: 'P',
      });
    });
  });
});
