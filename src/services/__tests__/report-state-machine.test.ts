import { describe, it, expect } from 'vitest';
import { validateReportTransition } from '../report-state-machine.service';

describe('Report State Machine & Clinical Workflow', () => {
  it('should allow PGR to transition from draft to preliminary and submitted', () => {
    expect(validateReportTransition('draft', 'preliminary', 'resident').allowed).toBe(true);
    expect(validateReportTransition('preliminary', 'submitted', 'resident').allowed).toBe(true);
  });

  it('should block PGR from finalizing reports independently', () => {
    const result = validateReportTransition('submitted', 'final', 'resident');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Post-Graduate Residents (PGR) cannot finalize');
  });

  it('should allow PGR to update submitted reports during consultant sign-out rounds', () => {
    const result = validateReportTransition('submitted', 'submitted', 'resident');
    expect(result.allowed).toBe(true);
  });

  it('should allow Consultant Radiologist to finalize a submitted report', () => {
    const result = validateReportTransition('submitted', 'final', 'radiologist');
    expect(result.allowed).toBe(true);
  });

  it('should prevent silently overwriting a final report and require amendment', () => {
    const result = validateReportTransition('final', 'final', 'radiologist');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('must be published as an official amendment');

    const amendResult = validateReportTransition('final', 'amended', 'radiologist');
    expect(amendResult.allowed).toBe(true);
  });

  it('should block PGR from finalizing reports independently using pgr role', () => {
    const result = validateReportTransition('submitted', 'final', 'pgr');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Post-Graduate Residents (PGR) cannot finalize');
  });

  it('should allow Consultant to finalize a submitted report using consultant role', () => {
    const result = validateReportTransition('submitted', 'final', 'consultant');
    expect(result.allowed).toBe(true);
  });

  it('should block technologists and service accounts from altering clinical status', () => {
    expect(validateReportTransition('draft', 'final', 'technologist').allowed).toBe(false);
    expect(validateReportTransition('draft', 'submitted', 'service').allowed).toBe(false);
  });

  it('should allow Consultant to re-open final reports to draft, preliminary, or submitted', () => {
    expect(validateReportTransition('final', 'draft', 'consultant').allowed).toBe(true);
    expect(validateReportTransition('final', 'preliminary', 'consultant').allowed).toBe(true);
    expect(validateReportTransition('final', 'submitted', 'consultant').allowed).toBe(true);
  });

  it('should allow Consultant to re-open amended reports to draft or preliminary', () => {
    expect(validateReportTransition('amended', 'draft', 'consultant').allowed).toBe(true);
    expect(validateReportTransition('amended', 'preliminary', 'consultant').allowed).toBe(true);
  });

  it('should allow PGR/resident to move finalized report to preliminary or pending for revision/addendum', () => {
    expect(validateReportTransition('final', 'preliminary', 'resident').allowed).toBe(true);
    expect(validateReportTransition('final', 'pending', 'resident').allowed).toBe(true);
    expect(validateReportTransition('final', 'preliminary', 'pgr').allowed).toBe(true);
    expect(validateReportTransition('final', 'pending', 'pgr').allowed).toBe(true);
  });

  it('should block PGR from moving finalized report to draft directly', () => {
    const result = validateReportTransition('final', 'draft', 'resident');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Trainees cannot overwrite finalized reports directly');
  });

  it('should allow Admin universal authority to transition across any report status', () => {
    expect(validateReportTransition('final', 'draft', 'admin').allowed).toBe(true);
    expect(validateReportTransition('final', 'final', 'admin').allowed).toBe(true);
    expect(validateReportTransition('amended', 'draft', 'admin').allowed).toBe(true);
    expect(validateReportTransition('draft', 'final', 'admin').allowed).toBe(true);
  });
});
