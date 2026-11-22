import React from 'react';

export interface CaseStudyFieldsProps {
  modality: string;
  setModality: (val: string) => void;
  bodyPart: string;
  setBodyPart: (val: string) => void;
  department: 'ER' | 'OPD' | 'Ward' | '';
  setDepartment: (val: 'ER' | 'OPD' | 'Ward' | '') => void;
  priority: 'routine' | 'urgent' | 'stat';
  setPriority: (val: 'routine' | 'urgent' | 'stat') => void;
  studyDescription: string;
  setStudyDescription: (val: string) => void;
  referringDoctor: string;
  setReferringDoctor: (val: string) => void;
  technologist: string;
  setTechnologist: (val: string) => void;
  scheduledAt: string;
  setScheduledAt: (val: string) => void;
  clinicalHistory: string;
  setClinicalHistory: (val: string) => void;
}

export function CaseStudyFields({
  modality,
  setModality,
  bodyPart,
  setBodyPart,
  department,
  setDepartment,
  priority,
  setPriority,
  studyDescription,
  setStudyDescription,
  referringDoctor,
  setReferringDoctor,
  technologist,
  setTechnologist,
  scheduledAt,
  setScheduledAt,
  clinicalHistory,
  setClinicalHistory,
}: CaseStudyFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary">Modality</label>
          <select
            value={modality}
            onChange={(e) => setModality(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none font-semibold cursor-pointer"
          >
            <option value="CT">CT Scan</option>
            <option value="MRI">MRI</option>
            <option value="CR">X-Ray (CR/DX)</option>
            <option value="US">Ultrasound</option>
            <option value="MG">Mammography</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary">Body Part</label>
          <select
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none cursor-pointer"
          >
            <option value="Brain">Brain / Neuro</option>
            <option value="LS Spine">LS Spine (Lumbar)</option>
            <option value="Cervical Spine">Cervical Spine</option>
            <option value="Thoracic Spine">Thoracic Spine</option>
            <option value="Whole Spine">Whole Spine</option>
            <option value="Chest">Chest / Thorax</option>
            <option value="Abdomen">Abdomen / Pelvis</option>
            <option value="MSK">MSK / Extremity</option>
            <option value="General">Other / General</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as any)}
            className="w-full px-2 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none cursor-pointer"
          >
            <option value="">(None)</option>
            <option value="ER">🚨 ER (Emergency)</option>
            <option value="OPD">🏥 OPD (Outpatient)</option>
            <option value="Ward">🛏️ Ward (Inpatient)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            className={`w-full px-2 py-1.5 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${
              priority === 'stat'
                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                : 'border-outline-variant bg-surface-container-lowest text-on-surface'
            }`}
          >
            <option value="routine">Routine</option>
            <option value="urgent">Urgent</option>
            <option value="stat">STAT Emergency</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-secondary">Study Description / Protocol</label>
        <input
          type="text"
          value={studyDescription}
          onChange={(e) => setStudyDescription(e.target.value)}
          placeholder="e.g. CT Brain Plain, MRI Lumbar Spine..."
          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary">Referring Doctor</label>
          <input
            type="text"
            value={referringDoctor}
            onChange={(e) => setReferringDoctor(e.target.value)}
            placeholder="e.g. Dr. Naveed (Neurosurgery)"
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary">Technologist / Room</label>
          <input
            type="text"
            value={technologist}
            onChange={(e) => setTechnologist(e.target.value)}
            placeholder="e.g. M. Usman / Room 2"
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-secondary">Scheduled Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface outline-none font-mono"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-secondary">Clinical Indication / History (Optional)</label>
        <textarea
          rows={2}
          value={clinicalHistory}
          onChange={(e) => setClinicalHistory(e.target.value)}
          placeholder="Clinical symptoms, fever, trauma, backache, radiculopathy..."
          className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-xs text-on-surface focus:ring-1 focus:ring-primary outline-none resize-none"
        />
      </div>
    </>
  );
}
