/**
 * Open Core Plugin Architecture - Types & Interfaces
 * Enables zero-core-modification extensibility for proprietary plugins.
 */

export type PluginSlotId =
  | 'workstation:toolbar'
  | 'workstation:sidebar'
  | 'workstation:tab'
  | 'navigation:sidebar'
  | 'worklist:action'
  | 'editor:ai-action'
  | 'settings:tab'
  | 'pacs:source';

export interface PluginSlotContribution {
  slotId: PluginSlotId;
  id: string;
  title: string;
  icon?: string;
  order?: number;
  componentName?: string;
  actionUrl?: string;
  props?: Record<string, unknown>;
  roles?: string[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  minCoreVersion?: string;
  slots?: PluginSlotContribution[];
  entrypoint?: string;
  backendPort?: number;
  permissions?: ('network' | 'filesystem' | 'pacs' | 'hmis' | 'admin')[];
  enabled: boolean;
  authorized?: boolean;
  installedBy?: string;
  authorizedBy?: string;
  authorizedAt?: string;
  installedAt?: string;
}

export interface PluginRuntimeInfo {
  manifest: PluginManifest;
  status: 'active' | 'disabled' | 'pending_authorization' | 'error';
  error?: string;
}

export interface PluginSlotContext {
  caseId?: string;
  accession?: string;
  studyUid?: string;
  patientId?: string;
  userRole?: string;
  [key: string]: unknown;
}
