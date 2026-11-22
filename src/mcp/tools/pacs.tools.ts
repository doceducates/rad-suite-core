/**
 * MCP Tools: PACS DICOM Archive Operations
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { z } from 'zod';
import { queryPacsDimse, echoPacsDimse } from '@/services/pacs-dimse.service';
import { getDefaultPacsServer } from '@/services/pacs-server.service';
import type { McpToolDefinition, McpRequestContext } from '../types';

export const pacsCfindTool: McpToolDefinition = {
  name: 'radsuite_pacs_cfind',
  description: 'Query hospital PACS archive via DICOM C-FIND by accession, MRN, patient name, or modality.',
  category: 'pacs',
  requiredScope: 'pacs:query',
  isMutating: false,
  parameters: z.object({
    accessionNumber: z.string().optional().describe('Filter by accession number'),
    patientMrn: z.string().optional().describe('Filter by patient MRN / Hospital ID'),
    patientName: z.string().optional().describe('Filter by patient name (wildcard supported)'),
    modality: z.string().optional().describe('Modality (CT, MRI, CR, US, etc.)'),
    dateRange: z.enum(['today', 'yesterday', 'week', 'all', 'custom']).default('today').describe('Acquisition date filter'),
    dateFrom: z.string().optional().describe('YYYY-MM-DD custom start date'),
    dateTo: z.string().optional().describe('YYYY-MM-DD custom end date'),
  }),
  handler: async (args, _ctx: McpRequestContext) => {
    try {
      const results = await queryPacsDimse({
        accessionNumber: args.accessionNumber,
        patientMrn: args.patientMrn,
        patientName: args.patientName,
        modality: args.modality as any,
        dateRange: args.dateRange,
        dateFrom: args.dateFrom,
        dateTo: args.dateTo,
      });

      return {
        count: results.length,
        studies: results.slice(0, 50).map((s) => ({
          accessionNumber: s.accessionNumber,
          patientName: s.patientName,
          patientMrn: s.patientMrn,
          modality: s.modality,
          studyDescription: s.studyDescription,
          studyDate: s.studyDate,
          studyTime: s.studyTime,
          numSeries: s.numSeries,
          numInstances: s.numInstances,
        })),
      };
    } catch (err: any) {
      return {
        count: 0,
        studies: [],
        warning: `PACS query encountered an issue: ${err?.message || 'PACS node did not respond'}`,
      };
    }
  },
};

export const pacsPingTool: McpToolDefinition = {
  name: 'radsuite_pacs_ping',
  description: 'Test TCP and DICOM C-ECHO connectivity to the configured Hospital PACS server.',
  category: 'pacs',
  requiredScope: 'pacs:query',
  isMutating: false,
  parameters: z.object({}),
  handler: async (_args, _ctx: McpRequestContext) => {
    const server = await getDefaultPacsServer();
    const result = await echoPacsDimse(server);
    return {
      pacsServer: {
        name: server.name,
        host: server.host,
        port: server.port,
        aeTitle: server.aeTitle,
      },
      reachable: result.success,
      latencyMs: result.latencyMs,
      error: result.error,
    };
  },
};
