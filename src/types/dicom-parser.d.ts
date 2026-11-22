declare module 'dicom-parser' {
  export interface DataSet {
    string(tag: string): string | undefined;
    uint16(tag: string): number | undefined;
    int16(tag: string): number | undefined;
    uint32(tag: string): number | undefined;
    floatString(tag: string): number | undefined;
    elements: Record<string, { length: number; dataOffset: number }>;
    byteArray: Uint8Array;
  }

  export function parseDicom(byteArray: Uint8Array, options?: any): DataSet;
}
