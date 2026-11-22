import dicomParser from 'dicom-parser';
import type { ParsedDicomMeta } from '@/services/dicom-loader.service';

self.onmessage = (event: MessageEvent<{ id: string; buffer: ArrayBuffer }>) => {
  const { id, buffer } = event.data;

  try {
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
        }
        return [0.7, 0.7] as [number, number];
      })(),
    };

    const pixelElement = dataSet.elements.x7fe00010;
    let pixelData: Int16Array | Uint16Array | Uint8Array;

    if (pixelElement) {
      const sliceBuf = buffer.slice(pixelElement.dataOffset, pixelElement.dataOffset + pixelElement.length);
      if (bitsAllocated === 16) {
        pixelData = pixelRepresentation === 1 ? new Int16Array(sliceBuf) : new Uint16Array(sliceBuf);
      } else {
        pixelData = new Uint8Array(sliceBuf);
      }
    } else {
      pixelData = new Uint8Array(meta.rows * meta.columns);
    }

    // Auto-calculate windowing fallback if missing
    if (!meta.windowWidth || !meta.windowCenter) {
      meta.windowWidth = 400;
      meta.windowCenter = 40;
    }

    (self as unknown as Worker).postMessage(
      { id, success: true, meta, pixelData },
      [pixelData.buffer] as any
    );
  } catch (err: any) {
    (self as unknown as Worker).postMessage({ id, success: false, error: err?.message || 'DICOM parsing error' });
  }
};
