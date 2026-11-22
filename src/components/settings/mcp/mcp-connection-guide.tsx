'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { Terminal, Laptop, Globe, Check } from 'lucide-react';

interface McpConnectionGuideProps {
  appUrl: string;
  sampleKey?: string;
}

export function McpConnectionGuide({ appUrl, sampleKey = 'rs_live_your_key_here' }: McpConnectionGuideProps) {
  const [activeTab, setActiveTab] = useState<'claude' | 'cursor' | 'curl'>('claude');

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        radsuite: {
          command: 'cmd.exe',
          args: [
            '/c',
            'npm --prefix d:\\Projects\\Rad-Reporting\\rad-suite-core run --silent mcp',
          ],
          env: {
            RADSUITE_API_KEY: sampleKey,
            DEFAULT_TENANT_ID: 'tnt_lgh',
          },
        },
      },
    },
    null,
    2
  );

  const cursorSnippet = `Name: radsuite\nType: command\nCommand: npm --prefix d:\\Projects\\Rad-Reporting\\rad-suite-core run --silent mcp`;

  const curlSnippet = `curl -X POST ${appUrl}/api/mcp \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${sampleKey}" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "radsuite_get_worklist",
      "arguments": { "modality": "CT", "limit": 5 }
    }
  }'`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('claude')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'claude' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-container'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          Claude Desktop
        </button>
        <button
          onClick={() => setActiveTab('cursor')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'cursor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-container'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Cursor / Antigravity
        </button>
        <button
          onClick={() => setActiveTab('curl')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'curl' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-surface-container'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          Remote VPS (curl)
        </button>
      </div>

      <Card className="bg-surface-container-low border-border/60">
        <CardContent className="p-4 space-y-3">
          {activeTab === 'claude' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">
                  Add to <code className="text-primary font-mono">%APPDATA%\Claude\claude_desktop_config.json</code>
                </span>
                <CopyButton text={claudeConfig} />
              </div>
              <pre className="p-3 bg-surface-container rounded-lg border border-border font-mono text-[11px] overflow-x-auto text-on-surface">
                {claudeConfig}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Restart Claude Desktop after saving this file. The hammer icon in Claude will reveal all 11 Rad Suite tools.
              </p>
            </div>
          )}

          {activeTab === 'cursor' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Add to Cursor Settings → Features → MCP</span>
                <CopyButton text={cursorSnippet} />
              </div>
              <pre className="p-3 bg-surface-container rounded-lg border border-border font-mono text-[11px] overflow-x-auto text-on-surface">
                {cursorSnippet}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Cursor will automatically connect via stdio and expose tools to Agent Mode (Composer).
              </p>
            </div>
          )}

          {activeTab === 'curl' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Query Remote VPS via HTTPS</span>
                <CopyButton text={curlSnippet} />
              </div>
              <pre className="p-3 bg-surface-container rounded-lg border border-border font-mono text-[11px] overflow-x-auto text-on-surface">
                {curlSnippet}
              </pre>
              <p className="text-[11px] text-muted-foreground">
                Works from any cloud orchestrator, LangChain agent, or remote python script passing your agent key.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
