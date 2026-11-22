import React from 'react';
import { Sparkles } from 'lucide-react';

export interface PresetExam {
  modality: string;
  desc: string;
  part: string;
}

export const PRESET_EXAMS: PresetExam[] = [
  { modality: 'CT', desc: 'CT Brain Plain (Stroke / Trauma Protocol)', part: 'Brain' },
  { modality: 'CT', desc: 'CT Chest CECT (Mediastinal / Pulmonary)', part: 'Chest' },
  { modality: 'CR', desc: 'Digital X-Ray Chest PA View', part: 'Chest' },
  { modality: 'US', desc: 'Ultrasound Whole Abdomen & Pelvis', part: 'Abdomen' },
  { modality: 'MRI', desc: 'MRI Lumbar Spine (Disc / Radiculopathy)', part: 'LS Spine' },
  { modality: 'MRI', desc: 'MRI Cervical Spine (Cord / Radiculopathy)', part: 'Cervical Spine' },
];

interface ManualCasePresetsProps {
  currentDesc: string;
  onSelect: (preset: PresetExam) => void;
}

export function ManualCasePresets({ currentDesc, onSelect }: ManualCasePresetsProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold text-secondary flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-primary" /> Common Exam Presets
      </label>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_EXAMS.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(p)}
            className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer transition-colors ${
              currentDesc === p.desc
                ? 'bg-primary text-on-primary font-bold border-primary shadow-2xs'
                : 'bg-surface-container-lowest text-secondary border-outline-variant/60 hover:text-on-surface hover:border-primary/50'
            }`}
          >
            <span className="font-bold mr-1">{p.modality}</span>
            <span>{p.desc.split(' (')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
