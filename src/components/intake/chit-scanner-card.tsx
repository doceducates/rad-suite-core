'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Barcode, Scan, Camera, Plus, CheckCircle, ArrowRight, Upload, Phone, User, Hash } from 'lucide-react';
import Link from 'next/link';

interface ChitData {
  accession: string;
  patientName: string;
  tokenNumber: string;
  phone: string;
  modality: 'CT' | 'MRI' | 'X-RAY' | 'US';
  scanType: string;
  clinicalHistory: string;
  barcodes: string[];
  photoPreview?: string;
}

const SAMPLE_CHIT: ChitData = {
  accession: '192608002440',
  patientName: 'Zainab',
  tokenNumber: '29820',
  phone: '03371472837',
  modality: 'MRI',
  scanType: 'MRI Left Leg / Musculoskeletal',
  clinicalHistory: 'Pain and swelling in left lower limb following fall. Rule out ligamentous/soft tissue tear.',
  barcodes: ['192608002440'],
};

export function ChitScannerCard() {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [chit, setChit] = useState<ChitData | null>(null);
  const [secondaryBarcode, setSecondaryBarcode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode input for instant barcode gun scanning
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleScanBarcode = (code: string) => {
    if (!code.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      if (code.includes('192608002440') || code.length > 5) {
        setChit({ ...SAMPLE_CHIT, accession: code.trim(), barcodes: [code.trim()] });
      }
      setIsProcessing(false);
      setBarcodeInput('');
    }, 400);
  };

  const handleAddSecondaryBarcode = () => {
    if (!secondaryBarcode.trim() || !chit) return;
    setChit({
      ...chit,
      barcodes: [...chit.barcodes, secondaryBarcode.trim()],
    });
    setSecondaryBarcode('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (chit) {
        setChit({ ...chit, photoPreview: reader.result as string });
      } else {
        setChit({ ...SAMPLE_CHIT, photoPreview: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-slate-900 shadow-md">
      <CardHeader className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
            <Barcode className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm">Chit & Barcode Intake Station</CardTitle>
            <p className="text-[11px] text-zinc-500">Scan technician barcode slip or snap paper history form</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
          Gun Scanner Ready
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-4 text-xs">
        {/* Barcode Gun Input */}
        <div className="space-y-1.5">
          <label className="font-bold text-zinc-700 dark:text-zinc-300 block text-[11px]">
            Scan Accession Barcode (USB Gun or Type):
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Scan className="w-4 h-4 absolute left-2.5 top-2.5 text-zinc-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleScanBarcode(barcodeInput);
                }}
                placeholder="Scan or enter barcode (e.g. 192608002440)..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
            <Button size="sm" variant="primary" onClick={() => handleScanBarcode(barcodeInput)} isLoading={isProcessing}>
              Lookup
            </Button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-zinc-400">Quick Test:</span>
            <button
              type="button"
              onClick={() => handleScanBarcode('192608002440')}
              className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-primary/10 hover:text-primary text-[10px] font-mono transition-colors"
            >
              Slip 192608002440 (Zainab - MRI Lt Leg)
            </button>
          </div>
        </div>

        {/* Paper Form Photo Upload */}
        <div className="p-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 block text-[11px]">Paper History Form / Slip Photo</span>
              <span className="text-[10px] text-zinc-400">Auto-OCR handwriting & prior USG/X-Ray reports</span>
            </div>
          </div>
          <label className="cursor-pointer">
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} className="hidden" />
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-[11px] font-medium transition-colors">
              <Upload className="w-3 h-3" /> Snap Photo
            </span>
          </label>
        </div>

        {/* Extracted Chit & Multi-Barcode Bundle */}
        {chit && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{chit.patientName}</span>
                <Badge variant="outline" className="font-mono text-[9px]">{chit.modality}</Badge>
              </div>
              <span className="font-mono text-[10px] text-zinc-500">Token: #{chit.tokenNumber}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-zinc-400 block text-[10px]">Primary Accession:</span>
                <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{chit.accession}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Contact Phone:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200">{chit.phone}</span>
              </div>
            </div>

            {/* Multi-Barcode / Multi-Study Chits */}
            <div className="pt-2 border-t border-primary/20 space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 block">
                Attached Study Barcodes ({chit.barcodes.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {chit.barcodes.map((b, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono text-[10px]">
                    {b} {i === 0 ? '(Primary)' : '(Additional Scan)'}
                  </span>
                ))}
              </div>

              {/* Add Second Barcode for Multi-Study Case */}
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={secondaryBarcode}
                  onChange={(e) => setSecondaryBarcode(e.target.value)}
                  placeholder="Paste 2nd barcode for multi-study..."
                  className="flex-1 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-mono text-[10px]"
                />
                <button
                  type="button"
                  onClick={handleAddSecondaryBarcode}
                  className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-[10px] font-semibold"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Direct Launch into Workstation */}
            <div className="pt-2">
              <Link href={`/workstation/ACC-2602-0002`}>
                <Button size="sm" variant="primary" className="w-full gap-1.5 font-semibold text-xs py-2">
                  Bind & Launch Reporting Workstation <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
