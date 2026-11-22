// Layer 2 (Domain/Services): Acute Critical Findings & Emergency Radar
// Detects life-threatening radiological conditions and prepares urgent clinical handovers.

export interface CriticalFindingMatch {
  category: 'Neuro' | 'Chest' | 'Abdomen' | 'Spine' | 'Vascular';
  finding: string;
  matchedText: string;
  urgentAction: string;
}

const CRITICAL_FINDING_RULES: Array<{
  category: CriticalFindingMatch['category'];
  finding: string;
  pattern: RegExp;
  urgentAction: string;
}> = [
  // Neuro / Intracranial
  {
    category: 'Neuro',
    finding: 'Intracranial Hemorrhage',
    pattern: /\b(?:intracranial\s+hemorrhage|subdural\s+h[ae]matoma|epidural\s+h[ae]matoma|extradural\s+h[ae]matoma|subarachnoid\s+h[ae]morrhage|intraventricular\s+h[ae]morrhage)\b/i,
    urgentAction: 'Urgent Neurosurgical evaluation & ICP management.',
  },
  {
    category: 'Neuro',
    finding: 'Midline Shift / Brain Herniation',
    pattern: /\b(?:midline\s+shift|uncal\s+herniation|subfalcine\s+herniation|tonsillar\s+herniation|effacement\s+of\s+basal\s+cisterns)\b/i,
    urgentAction: 'Immediate Neurosurgery bedside consultation for mass effect.',
  },

  // Chest / Cardiovascular
  {
    category: 'Chest',
    finding: 'Tension Pneumothorax',
    pattern: /\b(?:tension\s+pneumothorax|large\s+pneumothorax|pneumothorax\s+with\s+mediastinal\s+shift)\b/i,
    urgentAction: 'Immediate needle decompression / chest tube thoracostomy.',
  },
  {
    category: 'Chest',
    finding: 'Pulmonary Embolism',
    pattern: /\b(?:pulmonary\s+embolism|saddle\s+embolus|acute\s+pulmonary\s+thromboembolism)\b/i,
    urgentAction: 'Urgent Anticoagulation / Pulmonary Critical Care assessment.',
  },
  {
    category: 'Vascular',
    finding: 'Aortic Dissection / Ruptured Aneurysm',
    pattern: /\b(?:aortic\s+dissection|intimal\s+flap\s+in\s+aorta|ruptured\s+(?:aortic\s+)?aneurysm)\b/i,
    urgentAction: 'Immediate Vascular / Cardiothoracic Surgery consultation.',
  },

  // Spine
  {
    category: 'Spine',
    finding: 'Cauda Equina / Severe Cord Compression',
    pattern: /\b(?:cauda\s+equina\s+syndrome|severe\s+thecal\s+sac\s+compression|cord\s+compression\s+with\s+myelomalacia)\b/i,
    urgentAction: 'Emergency Spinal Decompression within 24-48h window.',
  },

  // Abdomen
  {
    category: 'Abdomen',
    finding: 'Pneumoperitoneum / Free Air',
    pattern: /\b(?:pneumoperitoneum|free\s+intra-?abdominal\s+air|visceral\s+perforation)\b/i,
    urgentAction: 'Urgent Surgical Consultation for hollow viscus perforation.',
  },
];

/**
 * Scans report text for life-threatening acute findings
 */
export function detectCriticalFindings(text: string): CriticalFindingMatch[] {
  if (!text || typeof text !== 'string') return [];

  const cleanText = text.replace(/<[^>]*>/g, ' ');
  const matches: CriticalFindingMatch[] = [];
  const seenFindings = new Set<string>();

  for (const rule of CRITICAL_FINDING_RULES) {
    const match = cleanText.match(rule.pattern);
    if (match && !seenFindings.has(rule.finding)) {
      // Exclude explicit negatives (e.g. "no intracranial hemorrhage", "rules out pulmonary embolism")
      const matchIndex = match.index || 0;
      // Look back to the beginning of the sentence or clause (up to 100 chars)
      const clauseStart = Math.max(0, cleanText.lastIndexOf('.', matchIndex), cleanText.lastIndexOf(';', matchIndex));
      const lookbackStart = Math.max(clauseStart, matchIndex - 100);
      const preceding = cleanText.slice(lookbackStart, matchIndex).toLowerCase();
      const isNegated = /\b(?:no|without|denies|negative\s+for|rules?\s+out|unlikely)\b/i.test(preceding);

      if (!isNegated) {
        seenFindings.add(rule.finding);
        matches.push({
          category: rule.category,
          finding: rule.finding,
          matchedText: match[0],
          urgentAction: rule.urgentAction,
        });
      }
    }
  }

  return matches;
}

/**
 * Formats an urgent WhatsApp ER Handover alert
 */
export function formatUrgentErHandover(options: {
  patientName: string;
  mrn: string;
  modality: string;
  criticalMatches: CriticalFindingMatch[];
  doctorName?: string;
  hospitalName?: string;
}): string {
  const { patientName, mrn, modality, criticalMatches, doctorName, hospitalName } = options;
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const bulletList = criticalMatches
    .map((m) => `🚨 *${m.finding}*: ${m.urgentAction}`)
    .join('\n');

  return [
    `*🚨 CRITICAL RADIOLOGY ALERT [${modality}]*`,
    hospitalName ? `📍 *Hospital:* ${hospitalName}` : null,
    `👤 *Patient:* ${patientName} (MRN: ${mrn})`,
    `⏰ *Time of Alert:* ${timeStr}`,
    `\n*Critical Findings Detected:*`,
    bulletList,
    doctorName ? `\n_Reported by: ${doctorName}_` : null,
    `_Please acknowledge receipt and initiate emergency clinical management._`,
  ]
    .filter(Boolean)
    .join('\n');
}
