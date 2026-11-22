#!/usr/bin/env node
/**
 * Rad Suite MCP Server - CLI Entrypoint (Stdio Transport)
 * Connects Antigravity, Claude Desktop, Cursor, and Local AI Agents.
 * Layer 1 (Transport) - Under 250 lines
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createRadSuiteMcpServer } from './server';
import { resolveMcpRequestContext } from '@/services/mcp-auth.service';
import type { McpRequestContext } from './types';

async function main() {
  const envKey = (process.env.RADSUITE_API_KEY || process.env.API_SECRET_KEY || '').trim();
  let ctx: McpRequestContext | null = null;

  if (envKey) {
    ctx = await resolveMcpRequestContext(envKey);
  }

  // Fallback to local default workstation clinical context
  if (!ctx) {
    ctx = {
      userId: 'local-workstation-doctor',
      userName: 'Local Radiologist',
      userRole: 'radiologist',
      tenantId: process.env.DEFAULT_TENANT_ID || 'tnt_lgh',
      scopes: ['*'],
      allowedTools: ['*'],
      isReadOnly: false,
    };
  }

  process.stderr.write(
    `[RadSuite MCP] Starting Stdio Server for Tenant: ${ctx.tenantId} (${ctx.userName}, Role: ${ctx.userRole}, ReadOnly: ${ctx.isReadOnly})\n`
  );

  const server = createRadSuiteMcpServer(ctx);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  process.stderr.write('[RadSuite MCP] Stdio Transport connected. Ready for agent messages.\n');
}

main().catch((err) => {
  process.stderr.write(`[RadSuite MCP Fatal Error] ${err?.stack || err?.message || err}\n`);
  process.exit(1);
});
