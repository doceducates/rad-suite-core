import React from 'react';

export const STORAGE_SOURCES = [
  { id: 'all', label: 'All Sources', icon: '🌐', shortLabel: 'Source: All' },
  { id: 'local', label: 'Local Disk (E:)', icon: '💾', shortLabel: 'Local Disk' },
  { id: 's3', label: 'S3 Cloud', icon: '🪣', shortLabel: 'S3 Cloud' },
  { id: 'gdrive', label: 'Google Drive', icon: '📁', shortLabel: 'Google Drive' },
  { id: 'pacs', label: 'Hospital PACS', icon: '🖥️', shortLabel: 'Hospital PACS' },
  { id: 'remote_node', label: 'Clinic Node', icon: '⚡', shortLabel: 'Clinic Node' },
] as const;

export const DATE_RANGES = [
  { id: 'all', label: 'All Dates', icon: '🕒', shortLabel: 'Date: All' },
  { id: 'today', label: 'Today', icon: '📅', shortLabel: 'Today' },
  { id: 'yesterday', label: 'Yesterday', icon: '📅', shortLabel: 'Yesterday' },
  { id: 'week', label: 'Last 7 Days', icon: '📅', shortLabel: '7 Days' },
  { id: 'month', label: 'Last 30 Days', icon: '📅', shortLabel: '30 Days' },
] as const;

export const MODALITIES = [
  { id: 'all', label: 'All Modalities', icon: '🌐', shortLabel: 'Modality: All' },
  { id: 'MRI', label: 'MRI (Magnetic Resonance)', icon: '🧲', shortLabel: 'MRI' },
  { id: 'CT', label: 'CT (Computed Tomography)', icon: '☢️', shortLabel: 'CT' },
  { id: 'CR', label: 'X-Ray (CR / Radiography)', icon: '🦴', shortLabel: 'X-Ray' },
  { id: 'US', label: 'Ultrasound (Sonography)', icon: '📡', shortLabel: 'US' },
] as const;

export const STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses', icon: '📋', shortLabel: 'Status: All' },
  { id: 'draft', label: 'To Be Reported (Draft)', icon: '⏳', shortLabel: 'To Report' },
  { id: 'final', label: 'Finalized Reports', icon: '✅', shortLabel: 'Finalized' },
] as const;

export interface PacsSearchFiltersProps {
  query: string;
  setQuery: (q: string) => void;
  assignedFilter: 'all' | 'me';
  setAssignedFilter: (v: 'all' | 'me') => void;
  statusFilter: 'all' | 'draft' | 'final';
  setStatusFilter: (v: 'all' | 'draft' | 'final') => void;
  source: string;
  setSource: (v: any) => void;
  dateRange: string;
  setDateRange: (v: any) => void;
  modality: string;
  setModality: (v: string) => void;
  loading: boolean;
  onSearch: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}
