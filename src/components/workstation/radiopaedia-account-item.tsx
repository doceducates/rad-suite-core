'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { RadiopaediaAccountSummary } from '@/services/radiopaedia-pool.service';

interface RadiopaediaAccountItemProps {
  account: RadiopaediaAccountSummary;
  onDelete: (id: string) => void;
}

export function RadiopaediaAccountItem({ account, onDelete }: RadiopaediaAccountItemProps) {
  return (
    <div className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/40 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            account.isActive && !account.isExpired ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        <div>
          <div className="font-bold text-on-surface">{account.name}</div>
          <div className="text-[10px] font-mono text-secondary">
            ID: {account.maskedClientId} {account.isExpired && '• (Token Expired)'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container-high text-primary">
          {account.requestsToday} reqs
        </span>
        <button
          type="button"
          onClick={() => onDelete(account.id)}
          className="p-1 text-secondary hover:text-error rounded cursor-pointer transition-colors"
          title="Delete account"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
