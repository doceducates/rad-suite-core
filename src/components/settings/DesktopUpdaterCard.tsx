'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, RefreshCw, CheckCircle2, Download, Laptop } from 'lucide-react';
import { useDesktopUpdater } from '@/hooks/useDesktopUpdater';

export function DesktopUpdaterCard() {
  const {
    isDesktop,
    isChecking,
    updateAvailable,
    updateVersion,
    isDownloading,
    downloadProgress,
    isReadyToRestart,
    checkForUpdates,
    downloadAndInstall,
  } = useDesktopUpdater();

  if (!isDesktop) return null;

  return (
    <Card className="border-sky-500/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-sky-500" /> Desktop Workstation Updates
          </CardTitle>
          <Badge variant="outline" className="font-mono text-[10px] text-sky-400 border-sky-500/30">
            Tauri v2 Auto-Updater
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-secondary text-[11px]">
          Rad Suite automatically checks for releases, security patches, and DICOM acceleration updates.
        </p>

        <div className="p-3.5 rounded-xl border border-outline-variant/60 bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Laptop className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-on-surface">Rad Suite Workstation</div>
              <div className="text-[11px] text-muted-foreground">
                {updateAvailable ? (
                  <span className="text-amber-400 font-medium">Update v{updateVersion} available!</span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 inline" /> You are on the latest version
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {updateAvailable ? (
              <Button
                variant="primary"
                size="sm"
                onClick={downloadAndInstall}
                disabled={isDownloading && !isReadyToRestart}
                className="text-xs h-7 px-3 gap-1.5 bg-sky-600 hover:bg-sky-500 text-white"
              >
                {isDownloading ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{downloadProgress}%</span>
                  </>
                ) : isReadyToRestart ? (
                  <>
                    <RefreshCw className="w-3 h-3" />
                    <span>Restart App</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    <span>Update v{updateVersion}</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={checkForUpdates}
                disabled={isChecking}
                className="text-xs h-7 px-3 gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking...' : 'Check for Updates'}</span>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
