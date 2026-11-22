// Layer 2: Fast Deterministic Rule Engine for Consultant Sign-Out Changes
import { SignoutTemplate, ConsultantPatchResult } from '@/types/signout';
import { isSectionPositive } from './templates/signout-templates.data';

export function runDeterministicSurgicalPatch(
  template: SignoutTemplate,
  currentSections: Record<string, string>,
  currentImpression: string[],
  deltaNote: string,
  format: 'standardized' | 'hmis' = 'standardized'
): (ConsultantPatchResult & { matchFound: boolean }) | null {
  const lower = deltaNote.toLowerCase().trim();
  if (!lower) return null;

  const nextSections = { ...currentSections };
  const changesSummary: string[] = [];

  const getNormalText = (sec: any) =>
    format === 'hmis' ? sec.normalHmis : sec.normalStandardized;

  // 1. Spine-specific rules (MRI Lumbosacral Spine)
  if (template.id === 'mri-ls-spine') {
    // L3-L4
    if (lower.includes('l3-l4') || lower.includes('l3-4')) {
      const sec = template.sections.find((s) => s.id === 'l3_l4');
      if (sec && (lower.includes('normal') || lower.includes('remove') || lower.includes('clear') || lower.includes('no bulge'))) {
        nextSections.l3_l4 = getNormalText(sec);
        changesSummary.push('L3-L4 Disc Level: Reverted to standard normal template (removed bulge).');
      }
    }
    // L4-L5
    if (lower.includes('l4-l5') || lower.includes('l4-5')) {
      const sec = template.sections.find((s) => s.id === 'l4_l5');
      if (sec) {
        if (lower.includes('normal') || lower.includes('clear')) {
          nextSections.l4_l5 = getNormalText(sec);
          changesSummary.push('L4-L5 Disc Level: Reverted to standard normal template.');
        } else {
          const side = lower.includes('right paracentral')
            ? 'Right paracentral'
            : lower.includes('left paracentral')
            ? 'Left paracentral'
            : 'Broad-based posterior';
          const morph = lower.includes('extrusion') ? 'disc extrusion' : 'disc protrusion';
          const root = lower.includes('right l5')
            ? 'compressing the right L5 traversing nerve root'
            : lower.includes('left l5')
            ? 'compressing the left L5 traversing nerve root'
            : 'causing lateral recess narrowing and traversing nerve root compression';
          const sten = lower.includes('severe')
            ? 'severe central spinal canal stenosis'
            : lower.includes('moderate')
            ? 'moderate central spinal canal stenosis'
            : 'mild central spinal canal stenosis';
          nextSections.l4_l5 = `At L4-L5, ${side.toLowerCase()} ${morph} is seen ${root} with ${sten}.`;
          changesSummary.push(`L4-L5 Disc Level: Patched to ${side} ${morph} (${sten}).`);
        }
      }
    }
    // L5-S1
    if (lower.includes('l5-s1') || lower.includes('l5-1')) {
      const sec = template.sections.find((s) => s.id === 'l5_s1');
      if (sec) {
        if (lower.includes('normal') || lower.includes('clear')) {
          nextSections.l5_s1 = getNormalText(sec);
          changesSummary.push('L5-S1 Disc Level: Reverted to standard normal template.');
        } else if (lower.includes('bulge') || lower.includes('protrusion') || lower.includes('extrusion')) {
          nextSections.l5_s1 =
            'At L5-S1, mild diffuse annular disc bulge is noted indenting the anterior thecal sac without significant neural foraminal narrowing.';
          changesSummary.push('L5-S1 Disc Level: Updated with diffuse disc bulge indenting thecal sac.');
        }
      }
    }
    // Posterior Facets
    if (lower.includes('facet')) {
      nextSections.posterior_soft_tissue =
        'Mild bilateral lower lumbar facet joint arthropathy and ligamentum flavum thickening are noted. Paraspinal muscles and bilateral SI joints are unremarkable.';
      changesSummary.push('Posterior Elements: Added bilateral facet joint arthropathy.');
    }
  }

  // 2. Generic clearance for Brain, Knee, Cervical, Fistulogram
  template.sections.forEach((sec) => {
    const headingWords = sec.heading.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
    const mentioned = headingWords.some((w) => lower.includes(w));
    if (mentioned) {
      if (lower.includes('normal') || lower.includes('clear') || (lower.includes('no ') && (lower.includes('shift') || lower.includes('abscess') || lower.includes('tear')))) {
        if (sec.id === 'ventricles_cisterns' && lower.includes('no midline shift')) {
          nextSections[sec.id] =
            'Mild effacement of adjacent cortical sulci is seen. Ventricular system is normal in caliber and midline structures are centered (no midline shift).';
          changesSummary.push(`${sec.heading}: Cleared midline shift per consultant discussion.`);
        } else if (sec.id === 'ischioanal_fossae' && lower.includes('no abscess')) {
          nextSections[sec.id] =
            'Mild inflammatory fat stranding is seen in the ischioanal fossa along the tract without organized fluid collection or abscess.';
          changesSummary.push(`${sec.heading}: Cleared abscess; updated to mild inflammatory stranding.`);
        } else if (!changesSummary.some((c) => c.startsWith(sec.heading))) {
          nextSections[sec.id] = getNormalText(sec);
          changesSummary.push(`${sec.heading}: Reverted to normal baseline template.`);
        }
      }
    }
  });

  if (changesSummary.length === 0) {
    return null;
  }

  // 3. Re-synthesize Impression from all remaining positive sections
  const updatedPositives = template.sections.filter((s) =>
    isSectionPositive(nextSections[s.id], s, format)
  );
  const nextImpression =
    updatedPositives.length > 0
      ? updatedPositives.map((s) => nextSections[s.id])
      : [...template.normalImpression];

  return {
    matchFound: true,
    patchedSections: nextSections,
    patchedImpression: nextImpression,
    changesSummary,
  };
}
