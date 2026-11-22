'use client';

import React from 'react';
import { useDesktopUpdater } from '@/hooks/useDesktopUpdater';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

export function DesktopUpdateModal() {
  const {
    isDesktop,
    updateAvailable,
    updateVersion,
    updateNotes,
    isDownloading,
    downloadProgress,
    isReadyToRestart,
    downloadAndInstall,
    dismissBanner,
  } = useDesktopUpdater();

  if (!isDesktop || !updateAvailable) return null;

  return (
    <Modal
      isOpen={updateAvailable}
      onClose={dismissBanner}
      size="md"
      closeOnBackdropClick={!isDownloading}
      closeOnEscape={!isDownloading}
    >
      <ModalHeader onClose={dismissBanner} showCloseButton={!isDownloading}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <ModalTitle>New Update Available</ModalTitle>
            <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
              Version {updateVersion}
            </span>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-foreground mb-1.5">What&apos;s New in this Release:</h4>
          <div className="bg-surface-container-high/60 border border-outline-variant/60 rounded-lg p-3 text-[11px] text-muted-foreground whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto font-mono">
            {updateNotes || 'This update brings diagnostic viewer performance improvements, bug fixes, and stability enhancements.'}
          </div>
        </div>

        {isDownloading && (
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>Downloading & preparing update package...</span>
              <span className="text-primary font-bold">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {isReadyToRestart && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Update downloaded successfully. Click restart to apply changes.</span>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={dismissBanner}
          disabled={isDownloading}
          className="text-xs h-8 px-3"
        >
          Remind Me Later
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={downloadAndInstall}
          disabled={isDownloading && !isReadyToRestart}
          className="text-xs h-8 px-4 gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-sm"
        >
          {isDownloading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Downloading...</span>
            </>
          ) : isReadyToRestart ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart & Apply</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>Download & Install</span>
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
