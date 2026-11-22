'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChitScannerCard } from '@/components/intake/chit-scanner-card';
import { Upload, Scan, FileText, CheckCircle, Sparkles } from 'lucide-react';

export default function IntakePage() {
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

  const simulateExtraction = () => {
    setExtracting(true);
    setTimeout(() => {
      setExtractedData({
        patientName: 'Imran Shah',
        guardian: 'Wali Shah',
        age: 28,
        gender: 'Male',
        cnic: '35404-6677889-1',
        scanRequested: 'CT Abdomen & Pelvis (Trauma Protocol)',
        referringDoctor: 'Dr. Usman Ghani (Emergency Surgery)',
        clinicalHistory: 'RTA impact today, severe abdominal tenderness, hypotensive.',
        priority: 'STAT',
        confidence: 94,
      });
      setExtracting(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Requisition Intake & Barcode Station</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Scan technician accession chits, digitize handwritten doctor forms & auto-bind studies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Chit Scanner Card with Barcode Gun & Multi-Scan Support */}
        <ChitScannerCard />

        {/* Right: Handwritten History OCR & Extracted Demographics */}
        <div className="space-y-6">
        {/* Upload Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Scan className="w-4 h-4 text-primary" /> Ingest Prescription Slip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-8 text-center hover:border-primary/50 transition-colors bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">Upload doctor prescription slip</p>
              <p className="text-[11px] text-zinc-400 mt-1">Supports PNG, JPG, or Smartphone Camera Photo</p>
              <div className="mt-4">
                <Button size="sm" onClick={simulateExtraction} isLoading={extracting} className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Test Auto-OCR Slip
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-[11px] text-zinc-500">
              💡 AI OCR extracts patient demographics, referring consultant, clinical symptoms, and requested modality automatically.
            </div>
          </CardContent>
        </Card>

        {/* Extraction Result Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" /> Extracted Demographics
            </CardTitle>
            {extractedData && (
              <Badge variant="success" className="text-[10px]">
                {extractedData.confidence}% Confidence
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {extractedData ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Patient Name:</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{extractedData.patientName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Father/Guardian:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{extractedData.guardian}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Age / Gender:</span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">{extractedData.age}y / {extractedData.gender}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">CNIC:</span>
                    <span className="font-mono text-zinc-800 dark:text-zinc-200">{extractedData.cnic}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Scan Requested:</span>
                    <span className="font-semibold text-primary">{extractedData.scanRequested}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Referring Doctor:</span>
                    <span className="text-zinc-800 dark:text-zinc-200">{extractedData.referringDoctor}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block text-[10px]">Clinical Symptoms:</span>
                    <span className="text-zinc-700 dark:text-zinc-300 italic">"{extractedData.clinicalHistory}"</span>
                  </div>
                </div>

                <Button size="sm" className="w-full gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Create Patient & Schedule STAT Study
                </Button>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-zinc-400 text-center p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                No document scanned yet. Upload an image on the left to extract structured clinical data.
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
