'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notify } from '@/services/notification.service';
import { Shield, Lock, CheckCircle2, XCircle } from 'lucide-react';

interface ToolItem {
  name: string;
  description: string;
  category: string;
  requiredScope?: string;
  isMutating: boolean;
  version: string;
}

export function McpToolsGovernance() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [disabledTools, setDisabledTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/admin/mcp/tools');
      const data = await res.json();
      if (data.success) {
        setTools(data.tools || []);
        setDisabledTools(data.disabledTools || []);
      }
    } catch {
      notify.error('Failed to load MCP tool governance list');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTool = (toolName: string) => {
    setDisabledTools((prev) =>
      prev.includes(toolName) ? prev.filter((t) => t !== toolName) : [...prev, toolName]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/mcp/tools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabledTools }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success('Tool governance policies updated for this tenant');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      notify.error(err.message || 'Could not save tool policies');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">Loading registered tools...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-on-surface">Registered Clinical Tools ({tools.length})</h3>
          <p className="text-[11px] text-muted-foreground">
            Admins can disable specific tools for this hospital tenant to restrict autonomous agent capabilities.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Policies'}
        </Button>
      </div>

      <div className="space-y-2">
        {tools.map((tool) => {
          const isEnabled = !disabledTools.includes(tool.name);
          return (
            <Card key={tool.name} className="bg-surface-container-low border-border/60">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-semibold">{tool.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {tool.category}
                    </Badge>
                    {tool.requiredScope && (
                      <Badge variant="default" className="text-[10px] font-mono">
                        {tool.requiredScope}
                      </Badge>
                    )}
                    {tool.isMutating ? (
                      <Badge variant="danger" className="text-[10px]">
                        Mutating (Draft Only)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Read-Only
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{tool.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleTool(tool.name)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                      isEnabled ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isEnabled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                        Disabled
                      </>
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
