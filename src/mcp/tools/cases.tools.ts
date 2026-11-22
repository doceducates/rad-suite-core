/**
 * MCP Tools: Radiology Cases & Worklist Operations
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { z } from 'zod';
import { db } from '@/db';
import { studies, patients, reports } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { McpToolDefinition, McpRequestContext } from '../types';

export const getWorklistTool: McpToolDefinition = {
  name: 'radsuite_get_worklist',
  description: 'Retrieve active radiology worklist studies for the current hospital tenant.',
  category: 'cases',
  requiredScope: 'cases:read',
  isMutating: false,
  parameters: z.object({
    modality: z.string().optional().describe('Filter by modality: CT, MRI, CR, US, etc.'),
    status: z.string().optional().describe('Filter by status: scheduled, in_progress, completed'),
    priority: z.enum(['routine', 'urgent', 'stat', 'all']).optional().describe('Filter by clinical priority'),
    limit: z.number().min(1).max(100).default(30).describe('Maximum cases to return'),
    assignedToMeOnly: z.boolean().optional().describe('Only return cases assigned to the authenticated user'),
  }),
  handler: async (args, ctx: McpRequestContext) => {
    let query = db
      .select({
        accessionNumber: studies.accessionNumber,
        modality: studies.modality,
        scanType: studies.scanType,
        bodyPart: studies.bodyPart,
        priority: studies.priority,
        status: studies.status,
        scheduledAt: studies.scheduledAt,
        clinicalHistory: studies.clinicalHistory,
        assignedRadiologistId: studies.assignedRadiologistId,
        patientName: patients.fullName,
        patientMrn: patients.mrNumber,
        patientAge: patients.age,
        patientGender: patients.gender,
        reportStatus: reports.status,
      })
      .from(studies)
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(eq(studies.tenantId, ctx.tenantId))
      .orderBy(desc(studies.scheduledAt))
      .limit(args.limit);

    const rows = await query;
    return rows.filter((r) => {
      if (args.modality && r.modality?.toUpperCase() !== args.modality.toUpperCase()) return false;
      if (args.status && r.status !== args.status) return false;
      if (args.priority && args.priority !== 'all' && r.priority !== args.priority) return false;
      if (args.assignedToMeOnly && r.assignedRadiologistId !== ctx.userId) return false;
      return true;
    });
  },
};

export const getCaseTool: McpToolDefinition = {
  name: 'radsuite_get_case',
  description: 'Fetch complete clinical metadata, patient demographics, indication, and report state for a specific case.',
  category: 'cases',
  requiredScope: 'cases:read',
  isMutating: false,
  parameters: z.object({
    accessionNumber: z.string().min(1).describe('The unique DICOM / RIS accession number'),
  }),
  handler: async (args, ctx: McpRequestContext) => {
    const rows = await db
      .select({
        study: studies,
        patient: patients,
        report: reports,
      })
      .from(studies)
      .innerJoin(patients, eq(patients.id, studies.patientId))
      .leftJoin(reports, eq(reports.studyId, studies.id))
      .where(and(eq(studies.accessionNumber, args.accessionNumber.trim()), eq(studies.tenantId, ctx.tenantId)))
      .limit(1);

    if (!rows || rows.length === 0) {
      throw new Error(`Case with accession '${args.accessionNumber}' not found for tenant '${ctx.tenantId}'.`);
    }

    const { study, patient, report } = rows[0];
    return {
      accessionNumber: study.accessionNumber,
      tenantId: study.tenantId,
      modality: study.modality,
      scanType: study.scanType,
      bodyPart: study.bodyPart,
      priority: study.priority,
      status: study.status,
      clinicalHistory: study.clinicalHistory,
      referringDoctor: study.referringDoctor,
      scheduledAt: study.scheduledAt,
      numInstances: study.numInstances,
      assignedRadiologistId: study.assignedRadiologistId,
      patient: {
        mrn: patient.mrNumber,
        fullName: patient.fullName,
        age: patient.age,
        gender: patient.gender,
      },
      report: report
        ? {
            id: report.id,
            status: report.status,
            technique: report.technique,
            findings: report.findings,
            impression: report.impression,
            recommendation: report.recommendation,
            criticalFinding: report.criticalFinding,
            signedBy: report.signedBy,
            signedAt: report.signedAt,
          }
        : null,
    };
  },
};

export const claimCaseTool: McpToolDefinition = {
  name: 'radsuite_claim_case',
  description: 'Claim an active unassigned study for the authenticated clinician.',
  category: 'cases',
  requiredScope: 'cases:write',
  isMutating: true,
  parameters: z.object({
    accessionNumber: z.string().min(1).describe('The accession number of the study to claim'),
  }),
  handler: async (args, ctx: McpRequestContext) => {
    const rows = await db
      .select()
      .from(studies)
      .where(and(eq(studies.accessionNumber, args.accessionNumber.trim()), eq(studies.tenantId, ctx.tenantId)))
      .limit(1);

    if (!rows || rows.length === 0) {
      throw new Error(`Study '${args.accessionNumber}' not found.`);
    }

    const study = rows[0];
    if (study.assignedRadiologistId && study.assignedRadiologistId !== ctx.userId) {
      throw new Error(`Study is already claimed by radiologist ID: ${study.assignedRadiologistId}`);
    }

    await db
      .update(studies)
      .set({
        assignedRadiologistId: ctx.userId as any,
        claimedAt: new Date() as any,
        status: 'in_progress',
        updatedAt: new Date() as any,
      })
      .where(eq(studies.id, study.id));

    return {
      success: true,
      accessionNumber: study.accessionNumber,
      claimedBy: ctx.userName,
      claimedAt: new Date().toISOString(),
    };
  },
};
