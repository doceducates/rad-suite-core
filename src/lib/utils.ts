import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDicomDateTime(dateVal?: Date | string | null, timeVal?: string | null): string {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  let hours = d.getHours();
  let minutes = String(d.getMinutes()).padStart(2, '0');
  let seconds = String(d.getSeconds()).padStart(2, '0');

  if (timeVal && timeVal.length >= 6 && hours === 0 && minutes === '00' && seconds === '00') {
    hours = parseInt(timeVal.slice(0, 2), 10) || 0;
    minutes = timeVal.slice(2, 4);
    seconds = timeVal.slice(4, 6);
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${dd}/${mm}/${yy} ${hours}:${minutes}:${seconds} ${ampm}`;
}

export function formatTime(dateVal?: Date | string | number | null): string {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes}:${seconds} ${ampm}`;
}

export function formatDicomDob(dob?: string | null): string {
  if (!dob) return '-';
  const clean = dob.replace(/\D/g, '');
  if (clean.length === 8) {
    const y = clean.slice(2, 4);
    const m = clean.slice(4, 6);
    const d = clean.slice(6, 8);
    return `${d}/${m}/${y}`;
  }
  return dob;
}

export function getModalityColor(modality: string): string {
  const m = modality.toUpperCase();
  switch (m) {
    case 'CT':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'MRI':
      return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    case 'X-RAY':
    case 'XR':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'ULTRASOUND':
    case 'US':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'MAMMOGRAPHY':
    case 'MMG':
      return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'stat':
      return 'bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse font-bold';
    case 'urgent':
      return 'bg-amber-500/15 text-amber-500 border-amber-500/30 font-medium';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}
