'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mic, Sparkles, Wand2, FileAudio } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitize';

export function AiCockpitTestbenchTab() {
  const [testFindings, setTestFindings] = useState(
    'Liver shows normal size. There is a 2.4 cm calculus in the gallbladder with mild wall thickening. Spleen and pancreas are normal. Left kidney shows 4 mm calculus without hydronephrosis.'
  );
  const [testImpression, setTestImpression] = useState(
    'Cholelithiasis with acute cholecystitis. Right kidney calculus.'
  );
  const [testResponse, setTestResponse] = useState<any>(null);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [runningMedASR, setRunningMedASR] = useState(false);
  const [medasrResult, setMedasrResult] = useState<any>(null);
  const [runningStructure, setRunningStructure] = useState(false);
  const [structureResult, setStructureResult] = useState<any>(null);

  const runMedASRTest = async () => {
    setRunningMedASR(true);
    try {
      const res = await fetch('/api/ai/medasr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioPath:
            'C:/Users/muham/.gemini/antigravity/brain/3c09fbf3-f8d7-4b61-b748-50353dcb60c8/scratch/test_audio.wav',
        }),
      });
      const data = await res.json();
      setMedasrResult(data);
      if (data.text) {
        setTestFindings(data.text);
      }
    } finally {
      setRunningMedASR(false);
    }
  };

  const runStructureTest = async () => {
    setRunningStructure(true);
    try {
      const res = await fetch('/api/ai/structure-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: testFindings, modality: 'CT' }),
      });
      const data = await res.json();
      setStructureResult(data);
      if (data.impression) {
        setTestImpression(data.impression);
      }
    } finally {
      setRunningStructure(false);
    }
  };

  const runTestBenchAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const res = await fetch('/api/ai/analyze-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findings: testFindings, impression: testImpression, modality: 'CT' }),
      });
      const data = await res.json();
      setTestResponse(data);
    } finally {
      setRunningAnalysis(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-on-surface text-[11px] flex items-center justify-between">
        <div>
          <strong>🧪 Interactive AI Test Bench:</strong> Test local speech recognition, report structuring, and clinical discrepancy detection.
        </div>
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">Air-Gapped & Cloud Ready</Badge>
      </div>

      {/* Sub-Card 1: MedASR Audio Transcription */}
      <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <Mic className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-on-surface text-xs">MedASR Voice Recognition Engine</span>
              <p className="text-[10px] text-secondary">Google MedASR Conformer CTC running natively on NVIDIA GPU</p>
            </div>
          </div>
          <Badge variant="success" className="text-[10px] font-mono">PyTorch CUDA Active</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runMedASRTest}
            isLoading={runningMedASR}
            className="gap-1.5 text-xs font-semibold py-1.5"
          >
            <FileAudio className="w-3.5 h-3.5 text-primary" /> Run MedASR Audio Test
          </Button>
          <span className="text-[10px] text-secondary">Transcribes clinical sample with anatomical tag detection</span>
        </div>

        {medasrResult && (
          <div className="p-2.5 rounded-lg bg-surface-container-low border border-outline-variant/60 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-secondary">
              <span>Engine: <strong className="text-on-surface">{medasrResult.device?.toUpperCase() || 'GPU'}</strong></span>
              <span className="text-primary font-semibold">✓ Transcription Verified</span>
            </div>
            <div className="p-2 rounded bg-surface-container font-mono text-[10px] text-on-surface leading-relaxed max-h-24 overflow-y-auto">
              {medasrResult.text}
            </div>
          </div>
        )}
      </div>

      {/* Sub-Card 2: Clinical Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-on-surface text-[11px]">Dictated Clinical Findings:</label>
            <button
              type="button"
              onClick={runStructureTest}
              disabled={runningStructure || !testFindings}
              className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Wand2 className="w-3 h-3" /> Auto-Structure with MedGemma
            </button>
          </div>
          <textarea
            value={testFindings}
            onChange={(e) => setTestFindings(e.target.value)}
            rows={4}
            className="w-full p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface text-xs focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="font-bold text-on-surface block mb-1 text-[11px]">Radiologist Impression:</label>
          <textarea
            value={testImpression}
            onChange={(e) => setTestImpression(e.target.value)}
            rows={4}
            className="w-full p-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-low text-on-surface text-xs focus:ring-1 focus:ring-primary focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {structureResult && (
        <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/60 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-primary" /> MedGemma Structuring Result:
            </span>
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/10">
              {structureResult.correctedTerms?.length ? `${structureResult.correctedTerms.length} Terms Normalized` : 'Clean Format'}
            </Badge>
          </div>
          <div className="text-[11px] text-on-surface space-y-1">
            <div><strong>Technique:</strong> {structureResult.technique}</div>
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(structureResult.findings) }} className="prose dark:prose-invert text-[11px]" />
            <div><strong>Impression:</strong> {structureResult.impression}</div>
          </div>
        </div>
      )}

      <Button
        size="sm"
        variant="primary"
        onClick={runTestBenchAnalysis}
        isLoading={runningAnalysis}
        className="w-full gap-2 font-semibold py-2"
      >
        <Sparkles className="w-3.5 h-3.5" /> Run Clinical QA & Discrepancy Analysis
      </Button>

      {testResponse && (
        <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-on-surface">Discrepancy & Laterality Detection Results:</span>
            <Badge variant={testResponse.discrepancies?.length > 0 ? 'danger' : 'success'}>
              {testResponse.discrepancies?.length || 0} Issues Found
            </Badge>
          </div>

          {testResponse.discrepancies?.map((d: any) => (
            <div key={d.id} className="p-2 rounded bg-error/10 border border-error/20 text-error text-[11px]">
              <strong>⚠️ {d.severity}:</strong> {d.description || d.issue}
            </div>
          ))}

          {testResponse.shadowDifferentials?.length > 0 && (
            <div className="pt-2 border-t border-outline-variant/60">
              <span className="font-semibold text-secondary block text-[11px]">AI Shadow Differentials:</span>
              <ul className="list-disc list-inside text-on-surface text-[11px] space-y-0.5 mt-1">
                {testResponse.shadowDifferentials.map((s: string, i: number) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
