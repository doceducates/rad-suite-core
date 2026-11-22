import dicomParser from 'dicom-parser';
import {
  classifyMrSequence,
  calculateMrAdaptiveWindow,
} from './mri-sequence-classifier.service';

export interface ParsedDicomMeta {
  patientName: string;
  patientId: string;
  accessionNumber: string;
  modality: string;
  studyDescription: string;
  seriesDescription?: string;
  protocolName?: string;
  sequenceName?: string;
  inversionTime?: number;
  repetitionTime?: number;
  echoTime?: number;
  seriesNumber?: string;
  instanceNumber?: number;
  rows: number;
  columns: number;
  windowWidth: number;
  windowCenter: number;
  rescaleSlope: number;
  rescaleIntercept: number;
  bitsAllocated: number;
  pixelRepresentation: number;
  photometricInterpretation: string;
  pixelSpacing: [number, number];
  imagePositionPatient?: [number, number, number];
  imageOrientationPatient?: number[];
  sliceLocation?: number;
  sliceThickness?: number;
}

export interface ParsedDicomFile {
  meta: ParsedDicomMeta;
  pixelData: Int16Array | Uint16Array | Uint8Array;
}

export function parseDicomBuffer(buffer: ArrayBuffer): ParsedDicomFile {
  const byteArray = new Uint8Array(buffer);
  const dataSet = dicomParser.parseDicom(byteArray);

  const bitsAllocated = dataSet.uint16('x00280100') || 16;
  const pixelRepresentation = dataSet.uint16('x00280103') || 0;
  const photometricInterpretation = (dataSet.string('x00280004') || 'MONOCHROME2').trim().toUpperCase();

  const meta: ParsedDicomMeta = {
    patientName: dataSet.string('x00100010') || 'Anonymous',
    patientId: dataSet.string('x00100020') || 'N/A',
    accessionNumber: dataSet.string('x00080050') || 'N/A',
    modality: dataSet.string('x00080060') || 'CT',
    studyDescription: dataSet.string('x00081030') || 'DICOM Examination',
    seriesDescription: dataSet.string('x0008103e'),
    protocolName: dataSet.string('x00181030'),
    sequenceName: dataSet.string('x00180024'),
    inversionTime: dataSet.floatString('x00180082'),
    repetitionTime: dataSet.floatString('x00180080'),
    echoTime: dataSet.floatString('x00180081'),
    seriesNumber: dataSet.string('x00200011'),
    instanceNumber: dataSet.intString('x00200013'),
    rows: dataSet.uint16('x00280010') || 512,
    columns: dataSet.uint16('x00280011') || 512,
    windowWidth: dataSet.floatString('x00281051') || 0,
    windowCenter: dataSet.floatString('x00281050') || 0,
    rescaleSlope: dataSet.floatString('x00281053') || 1,
    rescaleIntercept: dataSet.floatString('x00281052') || 0,
    bitsAllocated,
    pixelRepresentation,
    photometricInterpretation,
    pixelSpacing: (() => {
      const spacingStr = dataSet.string('x00280030');
      if (spacingStr) {
        const parts = spacingStr.split('\\').map(Number).filter((n) => !isNaN(n) && n > 0);
        if (parts.length >= 2) return [parts[0], parts[1]] as [number, number];
        if (parts.length === 1) return [parts[0], parts[0]] as [number, number];
      }
      return [0.7, 0.7] as [number, number];
    })(),
    imagePositionPatient: (() => {
      const s = dataSet.string('x00200032');
      if (s) {
        const p = s.split('\\').map(Number).filter((n) => !isNaN(n));
        if (p.length >= 3) return [p[0], p[1], p[2]] as [number, number, number];
      }
      return undefined;
    })(),
    imageOrientationPatient: (() => {
      const s = dataSet.string('x00200037');
      if (s) {
        const p = s.split('\\').map(Number).filter((n) => !isNaN(n));
        if (p.length >= 6) return p;
      }
      return undefined;
    })(),
    sliceLocation: dataSet.floatString('x00201041'),
    sliceThickness: dataSet.floatString('x00180050'),
  };

  const pixelDataElement = dataSet.elements.x7fe00010;
  let pixelData: Int16Array | Uint16Array | Uint8Array;

  if (pixelDataElement) {
    const offset = pixelDataElement.dataOffset;
    const length = pixelDataElement.length;
    // Safe buffer slice to ensure 2-byte alignment for typed arrays
    const sliceBuf = buffer.slice(offset, offset + length);

    if (bitsAllocated === 16) {
      pixelData = pixelRepresentation === 1
        ? new Int16Array(sliceBuf)
        : new Uint16Array(sliceBuf);
    } else {
      pixelData = new Uint8Array(sliceBuf);
    }
  } else {
    pixelData = new Uint8Array(meta.rows * meta.columns);
  }

  // Auto-calculate robust clinical windowing matching Vitrea standards
  const isMR = (meta.modality || '').toUpperCase() === 'MR';
  const hasScannerFullRangeWl = meta.windowWidth >= 8000 && meta.windowCenter > 0;

  if (isMR) {
    // If the scanner already provided calibrated full-range windowing (e.g. STIR/DWI 16384/8192), keep it!
    if (!hasScannerFullRangeWl && (!meta.windowWidth || !meta.windowCenter || meta.windowWidth < 20)) {
      const seq = classifyMrSequence({
        seriesDescription: meta.seriesDescription,
        protocolName: meta.protocolName,
        sequenceName: meta.sequenceName,
        inversionTime: meta.inversionTime,
        repetitionTime: meta.repetitionTime,
        echoTime: meta.echoTime,
        modality: meta.modality,
      });
      const adaptive = calculateMrAdaptiveWindow(pixelData, seq);
      meta.windowWidth = adaptive.ww;
      meta.windowCenter = adaptive.wc;
    }
  } else {
    // CT default: if missing or invalid, default to Soft Tissue (40 / 400)
    if (!meta.windowWidth || !meta.windowCenter) {
      meta.windowWidth = 400;
      meta.windowCenter = 40;
    }
  }

  return { meta, pixelData };
}

export function renderDicomPixelsToImageData(
  ctx: CanvasRenderingContext2D,
  pixelData: Int16Array | Uint16Array | Uint8Array,
  meta: ParsedDicomMeta,
  windowWidth: number = meta.windowWidth,
  windowCenter: number = meta.windowCenter,
  invert: boolean = false
): ImageData {
  const { rows, columns, rescaleSlope, rescaleIntercept, photometricInterpretation } = meta;
  const imgData = ctx.createImageData(columns, rows);
  const data = imgData.data;

  // MONOCHROME1 has 0 as maximum brightness (white)
  const isMonochrome1 = photometricInterpretation === 'MONOCHROME1';
  const shouldInvert = isMonochrome1 ? !invert : invert;

  const low = windowCenter - windowWidth / 2;
  const range = windowWidth || 1;

  for (let i = 0; i < pixelData.length; i++) {
    const raw = pixelData[i];
    const hu = raw * rescaleSlope + rescaleIntercept;

    let intensity = ((hu - low) / range) * 255;
    if (intensity < 0) intensity = 0;
    if (intensity > 255) intensity = 255;
    if (shouldInvert) intensity = 255 - intensity;

    const pIdx = i * 4;
    data[pIdx] = intensity;
    data[pIdx + 1] = intensity;
    data[pIdx + 2] = intensity;
    data[pIdx + 3] = 255;
  }

  return imgData;
}
