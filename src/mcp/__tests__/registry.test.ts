import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { McpToolRegistry } from '@/mcp/registry';
import { initializeMcpRegistry } from '@/mcp/tools';
import type { McpRequestContext, McpToolDefinition } from '@/mcp/types';

describe('MCP Tool Registry & RBAC Engine', () => {
  beforeEach(() => {
    initializeMcpRegistry();
  });

  const baseContext: McpRequestContext = {
    userId: 'test-user-1',
    userName: 'Dr. Test Radiologist',
    userRole: 'radiologist',
    tenantId: 'tnt_lgh',
    scopes: ['*'],
    allowedTools: ['*'],
    isReadOnly: false,
  };

  it('registers core clinical tools, resources, and prompts', () => {
    const allTools = McpToolRegistry.getAllTools();
    expect(allTools.length).toBeGreaterThanOrEqual(10);

    const toolNames = allTools.map((t) => t.name);
    expect(toolNames).toContain('radsuite_get_worklist');
    expect(toolNames).toContain('radsuite_get_case');
    expect(toolNames).toContain('radsuite_claim_case');
    expect(toolNames).toContain('radsuite_get_report');
    expect(toolNames).toContain('radsuite_save_report_draft');
    expect(toolNames).toContain('radsuite_suggest_report');
    expect(toolNames).toContain('radsuite_generate_differential');
    expect(toolNames).toContain('radsuite_pacs_cfind');
    expect(toolNames).toContain('radsuite_anatomy_lookup');
    expect(toolNames).toContain('radsuite_system_health');

    const resources = McpToolRegistry.getAllResources();
    expect(resources.some((r) => r.uri === 'radsuite://worklist/active')).toBe(true);

    const prompts = McpToolRegistry.getAllPrompts();
    expect(prompts.some((p) => p.name === 'radsuite-structured-report')).toBe(true);
  });

  it('hides mutating tools when agent context is read-only', () => {
    const readOnlyContext: McpRequestContext = {
      ...baseContext,
      isReadOnly: true,
    };

    const visibleTools = McpToolRegistry.getVisibleTools(readOnlyContext);
    const names = visibleTools.map((t) => t.name);

    expect(names).toContain('radsuite_get_worklist');
    expect(names).toContain('radsuite_get_report');
    expect(names).toContain('radsuite_anatomy_lookup');

    // Mutating tools MUST be hidden
    expect(names).not.toContain('radsuite_save_report_draft');
    expect(names).not.toContain('radsuite_claim_case');
  });

  it('blocks execution of mutating tools when context is read-only', async () => {
    const readOnlyContext: McpRequestContext = {
      ...baseContext,
      isReadOnly: true,
    };

    const result = await McpToolRegistry.executeTool(
      'radsuite_claim_case',
      { accessionNumber: 'ACC-123' },
      readOnlyContext
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('read-only');
  });

  it('filters tools based on granular API key scopes', () => {
    const scopedContext: McpRequestContext = {
      ...baseContext,
      scopes: ['knowledge:read'],
    };

    const visibleTools = McpToolRegistry.getVisibleTools(scopedContext);
    const names = visibleTools.map((t) => t.name);

    expect(names).toContain('radsuite_anatomy_lookup');
    expect(names).toContain('radsuite_radiopaedia_search');
    expect(names).toContain('radsuite_generate_differential');

    // Cases & PACS tools require other scopes
    expect(names).not.toContain('radsuite_get_worklist');
    expect(names).not.toContain('radsuite_pacs_cfind');
  });

  it('validates tool arguments with Zod schemas and reports errors safely', async () => {
    // Missing required accessionNumber
    const result = await McpToolRegistry.executeTool('radsuite_get_case', {}, baseContext);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('accessionNumber');
  });

  it('allows adding dynamic custom tools in 1 step (Extensibility Pattern)', async () => {
    const customTool: McpToolDefinition = {
      name: 'radsuite_custom_echo',
      description: 'Test extensibility tool',
      category: 'system',
      requiredScope: 'system:read',
      isMutating: false,
      parameters: z.object({
        echo: z.string(),
      }),
      handler: async (args, ctx) => ({
        echoed: args.echo,
        tenant: ctx.tenantId,
      }),
    };

    McpToolRegistry.registerTool(customTool);
    expect(McpToolRegistry.getTool('radsuite_custom_echo')).toBeDefined();

    const res = await McpToolRegistry.executeTool(
      'radsuite_custom_echo',
      { echo: 'ping' },
      { ...baseContext, scopes: ['system:read'] }
    );

    expect(res.isError).toBe(false);
    expect(res.content[0].text).toContain('ping');
    expect(res.content[0].text).toContain('tnt_lgh');
  });
});
