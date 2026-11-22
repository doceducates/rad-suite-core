'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import type { PacsServer } from '@/types/pacs';

interface PacsServerFormProps {
  onSave: (server: Omit<PacsServer, 'id'> & { id?: string }) => void;
  onCancel: () => void;
  initialValues?: Partial<PacsServer>;
}

export function PacsServerForm({ onSave, onCancel, initialValues }: PacsServerFormProps) {
  const [form, setForm] = useState({
    name: initialValues?.name || 'Hospital Central PACS',
    aeTitle: initialValues?.aeTitle || 'PACS_CENTRAL',
    host: initialValues?.host || '127.0.0.1',
    port: initialValues?.port || 8040,
    callingAeTitle: initialValues?.callingAeTitle || 'RAD_SUITE',
    listenerPort: initialValues?.listenerPort || 11112,
    retrieveProtocol: (initialValues?.retrieveProtocol || 'C-GET') as 'C-GET' | 'C-MOVE',
    isDefault: initialValues?.isDefault ?? false,
    isActive: initialValues?.isActive ?? true,
    description: initialValues?.description || 'Hospital Radiology PACS Archive',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl border border-primary/30 bg-surface-container space-y-3.5 text-xs font-sans">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-on-surface text-sm">Add / Configure DICOM PACS Server</span>
        <span className="text-[11px] text-secondary font-mono">DICOM 3.0 Standard</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
        <div>
          <label className="text-[10px] text-secondary font-medium">Location / Server Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs text-on-surface outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="text-[10px] text-secondary font-medium">Remote AE Title (PACS)</label>
          <input
            type="text"
            value={form.aeTitle}
            onChange={(e) => setForm({ ...form, aeTitle: e.target.value.toUpperCase() })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs uppercase font-mono text-on-surface outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="text-[10px] text-secondary font-medium">IP Address / Host</label>
          <input
            type="text"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-mono text-on-surface outline-none focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="text-[10px] text-secondary font-medium">Port (C-FIND / Query)</label>
          <input
            type="number"
            value={form.port}
            onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 8040 })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-mono text-on-surface outline-none focus:border-primary"
            required
          />
        </div>
      </div>

      {/* Retrieval Protocol Selector: C-GET vs C-MOVE */}
      <div className="p-3 rounded-lg border border-outline-variant/60 bg-surface-container-low space-y-2">
        <label className="text-[11px] font-semibold text-on-surface block">
          DICOM Retrieval Protocol (Download SOP Classes)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* C-GET Option */}
          <label
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
              form.retrieveProtocol === 'C-GET'
                ? 'border-primary bg-primary/10 text-on-surface ring-1 ring-primary/40'
                : 'border-outline-variant/40 bg-surface-container-lowest text-secondary hover:text-on-surface'
            }`}
          >
            <input
              type="radio"
              name="retrieveProtocol"
              value="C-GET"
              checked={form.retrieveProtocol === 'C-GET'}
              onChange={() => setForm({ ...form, retrieveProtocol: 'C-GET' })}
              className="mt-0.5 text-primary focus:ring-primary"
            />
            <div>
              <div className="font-semibold text-xs flex items-center gap-1.5 text-on-surface">
                <span>C-GET</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">
                  Direct Association
                </span>
              </div>
              <p className="text-[10px] text-secondary mt-0.5 leading-snug">
                Retrieves images directly over the established query connection. Does not require workstation incoming port forwarding or Storage SCP setup on the PACS.
              </p>
            </div>
          </label>

          {/* C-MOVE Option */}
          <label
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
              form.retrieveProtocol === 'C-MOVE'
                ? 'border-primary bg-primary/10 text-on-surface ring-1 ring-primary/40'
                : 'border-outline-variant/40 bg-surface-container-lowest text-secondary hover:text-on-surface'
            }`}
          >
            <input
              type="radio"
              name="retrieveProtocol"
              value="C-MOVE"
              checked={form.retrieveProtocol === 'C-MOVE'}
              onChange={() => setForm({ ...form, retrieveProtocol: 'C-MOVE' })}
              className="mt-0.5 text-primary focus:ring-primary"
            />
            <div>
              <div className="font-semibold text-xs flex items-center gap-1.5 text-on-surface">
                <span>C-MOVE</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                  Sub-Association (Storage SCP)
                </span>
              </div>
              <p className="text-[10px] text-secondary mt-0.5 leading-snug">
                Instructs the PACS archive to initiate a separate C-STORE connection back to your workstation listener AE Title and Port (e.g. RadiAnt).
              </p>
            </div>
          </label>
        </div>

        {/* C-MOVE Specific Configuration Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div>
            <label className="text-[10px] text-secondary font-medium">
              Calling AE Title / Move Destination AE
            </label>
            <input
              type="text"
              value={form.callingAeTitle}
              onChange={(e) => setForm({ ...form, callingAeTitle: e.target.value.toUpperCase() })}
              placeholder="RADIANT"
              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-mono text-on-surface outline-none focus:border-primary"
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-secondary font-medium">
              Workstation Listener Port (Storage SCP)
            </label>
            <input
              type="number"
              value={form.listenerPort}
              onChange={(e) => setForm({ ...form, listenerPort: parseInt(e.target.value) || 11112 })}
              placeholder="11112"
              className="w-full px-2.5 py-1.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-xs font-mono text-on-surface outline-none focus:border-primary"
              required
            />
          </div>
        </div>
      </div>

      {/* Description & Default */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span>Set as Default PACS Server</span>
        </label>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} className="text-secondary">
            Cancel
          </Button>
          <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-on-primary font-semibold">
            Save Node Configuration
          </Button>
        </div>
      </div>
    </form>
  );
}
