/**
 * Rad Suite MCP HTTP & SSE Transport Endpoint
 * Connects Remote AI Agents, VPS deployments, and Web Clients.
 * Layer 1 (Transport) - Under 250 lines
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveMcpRequestContext } from '@/services/mcp-auth.service';
import { initializeMcpRegistry, McpToolRegistry } from '@/mcp/tools';
import type { McpRequestContext, McpToolDefinition } from '@/mcp/types';

function zodObjectToJsonSchema(zodObj: any) {
  const shape = zodObj?.shape || {};
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, field] of Object.entries<any>(shape)) {
    const typeName = field?._def?.typeName;
    const isOptional = typeName === 'ZodOptional' || field?.isOptional?.();
    const unwrapped = isOptional && field?._def?.innerType ? field._def.innerType : field;
    const innerTypeName = unwrapped?._def?.typeName || typeName;
    const desc = unwrapped?.description || field?.description;

    let type = 'string';
    if (innerTypeName === 'ZodNumber') type = 'number';
    else if (innerTypeName === 'ZodBoolean') type = 'boolean';
    else if (innerTypeName === 'ZodArray') type = 'array';
    else if (innerTypeName === 'ZodObject') type = 'object';

    properties[key] = {
      type,
      ...(desc ? { description: desc } : {}),
      ...(innerTypeName === 'ZodEnum' ? { enum: unwrapped._def.values } : {}),
    };

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

async function authenticate(req: NextRequest): Promise<McpRequestContext | null> {
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';
  let token = apiKeyHeader.trim();

  if (!token && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  return resolveMcpRequestContext(token);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    },
  });
}

export async function GET(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid X-API-Key or Bearer token.' },
      { status: 401 }
    );
  }

  initializeMcpRegistry();
  const visibleTools = McpToolRegistry.getVisibleTools(ctx);

  return NextResponse.json({
    status: 'operational',
    protocolVersion: '2024-11-05',
    serverInfo: {
      name: 'Rad Suite Medical Workstation MCP',
      version: '1.0.0',
    },
    context: {
      tenantId: ctx.tenantId,
      user: ctx.userName,
      role: ctx.userRole,
      isReadOnly: ctx.isReadOnly,
      scopes: ctx.scopes,
    },
    toolsCount: visibleTools.length,
    tools: visibleTools.map((t) => ({
      name: t.name,
      description: t.description,
      category: t.category,
      isMutating: Boolean(t.isMutating),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await authenticate(req);
  if (!ctx) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized. Provide valid X-API-Key or Bearer token.' }, id: null },
      { status: 401 }
    );
  }

  initializeMcpRegistry();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error: Invalid JSON' }, id: null },
      { status: 400 }
    );
  }

  const { jsonrpc, id, method, params } = body;
  if (jsonrpc !== '2.0') {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' }, id: id || null },
      { status: 400 }
    );
  }

  try {
    // 1. Initialize
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'Rad Suite Medical Workstation MCP', version: '1.0.0' },
        },
      });
    }

    // 2. Notifications
    if (method === 'notifications/initialized') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: {} });
    }

    // 3. Ping
    if (method === 'ping') {
      return NextResponse.json({ jsonrpc: '2.0', id, result: {} });
    }

    // 4. Tools List
    if (method === 'tools/list') {
      const visible = McpToolRegistry.getVisibleTools(ctx);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: visible.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: zodObjectToJsonSchema(t.parameters),
          })),
        },
      });
    }

    // 5. Tools Call
    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      const res = await McpToolRegistry.executeTool(toolName, toolArgs, ctx);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: res.content,
          isError: res.isError,
        },
      });
    }

    // 6. Resources List
    if (method === 'resources/list') {
      const resList = McpToolRegistry.getAllResources();
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          resources: resList.map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType || 'application/json',
          })),
        },
      });
    }

    // 7. Resources Read
    if (method === 'resources/read') {
      const targetUri = params?.uri;
      const resource = McpToolRegistry.getResource(targetUri);
      if (!resource) {
        return NextResponse.json(
          { jsonrpc: '2.0', error: { code: -32602, message: `Resource '${targetUri}' not found` }, id },
          { status: 404 }
        );
      }
      const data = await resource.read(ctx);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { contents: [{ uri: data.uri, text: data.text, mimeType: data.mimeType }] },
      });
    }

    // 8. Prompts List
    if (method === 'prompts/list') {
      const prompts = McpToolRegistry.getAllPrompts();
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          prompts: prompts.map((p) => ({
            name: p.name,
            description: p.description,
            arguments: p.arguments,
          })),
        },
      });
    }

    // 9. Prompts Get
    if (method === 'prompts/get') {
      const promptName = params?.name;
      const prompt = McpToolRegistry.getPrompt(promptName);
      if (!prompt) {
        return NextResponse.json(
          { jsonrpc: '2.0', error: { code: -32602, message: `Prompt '${promptName}' not found` }, id },
          { status: 404 }
        );
      }
      const res = await prompt.get(params?.arguments || {}, ctx);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: { description: res.description, messages: res.messages },
      });
    }

    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32601, message: `Method '${method}' not found` }, id },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: err?.message || 'Internal RPC error' }, id },
      { status: 500 }
    );
  }
}
