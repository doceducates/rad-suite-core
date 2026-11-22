import { z } from 'zod';
import type { PluginSlotId } from './plugin-types';

export const PluginSlotIdSchema = z.enum([
  'workstation:toolbar',
  'workstation:sidebar',
  'workstation:tab',
  'navigation:sidebar',
  'worklist:action',
  'editor:ai-action',
  'settings:tab',
  'pacs:source',
]) as z.ZodType<PluginSlotId>;

export const PluginSlotContributionSchema = z.object({
  slotId: PluginSlotIdSchema,
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  title: z.string().min(1).max(100),
  icon: z.string().max(50).optional(),
  order: z.number().int().min(0).max(1000).default(100),
  componentName: z.string().max(100).optional(),
  actionUrl: z.string().max(255).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
  roles: z.array(z.string()).optional(),
});

export const PluginManifestSchema = z.object({
  id: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'Plugin ID must be lowercase alphanumeric with hyphens'),
  name: z.string().min(2).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Version must follow SemVer (e.g. 1.0.0)'),
  description: z.string().max(500).default(''),
  author: z.string().max(100).optional(),
  homepage: z.string().url().optional().or(z.literal('')),
  minCoreVersion: z.string().optional(),
  slots: z.array(PluginSlotContributionSchema).default([]),
  entrypoint: z.string().max(100).optional(),
  backendPort: z.number().int().min(1024).max(65535).optional(),
  permissions: z.array(z.enum(['network', 'filesystem', 'pacs', 'hmis', 'admin'])).default([]),
  enabled: z.boolean().default(false),
  authorized: z.boolean().default(false),
  installedBy: z.string().optional(),
  authorizedBy: z.string().optional(),
  authorizedAt: z.string().optional(),
  installedAt: z.string().optional(),
});

export type PluginManifestInput = z.infer<typeof PluginManifestSchema>;
