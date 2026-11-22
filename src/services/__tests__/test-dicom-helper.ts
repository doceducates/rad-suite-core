/**
 * Test utility to build a minimal valid DICOM buffer with explicit VR Little Endian.
 */
export function createMockDicomBuffer(params: {
  patientName?: string;
  patientId?: string;
  accessionNumber?: string;
  modality?: string;
  studyDescription?: string;
  studyInstanceUid?: string;
  seriesDescription?: string;
  seriesNumber?: string | number;
  seriesInstanceUid?: string;
  instanceNumber?: string | number;
  ipp?: string;
  iop?: string;
  pixelSpacing?: string;
  rows?: number;
  columns?: number;
}): Buffer {
  const parts: Buffer[] = [];

  // 128 bytes preamble
  parts.push(Buffer.alloc(128, 0));
  // DICM prefix
  parts.push(Buffer.from('DICM', 'ascii'));

  function writeStringTag(group: number, element: number, vr: string, val: string) {
    const valBuf = Buffer.from(val, 'utf8');
    const pad = valBuf.length % 2 !== 0 ? 1 : 0;
    const len = valBuf.length + pad;

    const tagHdr = Buffer.alloc(8);
    tagHdr.writeUInt16LE(group, 0);
    tagHdr.writeUInt16LE(element, 2);
    tagHdr.write(vr, 4, 2, 'ascii');
    tagHdr.writeUInt16LE(len, 6);

    const dataBuf = Buffer.alloc(len);
    valBuf.copy(dataBuf, 0);
    if (pad) dataBuf[len - 1] = 0x20; // space padding

    parts.push(tagHdr);
    parts.push(dataBuf);
  }

  function writeUint16Tag(group: number, element: number, val: number) {
    const tagHdr = Buffer.alloc(8);
    tagHdr.writeUInt16LE(group, 0);
    tagHdr.writeUInt16LE(element, 2);
    tagHdr.write('US', 4, 2, 'ascii');
    tagHdr.writeUInt16LE(2, 6);

    const dataBuf = Buffer.alloc(2);
    dataBuf.writeUInt16LE(val, 0);

    parts.push(tagHdr);
    parts.push(dataBuf);
  }

  // File Meta Information
  writeStringTag(0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1');

  // Ascending tag order
  if (params.modality) writeStringTag(0x0008, 0x0060, 'CS', params.modality);
  if (params.accessionNumber) writeStringTag(0x0008, 0x0050, 'SH', params.accessionNumber);
  if (params.studyDescription) writeStringTag(0x0008, 0x1030, 'LO', params.studyDescription);
  if (params.seriesDescription !== undefined) writeStringTag(0x0008, 0x103e, 'LO', params.seriesDescription);

  if (params.patientName) writeStringTag(0x0010, 0x0010, 'PN', params.patientName);
  if (params.patientId) writeStringTag(0x0010, 0x0020, 'LO', params.patientId);

  writeStringTag(0x0020, 0x000d, 'UI', params.studyInstanceUid || '1.2.840.10008.1.999'); // StudyInstanceUID
  if (params.seriesInstanceUid) writeStringTag(0x0020, 0x000e, 'UI', params.seriesInstanceUid);
  if (params.seriesNumber !== undefined) writeStringTag(0x0020, 0x0011, 'IS', String(params.seriesNumber));
  if (params.instanceNumber !== undefined) writeStringTag(0x0020, 0x0013, 'IS', String(params.instanceNumber));
  if (params.ipp) writeStringTag(0x0020, 0x0032, 'DS', params.ipp);
  if (params.iop) writeStringTag(0x0020, 0x0037, 'DS', params.iop);

  if (params.rows) writeUint16Tag(0x0028, 0x0010, params.rows);
  if (params.columns) writeUint16Tag(0x0028, 0x0011, params.columns);
  if (params.pixelSpacing) writeStringTag(0x0028, 0x0030, 'DS', params.pixelSpacing);

  return Buffer.concat(parts);
}
