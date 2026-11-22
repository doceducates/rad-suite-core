/**
 * Model Context Protocol (MCP) Core Types & Contracts
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { z } from 'zod';
import type { UserRole } from '@/types';

export interface McpRequestContext {
  userId: string;
  userName: string;
  userRole: UserRole | string;
  tenantId: string;
  tenantCode?: string;
  scopes: string[];
  allowedTools: string[];
  isReadOnly: boolean;
  apiKeyId?: string;
}

export type McpToolCategory = 'cases' | 'reports' | 'pacs' | 'knowledge' | 'system';

export interface McpToolDefinition<TArgs = any, TResult = any> {
  name: string;
  description: string;
  category: McpToolCategory;
  requiredScope?: string;
  isMutating?: boolean;
  parameters: z.ZodType<TArgs>;
  handler: (args: TArgs, ctx: McpRequestContext) => Promise<TResult>;
  version?: string;
  deprecated?: boolean;
}

export interface McpResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
  read: (ctx: McpRequestContext) => Promise<{
    uri: string;
    text?: string;
    blob?: string;
    mimeType?: string;
  }>;
}

export interface McpPromptDefinition {
  name: string;
  description: string;
  arguments?: {
    name: string;
    description?: string;
    required?: boolean;
  }[];
  get: (
    args: Record<string, string>,
    ctx: McpRequestContext
  ) => Promise<{
    description?: string;
    messages: {
      role: 'user' | 'assistant';
      content: {
        type: 'text';
        text: string;
      };
    }[];
  }>;
}

export interface McpExecutionResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}
