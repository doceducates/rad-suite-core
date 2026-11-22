export type StandbySourceTab = 'all' | 'local' | 's3' | 'gdrive' | 'pacs' | 'remote_node';

export interface StandbySourceConfig {
  id: StandbySourceTab;
  label: string;
  shortLabel: string;
  iconName: 'all' | 'local' | 's3' | 'gdrive' | 'pacs' | 'remote';
  description: string;
}

export const STANDBY_SOURCE_CONFIGS: StandbySourceConfig[] = [
  {
    id: 'all',
    label: 'All Sources',
    shortLabel: 'All',
    iconName: 'all',
    description: 'All discovered cases across local disk, cloud, PACS, and remote node',
  },
  {
    id: 'local',
    label: 'Local Storage',
    shortLabel: 'Local',
    iconName: 'local',
    description: 'Instant zero-latency DICOM cases stored on local workstation storage',
  },
  {
    id: 's3',
    label: 'S3 Cloud Storage',
    shortLabel: 'S3 Cloud',
    iconName: 's3',
    description: 'Cases archived in S3-compatible cloud object storage',
  },
  {
    id: 'gdrive',
    label: 'Google Drive',
    shortLabel: 'Drive',
    iconName: 'gdrive',
    description: 'Clinical cases synced to authenticated Google Drive repository',
  },
  {
    id: 'pacs',
    label: 'Direct PACS Query',
    shortLabel: 'Live PACS',
    iconName: 'pacs',
    description: 'Live DICOM C-FIND against configured hospital PACS archive',
  },
  {
    id: 'remote_node',
    label: 'Remote Clinic Node',
    shortLabel: 'Clinic Node',
    iconName: 'remote',
    description: 'Edge PC daemon queue, active uploads, and remote accession pull',
  },
];
