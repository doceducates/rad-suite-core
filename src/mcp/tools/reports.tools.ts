/**
 * MCP Tools: Radiology Structured Reporting & AI Authoring
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { z } from 'zod';
import { db } from '@/db';
import { studies, reports, patients } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { saveReport, getReportRevisions } from '@/services/report.service';
import { generateReportSuggestion } from '@/services/ai-suggestion.service';
import { generateDifferentialDiagnosis } from '@/services/ai-differential.service';
import type { McpToolDefinition, McpRequestContext } from '../types';

export const getReportTool: McpToolDefinition = {
  name: 'radsuite_get_report',
  description: 'Retrieve current report findings, impression, recommendation, and version history for a study.',
  category: 'reports',
  requiredScope: 'reports:read',
  isMutating: false,
  parameters: z.object({
    accessionNumber: z.string().min(1).describe('The accession number of the study'),
  }),
  handler: async (args, ctx: McpRequestContext) => {
    const rows = await db
      .select({
        report: reports,
        study: studies,
        patient: patients,
      })
      .from(studies)
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(and(eq(studies.accessionNumber, args.accessionNumber.trim()), eq(studies.tenantId, ctx.tenantId)))
      .limit(1);

    if (!rows || rows.length === 0) {
      throw new Error(`Study '${args.accessionNumber}' not found for tenant '${ctx.tenantId}'.`);
    }

    const { report, study, patient } = rows[0];
    if (!report) {
      return {
        accessionNumber: study.accessionNumber,
        hasReport: false,
        message: 'No draft or finalized report exists for this study yet.',
      };
    }

    const revisions = await getReportRevisions(report.id);
    return {
      accessionNumber: study.accessionNumber,
      hasReport: true,
      reportId: report.id,
      status: report.status,
      clinicalHistory: report.clinicalHistory || study.clinicalHistory,
      technique: report.technique,
      comparison: report.comparison,
      findings: report.findings,
      impression: report.impression,
      recommendation: report.recommendation,
      criticalFinding: report.criticalFinding,
      signedBy: report.signedBy,
      signedAt: report.signedAt,
      revisionsCount: revisions.length,
      latestRevisions: revisions.slice(0, 5),
    };
  },
};

export const saveReportDraftTool: McpToolDefinition = {
  name: 'radsuite_save_report_draft',
  description: 'Save structured findings and impression into a draft report. Invariant: Agents can only write to draft state.',
  category: 'reports',
  requiredScope: 'reports:draft_write',
  isMutating: true,
  parameters: z.object({
    accessionNumber: z.string().min(1).describe('The accession number of the study'),
    findings: z.string().min(1).describe('Clinical findings body'),
    impression: z.string().min(1).describe('Impression summary'),
    recommendation: z.string().optional().describe('Actionable follow-up recommendations'),
    technique: z.string().optional().describe('Imaging protocol / technique'),
    comparison: z.string().optional().describe('Prior comparison study notes'),
    criticalFinding: z.boolean().default(false).describe('Flag indicating critical/emergency finding'),
  }),
  handler: async (args, ctx: McpRequestContext) => {
    // 1. Verify study exists and belongs to the caller's tenant
    const [study] = await db
      .select()
      .from(studies)
      .where(and(eq(studies.accessionNumber, args.accessionNumber.trim()), eq(studies.tenantId, ctx.tenantId)))
      .limit(1);

    if (!study) {
      throw new Error(`Study '${args.accessionNumber}' not found for tenant '${ctx.tenantId}'.`);
    }

    // 2. Enforce Strict Zero-Submit Invariant: Agent writes are strictly draft
    const result = await saveReport(
      {
        accessionNumber: study.accessionNumber,
        studyId: study.id,
        findings: args.findings,
        impression: args.impression,
        recommendation: args.recommendation || '',
        technique: args.technique || '',
        comparison: args.comparison || '',
        status: 'draft', // Hard-locked to draft
        criticalFinding: args.criticalFinding,
        isAutoSave: false,
        milestoneTag: 'agent_draft',
      },
      {
        id: ctx.userId,
        name: ctx.userName || 'AI Scribe Agent',
        role: (ctx.userRole as string) || 'resident',
      }
    );

    return {
      success: result.success,
      reportId: result.reportId,
      version: result.version,
      status: 'draft',
      message: 'Draft report revision saved successfully. Final sign-off requires human radiologist approval.',
    };
  },
};

export const suggestReportTool: McpToolDefinition = {
  name: 'radsuite_suggest_report',
  description: 'Generate structured findings and impressions using Rad Suite Clinical AI suggestion pipeline.',
  category: 'reports',
  requiredScope: 'reports:read',
  isMutating: false,
  parameters: z.object({
    modality: z.string().describe('Study modality (e.g., CT, MRI, X-Ray)'),
    bodyPart: z.string().describe('Anatomical body region (e.g., Brain, Chest, Lumbar Spine)'),
    indication: z.string().optional().describe('Clinical history / indication'),
    preliminaryNotes: z.string().optional().describe('Doctor quick dictation or preliminary findings notes'),
  }),
  handler: async (args, _ctx: McpRequestContext) => {
    const suggestion = await generateReportSuggestion({
      draftText: args.preliminaryNotes || `${args.modality} ${args.bodyPart}`,
      modality: args.modality,
      clinicalHistory: args.indication || '',
      activeSection: 'findings',
    });
    return suggestion;
  },
};

export const generateDifferentialTool: McpToolDefinition = {
  name: 'radsuite_generate_differential',
  description: 'Generate differential diagnoses and clinical pearls based on radiology findings.',
  category: 'reports',
  requiredScope: 'knowledge:read',
  isMutating: false,
  parameters: z.object({
    findings: z.string().min(1).describe('The observed radiology findings'),
    modality: z.string().default('CT').describe('Study modality (CT, MRI, etc.)'),
    clinicalHistory: z.string().optional().describe('Clinical history and symptoms'),
  }),
  handler: async (args, _ctx: McpRequestContext) => {
    const differential = await generateDifferentialDiagnosis(
      args.findings,
      args.modality,
      args.clinicalHistory
    );
    return differential;
  },
};
