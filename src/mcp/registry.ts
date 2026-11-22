/**
 * Declarative MCP Tool, Resource, and Prompt Registry
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { logAudit } from '@/services/audit.service';
import type {
  McpRequestContext,
  McpToolDefinition,
  McpResourceDefinition,
  McpPromptDefinition,
  McpExecutionResult,
} from './types';

class Registry {
  private tools = new Map<string, McpToolDefinition>();
  private resources = new Map<string, McpResourceDefinition>();
  private prompts = new Map<string, McpPromptDefinition>();

  registerTool(tool: McpToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[MCP_REGISTRY] Overwriting existing tool: ${tool.name}`);
    }
    this.tools.set(tool.name, tool);
  }

  registerResource(resource: McpResourceDefinition): void {
    this.resources.set(resource.uri, resource);
  }

  registerPrompt(prompt: McpPromptDefinition): void {
    this.prompts.set(prompt.name, prompt);
  }

  getAllTools(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getVisibleTools(ctx: McpRequestContext): McpToolDefinition[] {
    return this.getAllTools().filter((tool) => {
      // 1. Read-only gate for mutating tools
      if (tool.isMutating && ctx.isReadOnly) {
        return false;
      }
      // 2. Scope verification
      if (tool.requiredScope && !ctx.scopes.includes('*') && !ctx.scopes.includes(tool.requiredScope)) {
        return false;
      }
      // 3. Explicit tool whitelist check
      if (ctx.allowedTools && !ctx.allowedTools.includes('*') && !ctx.allowedTools.includes(tool.name)) {
        return false;
      }
      return true;
    });
  }

  getTool(name: string): McpToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllResources(): McpResourceDefinition[] {
    return Array.from(this.resources.values());
  }

  getResource(uri: string): McpResourceDefinition | undefined {
    return this.resources.get(uri);
  }

  getAllPrompts(): McpPromptDefinition[] {
    return Array.from(this.prompts.values());
  }

  getPrompt(name: string): McpPromptDefinition | undefined {
    return this.prompts.get(name);
  }

  async executeTool(name: string, rawArgs: unknown, ctx: McpRequestContext): Promise<McpExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Tool '${name}' not found.` }],
      };
    }

    // 1. Read-only safeguard
    if (tool.isMutating && ctx.isReadOnly) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Access Denied: Tool '${name}' is mutating and context is read-only.` }],
      };
    }

    // 2. Scope check
    if (tool.requiredScope && !ctx.scopes.includes('*') && !ctx.scopes.includes(tool.requiredScope)) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Forbidden: Required scope '${tool.requiredScope}' missing.` }],
      };
    }

    // 3. Tool whitelist check
    if (ctx.allowedTools && !ctx.allowedTools.includes('*') && !ctx.allowedTools.includes(tool.name)) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Forbidden: Tool '${name}' is not in allowed tools list.` }],
      };
    }

    // 4. Validate arguments using Zod
    const parseResult = tool.parameters.safeParse(rawArgs || {});
    if (!parseResult.success) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Invalid parameters for '${name}': ${parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
          },
        ],
      };
    }

    // 5. Audit Logging (HIPAA Invariant)
    try {
      await logAudit({
        userId: ctx.userId,
        userName: ctx.userName,
        action: 'mcp_tool_execute',
        entityType: 'MCP',
        entityId: name,
        details: JSON.stringify({
          tool: name,
          tenantId: ctx.tenantId,
          args: rawArgs,
        }),
      });
    } catch (auditErr) {
      console.warn('[MCP_AUDIT_WARN] Could not record audit log:', auditErr);
    }

    // 6. Execute Handler
    try {
      const output = await tool.handler(parseResult.data, ctx);
      const text = typeof output === 'string' ? output : JSON.stringify(output, null, 2);
      return {
        isError: false,
        content: [{ type: 'text', text }],
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Execution failed: ${err?.message || 'Internal error'}` }],
      };
    }
  }
}

export const McpToolRegistry = new Registry();
