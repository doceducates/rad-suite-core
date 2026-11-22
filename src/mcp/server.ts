/**
 * Universal Rad Suite MCP Server Coordinator
 * Layer 2 (Domain/Services) - Under 250 lines
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { initializeMcpRegistry, McpToolRegistry } from './tools';
import type { McpRequestContext } from './types';

export function createRadSuiteMcpServer(ctx: McpRequestContext): McpServer {
  // 1. Ensure registry is initialized
  initializeMcpRegistry();

  const server = new McpServer(
    {
      name: 'Rad Suite Medical Workstation MCP',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // 2. Register Authorized & Visible Tools for this context
  const tools = McpToolRegistry.getVisibleTools(ctx);
  for (const tool of tools) {
    const shape = (tool.parameters as z.ZodObject<any>).shape || {};
    server.tool(tool.name, tool.description, shape, async (args: any) => {
      const res = await McpToolRegistry.executeTool(tool.name, args, ctx);
      return {
        content: res.content as any,
        isError: res.isError,
      };
    });
  }

  // 3. Register Resources
  const resources = McpToolRegistry.getAllResources();
  for (const res of resources) {
    server.resource(res.name, res.uri, async () => {
      const data = await res.read(ctx);
      return {
        contents: [
          {
            uri: data.uri,
            text: data.text || '',
            mimeType: data.mimeType || 'application/json',
          },
        ],
      };
    });
  }

  // 4. Register Prompts
  const prompts = McpToolRegistry.getAllPrompts();
  for (const prompt of prompts) {
    const argsDef: Record<string, z.ZodTypeAny> = {};
    for (const a of prompt.arguments || []) {
      argsDef[a.name] = a.required ? z.string() : z.string().optional();
    }
    server.prompt(prompt.name, prompt.description, argsDef, async (args) => {
      const p = await prompt.get(args as any, ctx);
      return {
        description: p.description,
        messages: p.messages,
      };
    });
  }

  return server;
}
