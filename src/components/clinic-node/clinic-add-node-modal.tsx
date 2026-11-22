'use client';

import React, { useState } from 'react';
import { HardDrive, Download, Plus, Check, Copy, Zap } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { notify } from '@/services/notification.service';

interface ClinicAddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeRegistered: (nodeId: string) => void;
}

export function ClinicAddNodeModal({ isOpen, onClose, onNodeRegistered }: ClinicAddNodeModalProps) {
  const [nodeId, setNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [hostname, setHostname] = useState('');
  const [modality, setModality] = useState('MR');
  const [pacsHost, setPacsHost] = useState('192.168.1.100');
  const [pacsPort, setPacsPort] = useState('8040');
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const cleanNodeId = nodeId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');

  const configPreview = {
    nodeId: cleanNodeId || 'clinic-new-node',
    name: nodeName.trim() || cleanNodeId || 'Clinic Console',
    primaryHostname: hostname.trim() || 'CLINIC-WORKSTATION-01',
    radSuiteUrl: typeof window !== 'undefined' ? window.location.origin : 'https://radiology.sehatai.org',
    clinicNodeToken: 'clinic-secret-token',
    orthancHttpPort: 18042,
    pacs: { host: pacsHost, port: parseInt(pacsPort, 10) || 8040 },
    s3: { endpoint: 'https://s3.sehatai.org', region: 'us-east-1', bucket: 'rad-suite' },
    syncRules: {
      allowedModalities: modality === 'ALL' ? [] : [modality],
      descriptionKeywords: modality === 'MR' ? ['spine', 'cervical', 'dorsal', 'thoracic', 'lumbar'] : [],
      bypassKeywords: false,
      syncMode: 'auto_filtered',
    },
  };

  const handleRegister = async () => {
    if (!cleanNodeId) {
      notify.error('Please enter a valid Node ID (e.g. node-desktop-5l3rn6b)');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/clinic-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: cleanNodeId,
          action: 'register-node',
          payload: {
            name: nodeName.trim() || cleanNodeId,
            hostname: hostname.trim(),
            pacsStatus: { connected: false, targetHost: pacsHost, targetPort: parseInt(pacsPort, 10) },
            syncRules: configPreview.syncRules,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify.success(`Node '${cleanNodeId}' registered successfully.`);
        onNodeRegistered(cleanNodeId);
        onClose();
        setNodeId('');
        setNodeName('');
        setHostname('');
      } else {
        throw new Error(data.error || 'Failed to register node');
      }
    } catch (e: any) {
      notify.error(e.message || 'Could not register node');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(configPreview, null, 2));
    setCopied(true);
    notify.info('agent-config.json copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader onClose={onClose}>
        <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
          <HardDrive className="w-4 h-4" />
        </div>
        <div>
          <ModalTitle>Deploy & Connect New Clinic Node</ModalTitle>
          <ModalDescription>Register a new hospital DICOM workstation with automated cloud handshake.</ModalDescription>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Zero-Config Auto-Registration Fast-Track */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
              <Zap className="w-4 h-4 fill-primary" />
              <span>Zero-Config Auto-Registration (Recommended)</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No manual configuration required. Download the package, unzip on any Clinic PC, and run <code>install.bat</code>. The node will automatically register its hardware identity and come online.
            </p>
          </div>
          <a href="/api/clinic-node/bundle" download="clinic-node-package.zip" className="shrink-0">
            <Button size="sm" className="gap-1.5 text-xs whitespace-nowrap">
              <Download className="w-3.5 h-3.5" />
              Download Universal Package (.zip)
            </Button>
          </a>
        </div>

        {/* Manual Configuration (Optional) */}
        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">
          Or Pre-Configure Specific Settings (Optional)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">Friendly Display Name</label>
            <Input
              placeholder="e.g. Secondary Clinic Console"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">Node ID / Identifier</label>
            <Input
              placeholder="e.g. node-desktop-5l3rn6b"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">Target Modality</label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none"
            >
              <option value="MR">MRI (Magnetic Resonance)</option>
              <option value="CT">CT (Computed Tomography)</option>
              <option value="CR">CR / Digital X-Ray</option>
              <option value="US">Ultrasound</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-foreground">Hospital PACS Host</label>
            <Input
              value={pacsHost}
              onChange={(e) => setPacsHost(e.target.value)}
              placeholder="192.168.1.100"
              className="font-mono text-xs"
            />
          </div>
        </div>

        {/* Config JSON Preview */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-muted-foreground">Config Preview</span>
            <button
              onClick={handleCopyConfig}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
          </div>
          <pre className="p-2 rounded-lg bg-muted/40 border border-border/60 font-mono text-[10px] text-muted-foreground max-h-24 overflow-y-auto">
            {JSON.stringify(configPreview, null, 2)}
          </pre>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        {cleanNodeId && (
          <a
            href={`/api/clinic-node/bundle?nodeId=${encodeURIComponent(cleanNodeId)}`}
            download={`clinic-node-${cleanNodeId}.zip`}
          >
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              Download Pre-Configured (.zip)
            </Button>
          </a>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={handleRegister}
          disabled={submitting || !cleanNodeId}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          {submitting ? 'Registering...' : 'Save Manual Record'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
