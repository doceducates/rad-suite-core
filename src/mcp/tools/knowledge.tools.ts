/**
 * MCP Tools: Radiology Knowledge & Reference Lookups
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { z } from 'zod';
import { searchStructures, getModules, getModuleDetails } from '@/services/anatomy.service';
import { fetchRadiopaediaCases } from '@/services/radiopaedia-api.service';
import type { McpToolDefinition, McpRequestContext } from '../types';

export const anatomyLookupTool: McpToolDefinition = {
  name: 'radsuite_anatomy_lookup',
  description: 'Search cross-sectional anatomical structures, landmarks, and modules in the eAnatomy atlas.',
  category: 'knowledge',
  requiredScope: 'knowledge:read',
  isMutating: false,
  parameters: z.object({
    query: z.string().min(1).describe('Anatomical structure name (e.g. "middle cerebral artery", "caudate nucleus")'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum structures to return'),
  }),
  handler: async (args, _ctx: McpRequestContext) => {
    try {
      const structures = searchStructures(args.query, args.limit);
      return {
        query: args.query,
        count: structures.length,
        structures: structures.map((s) => ({
          id: s.id,
          name: s.name_en,
          latinName: s.name_la || null,
          sliceCount: s.slice_count,
        })),
      };
    } catch (err: any) {
      return {
        query: args.query,
        count: 0,
        structures: [],
        note: `Anatomy lookup returned: ${err?.message || 'Database unavailable'}`,
      };
    }
  },
};

export const radiopaediaSearchTool: McpToolDefinition = {
  name: 'radsuite_radiopaedia_search',
  description: 'Search Radiopaedia reference cases, imaging pearls, and differential diagnoses.',
  category: 'knowledge',
  requiredScope: 'knowledge:read',
  isMutating: false,
  parameters: z.object({
    query: z.string().min(1).describe('Disease entity, finding, or keyword (e.g., "glioblastoma", "pulmonary embolism")'),
    modality: z.string().default('CT').describe('Imaging modality: CT, MRI, X-Ray, US'),
    bodyPart: z.string().optional().describe('Body region: Brain, Chest, Abdomen, Spine'),
  }),
  handler: async (args, _ctx: McpRequestContext) => {
    const result = await fetchRadiopaediaCases(args.query, args.modality, args.bodyPart);
    return {
      query: args.query,
      modality: args.modality,
      source: result.source,
      count: result.cases.length,
      cases: result.cases.slice(0, 10).map((c) => ({
        id: c.id,
        title: c.title,
        modality: c.modality,
        bodyPart: c.bodyPart,
        demographics: c.demographics,
        url: c.radiopaediaUrl,
        keyFindings: c.keyFindings,
        diagnosticPearls: c.diagnosticPearls,
        differentialDiagnoses: c.differentialDiagnoses,
      })),
    };
  },
};
