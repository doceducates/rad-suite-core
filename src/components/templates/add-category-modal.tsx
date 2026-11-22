'use client';

import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated: (categoryName: string) => void;
}

export function AddCategoryModal({ isOpen, onClose, onCategoryCreated }: AddCategoryModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter a category name');
      return;
    }
    if (trimmed.length < 2) {
      setError('Category name must be at least 2 characters');
      return;
    }

    onCategoryCreated(trimmed);
    setName('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 max-w-md w-full bg-surface-container-low rounded-2xl border border-outline-variant/60 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-outline-variant/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Add New Category</h3>
              <p className="text-xs text-secondary">Organize reporting templates by modality or subspecialty</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">
              Category Name / Modality Code
            </label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. DOPPLER, MAMMOGRAPHY, PET-CT, FLUOROSCOPY"
              autoFocus
              className="text-sm font-medium tracking-wide"
            />
            {error && <p className="text-xs text-error mt-1.5">{error}</p>}
            <p className="text-[11px] text-secondary mt-1.5">
              This category will appear alongside CT, MRI, and USG. You can immediately add reporting templates under it.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-outline-variant/40">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Create & Add Templates
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
