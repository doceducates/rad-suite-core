/**
 * MCP Tool Registry Initializer & Resource/Prompt Bindings
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { McpToolRegistry } from '../registry';
import { getWorklistTool, getCaseTool, claimCaseTool } from './cases.tools';
import {
  getReportTool,
  saveReportDraftTool,
  suggestReportTool,
  generateDifferentialTool,
} from './reports.tools';
import { pacsCfindTool, pacsPingTool } from './pacs.tools';
import { anatomyLookupTool, radiopaediaSearchTool } from './knowledge.tools';
import { systemHealthTool } from './system.tools';
import { db } from '@/db';
import { studies, patients } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

let isInitialized = false;

export function initializeMcpRegistry(): void {
  if (isInitialized) return;

  // 1. Register Clinical Tools
  McpToolRegistry.registerTool(getWorklistTool);
  McpToolRegistry.registerTool(getCaseTool);
  McpToolRegistry.registerTool(claimCaseTool);

  McpToolRegistry.registerTool(getReportTool);
  McpToolRegistry.registerTool(saveReportDraftTool);
  McpToolRegistry.registerTool(suggestReportTool);
  McpToolRegistry.registerTool(generateDifferentialTool);

  McpToolRegistry.registerTool(pacsCfindTool);
  McpToolRegistry.registerTool(pacsPingTool);

  McpToolRegistry.registerTool(anatomyLookupTool);
  McpToolRegistry.registerTool(radiopaediaSearchTool);

  McpToolRegistry.registerTool(systemHealthTool);

  // 2. Register MCP Resources
  McpToolRegistry.registerResource({
    uri: 'radsuite://worklist/active',
    name: 'Active Hospital Worklist',
    description: 'Current real-time list of active imaging studies waiting for reporting',
    mimeType: 'application/json',
    read: async (ctx) => {
      const list = await db
        .select({
          accession: studies.accessionNumber,
          modality: studies.modality,
          scanType: studies.scanType,
          priority: studies.priority,
          status: studies.status,
          patientName: patients.fullName,
        })
        .from(studies)
        .innerJoin(patients, eq(patients.id, studies.patientId))
        .where(eq(studies.tenantId, ctx.tenantId))
        .orderBy(desc(studies.scheduledAt))
        .limit(25);

      return {
        uri: 'radsuite://worklist/active',
        text: JSON.stringify(list, null, 2),
        mimeType: 'application/json',
      };
    },
  });

  McpToolRegistry.registerResource({
    uri: 'radsuite://system/status',
    name: 'Rad Suite System Status',
    description: 'Core system and tenant diagnostics',
    mimeType: 'application/json',
    read: async (ctx) => ({
      uri: 'radsuite://system/status',
      text: JSON.stringify(
        {
          tenantId: ctx.tenantId,
          user: ctx.userName,
          role: ctx.userRole,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      mimeType: 'application/json',
    }),
  });

  // 3. Register Standard MCP Prompts
  McpToolRegistry.registerPrompt({
    name: 'radsuite-structured-report',
    description: 'Guided clinical workflow to draft a structured radiology report for a study',
    arguments: [
      { name: 'accessionNumber', description: 'The accession number of the study', required: true },
    ],
    get: async (args, ctx) => ({
      description: `Draft structured report for accession: ${args.accessionNumber}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are an AI Clinical Radiology Scribe operating Rad Suite Core. First call 'radsuite_get_case' for accession '${args.accessionNumber}'. Review the clinical indication and technique. Then use 'radsuite_suggest_report' to outline standard structured sections. Formulate complete, evidence-based FINDINGS and IMPRESSION, then call 'radsuite_save_report_draft'. Note: All saves must remain draft.`,
          },
        },
      ],
    }),
  });

  McpToolRegistry.registerPrompt({
    name: 'radsuite-discrepancy-audit',
    description: 'Audit a draft report for laterality contradictions, missed findings, or critical omissions',
    arguments: [
      { name: 'accessionNumber', description: 'Accession number of the study to audit', required: true },
    ],
    get: async (args, _ctx) => ({
      description: `Audit draft report for accession: ${args.accessionNumber}`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please fetch the draft report for accession '${args.accessionNumber}' using 'radsuite_get_report'. Audit the report for:\n1. Laterality contradictions (e.g. left vs right mismatch in findings vs impression).\n2. Missing critical finding notifications.\n3. Recommendation appropriateness.\nSummarize any discrepancies clearly.`,
          },
        },
      ],
    }),
  });

  isInitialized = true;
}

export { McpToolRegistry };
