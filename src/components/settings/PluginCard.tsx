'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Power,
  Trash2,
  AlertCircle,
  FileCode,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import type { PluginRuntimeInfo } from '@/lib/plugins/plugin-types';

interface PluginCardProps {
  item: PluginRuntimeInfo;
  isAdmin: boolean;
  currentUserEmail?: string;
  onToggle: (pluginId: string, currentStatus: string) => void;
  onAuthorize: (pluginId: string, authorized: boolean) => void;
  onUninstall: (pluginId: string, name: string) => void;
}

export function PluginCard({
  item,
  isAdmin,
  currentUserEmail,
  onToggle,
  onAuthorize,
  onUninstall,
}: PluginCardProps) {
  const { manifest, status, error } = item;
  const isPending = status === 'pending_authorization' || manifest.authorized === false;
  const isActive = status === 'active';
  const isError = status === 'error';
  const isOwner = manifest.installedBy === currentUserEmail;

  return (
    <Card className="bg-surface-container border-outline-variant/60 flex flex-col justify-between shadow-2xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-on-surface">{manifest.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/60 text-secondary">
                v{manifest.version}
              </span>
            </div>
            <span className="text-[11px] font-mono text-secondary">id: {manifest.id}</span>
          </div>

          <Badge
            variant="outline"
            className={`text-[10px] uppercase font-mono ${
              isPending
                ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10'
                : isActive
                ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                : isError
                ? 'border-error/40 text-error bg-error/10'
                : 'border-zinc-500/40 text-zinc-400 bg-zinc-500/10'
            }`}
          >
            {isPending ? 'Pending Authorization' : status}
          </Badge>
        </div>

        <p className="text-xs text-secondary line-clamp-2">
          {manifest.description || 'No description provided.'}
        </p>

        {/* Clinician pending banner */}
        {isPending && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-start gap-2">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <div className="font-semibold leading-tight">Awaiting Administrator Review</div>
              <div className="text-[11px] text-secondary">
                Installed by <span className="font-mono text-foreground">{manifest.installedBy || 'clinician'}</span>.
                Locked until signed off by Hospital Administrator.
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {isError && error && (
          <div className="flex items-center gap-2 p-2 rounded bg-error/10 border border-error/20 text-error text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Slots */}
        {manifest.slots && manifest.slots.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <FileCode className="w-3 h-3 text-secondary shrink-0" />
            <span className="text-[10px] text-secondary">Slots:</span>
            {manifest.slots.map((s) => (
              <span
                key={s.id}
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container-high border border-outline-variant/40 text-secondary font-mono"
              >
                {s.slotId}
              </span>
            ))}
          </div>
        )}

        {/* Security Permissions */}
        {manifest.permissions && manifest.permissions.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10px] text-secondary">Permissions:</span>
            {manifest.permissions.map((p) => (
              <span
                key={p}
                className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      {/* Role-Gated Footer Actions */}
      <div className="px-4 py-2.5 border-t border-outline-variant/40 bg-surface-container-low flex items-center justify-between gap-2">
        {isAdmin ? (
          <>
            {isPending ? (
              <div className="flex items-center gap-2 w-full justify-between">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAuthorize(manifest.id, true)}
                  className="gap-1.5 text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorize & Activate</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUninstall(manifest.id, manifest.name)}
                  className="gap-1.5 text-xs h-7 text-secondary hover:text-error"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggle(manifest.id, status)}
                  className="gap-1.5 text-xs h-7 text-secondary hover:text-on-surface"
                >
                  <Power className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : 'text-zinc-400'}`} />
                  <span>{isActive ? 'Disable' : 'Enable'}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUninstall(manifest.id, manifest.name)}
                  className="gap-1.5 text-xs h-7 text-secondary hover:text-error"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Uninstall</span>
                </Button>
              </>
            )}
          </>
        ) : (
          /* Non-admin clinician view */
          <div className="flex items-center justify-between w-full text-xs text-secondary">
            {isPending ? (
              <>
                <span className="flex items-center gap-1.5 text-[11px] text-amber-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Awaiting Admin Sign-off</span>
                </span>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onUninstall(manifest.id, manifest.name)}
                    className="text-xs h-7 text-secondary hover:text-error"
                  >
                    Withdraw
                  </Button>
                )}
              </>
            ) : isActive ? (
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Admin Approved · Station Active</span>
              </span>
            ) : (
              <span className="text-[11px] text-secondary">Disabled by Administrator</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
