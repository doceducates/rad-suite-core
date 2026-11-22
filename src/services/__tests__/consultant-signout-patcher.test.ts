import { describe, it, expect } from 'vitest';
import { getSignoutTemplate, isSectionPositive } from '../templates/signout-templates.data';
import { runDeterministicSurgicalPatch } from '../consultant-delta-rules.service';
import { runConsultantSurgicalPatch } from '../ai-consultant-patcher.service';

describe('Sign-Out Master Templates & Positive Extractor', () => {
  it('correctly resolves master templates by modality keyword', () => {
    expect(getSignoutTemplate('MRI Lumbosacral Spine').id).toBe('mri-ls-spine');
    expect(getSignoutTemplate('MRI Cervical Spine').id).toBe('mri-cervical-spine');
    expect(getSignoutTemplate('MRI Brain Stroke').id).toBe('mri-brain');
    expect(getSignoutTemplate('MRI Knee Joint').id).toBe('mri-knee');
    expect(getSignoutTemplate('MRI Perianal Fistula').id).toBe('mri-fistulogram');
    expect(getSignoutTemplate('MRCP Biliary').id).toBe('mrcp');
  });

  it('accurately distinguishes normal baseline from positive pathology', () => {
    const lsTemplate = getSignoutTemplate('MRI Lumbosacral Spine');
    const l4Section = lsTemplate.sections.find((s) => s.id === 'l4_l5')!;

    expect(isSectionPositive(l4Section.normalStandardized, l4Section)).toBe(false);
    expect(isSectionPositive(l4Section.normalHmis, l4Section, 'hmis')).toBe(false);

    const abnormalText = 'Broad-based disc protrusion at L4-L5 with moderate central spinal canal stenosis.';
    expect(isSectionPositive(abnormalText, l4Section)).toBe(true);
  });
});

describe('Deterministic Consultant Delta Rule Engine', () => {
  const lsTemplate = getSignoutTemplate('MRI Lumbosacral Spine');

  it('reverts level to normal baseline and updates impression when cleared', () => {
    const initialSections = {
      l3_l4: 'At L3-L4, diffuse annular disc bulge is seen indenting thecal sac.',
      l4_l5: 'At L4-L5, broad-based disc protrusion is seen compressing nerve root.',
    };
    const initialImpression = [
      'L3-L4 diffuse disc bulge.',
      'L4-L5 broad-based disc protrusion.',
    ];

    const result = runDeterministicSurgicalPatch(
      lsTemplate,
      initialSections,
      initialImpression,
      'L3-L4 is completely normal, clear the bulge.'
    );

    expect(result).not.toBeNull();
    expect(result!.matchFound).toBe(true);
    expect(result!.patchedSections.l3_l4).toContain('L3-L4 intervertebral disc');
    // L4-L5 must remain untouched
    expect(result!.patchedSections.l4_l5).toBe(initialSections.l4_l5);
    // Impression must no longer contain L3-L4 bulge
    expect(result!.patchedImpression.some((i) => i.includes('L3-L4'))).toBe(false);
    expect(result!.changesSummary[0]).toContain('L3-L4 Disc Level: Reverted to standard normal template');
  });

  it('surgically patches L4-L5 and L5-S1 disc pathology without altering upper lumbar levels', () => {
    const initialSections = {
      alignment_vertebrae: lsTemplate.sections[0].normalStandardized,
      l1_l2_l2_l3: lsTemplate.sections[1].normalStandardized,
      l3_l4: lsTemplate.sections[2].normalStandardized,
      l4_l5: 'L4-L5 mild bulge',
      l5_s1: lsTemplate.sections[4].normalStandardized,
    };

    const delta = 'L4-L5 right paracentral extrusion compressing right L5 root with severe stenosis. Add mild bulge at L5-S1.';
    const result = runDeterministicSurgicalPatch(
      lsTemplate,
      initialSections,
      ['L4-L5 mild bulge'],
      delta
    );

    expect(result).not.toBeNull();
    expect(result!.patchedSections.l4_l5).toContain('right paracentral disc extrusion');
    expect(result!.patchedSections.l4_l5).toContain('right L5 traversing nerve root');
    expect(result!.patchedSections.l4_l5).toContain('severe central spinal canal stenosis');
    expect(result!.patchedSections.l5_s1).toContain('diffuse annular disc bulge');
    // Alignment and L1-L3 must be completely unaltered
    expect(result!.patchedSections.alignment_vertebrae).toBe(initialSections.alignment_vertebrae);
    expect(result!.patchedSections.l1_l2_l2_l3).toBe(initialSections.l1_l2_l2_l3);
  });
});

describe('Hybrid AI Consultant Surgical Patcher', () => {
  it('executes fast deterministic path without network failure', async () => {
    const res = await runConsultantSurgicalPatch({
      modalityOrTitle: 'MRI Lumbosacral Spine',
      sectionTexts: { l4_l5: 'L4-L5 normal' },
      impressionList: [],
      deltaNote: 'L4-L5 right paracentral extrusion compressing right L5 root',
    });

    expect(res.patchedSections.l4_l5).toContain('right paracentral disc extrusion');
    expect(res.changesSummary.length).toBeGreaterThan(0);
  });
});
