// Layer 4 (Presentation): Options and constants for More Filters Dropdown (<50 lines)

export interface MoreFilterOption {
  id: string;
  label: string;
  shortLabel: string;
}

export const SORT_OPTIONS: MoreFilterOption[] = [
  { id: 'date_desc', label: 'Newest Acquired First', shortLabel: 'Newest' },
  { id: 'date_asc', label: 'Oldest Acquired First (FIFO)', shortLabel: 'Oldest' },
  { id: 'priority', label: 'STAT Emergency First', shortLabel: 'STAT First' },
  { id: 'patient_name', label: 'Patient Name (A-Z)', shortLabel: 'Name A-Z' },
];

export const GENDER_OPTIONS: MoreFilterOption[] = [
  { id: 'all', label: 'Any Gender', shortLabel: 'Any' },
  { id: 'Male', label: 'Male Only', shortLabel: 'Male' },
  { id: 'Female', label: 'Female Only', shortLabel: 'Female' },
];

export const SOURCE_OPTIONS: MoreFilterOption[] = [
  { id: 'all', label: 'All Sources', shortLabel: 'All' },
  { id: 'local', label: 'Local Disk', shortLabel: 'Local' },
  { id: 'pacs', label: 'Hospital PACS', shortLabel: 'PACS' },
  { id: 'worklist', label: 'Database Vault', shortLabel: 'DB' },
];
