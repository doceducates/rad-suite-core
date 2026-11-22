import { Sparkles, FileCheck } from 'lucide-react';

interface ClinicalMacrosBarProps {
  onInsertMacro: (text: string) => void;
}

export const CLINICAL_MACROS = [
  {
    label: 'CT Brain: Normal',
    text: 'No evidence of acute intra-axial or extra-axial hemorrhage, territorial infarction, or mass effect. Ventricular system, basilar cisterns, and gray-white differentiation intact.',
  },
  {
    label: 'CT Brain: Acute Stroke',
    text: 'Early hyperdense right MCA sign noted with subtle effacement of the adjacent cortical sulci and loss of gray-white distinction in the insular ribbon. ASPECTS score: 8/10. No acute hemorrhage.',
  },
  {
    label: 'CT Chest: PE Negative',
    text: 'Pulmonary arterial trunk, right and left main pulmonary arteries, and all lobar/segmental branches show homogeneous contrast opacification with no filling defect. RV/LV ratio < 1.0.',
  },
  {
    label: 'CT Abd: Appendicitis',
    text: 'Appendix is dilated measuring 9.8mm in transverse diameter with circumferential mucosal hyperenhancement, pericecal mesenteric fat stranding, and mild free fluid.',
  },
  {
    label: 'CT KUB: Renal Calculus',
    text: '4.5mm hyperdense calculus identified at the right vesicoureteric junction (VUJ) producing mild upstream hydroureteronephrosis and mild perinephric tracking.',
  },
  {
    label: 'MRI Spine: L5-S1 Disc',
    text: 'Right paracentral disc extrusion at L5-S1 with mild inferior migration, compressing the traversing right S1 nerve root in the lateral recess. Thecal sac patent.',
  },
  {
    label: 'MRI Brain: Normal',
    text: 'Normal cerebral, cerebellar, and brainstem parenchyma. No abnormal diffusion restriction on DWI/ADC. No pathological intracranial contrast enhancement.',
  },
  {
    label: 'MRI Knee: Medial Meniscus',
    text: 'Horizontal cleavage tear involving the posterior horn of the medial meniscus extending to the inferior articular surface. Anterior and posterior cruciate ligaments intact.',
  },
];

export function ClinicalMacrosBar({ onInsertMacro }: ClinicalMacrosBarProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 text-xs">
      <span className="text-zinc-400 flex items-center gap-1 shrink-0 font-medium text-[11px]">
        <Sparkles className="w-3 h-3 text-primary" /> Macros:
      </span>
      {CLINICAL_MACROS.map((m) => (
        <button
          key={m.label}
          type="button"
          onClick={() => onInsertMacro(m.text)}
          className="px-2 py-1 rounded bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 hover:border-primary text-zinc-700 dark:text-zinc-300 hover:text-primary text-[11px] shrink-0 transition-colors cursor-pointer flex items-center gap-1"
        >
          <FileCheck className="w-3 h-3 text-zinc-400" /> {m.label}
        </button>
      ))}
    </div>
  );
}
