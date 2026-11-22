import type { ReportStatus, UserRole } from '@/types';

export interface ReportTransitionResult {
  allowed: boolean;
  reason?: string;
}

const ALL_STATUSES: ReportStatus[] = [
  'scheduled',
  'draft',
  'preliminary',
  'pending',
  'submitted',
  'final',
  'amended',
];

const ALLOWED_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  scheduled: ALL_STATUSES,
  draft: ALL_STATUSES,
  preliminary: ALL_STATUSES,
  pending: ALL_STATUSES,
  submitted: ALL_STATUSES,
  final: ALL_STATUSES,
  amended: ALL_STATUSES,
};

/**
 * Validates whether a user with a given role can perform a report state transition.
 */
export function validateReportTransition(
  currentStatus: ReportStatus,
  targetStatus: ReportStatus,
  userRole: UserRole
): ReportTransitionResult {
  // 1. Service accounts cannot change report statuses directly
  if (userRole === 'service') {
    if (currentStatus !== targetStatus) {
      return {
        allowed: false,
        reason: 'Automated service accounts are not permitted to change report clinical status.',
      };
    }
    if (currentStatus === 'draft') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Automated service accounts cannot modify non-draft reports.',
    };
  }

  // 2. Technologists cannot edit or sign diagnostic reports
  if (userRole === 'technologist') {
    return {
      allowed: false,
      reason: 'Radiology technologists are not authorized to author or verify diagnostic reports.',
    };
  }

  // 3. Admin has master administrative override across all clinical statuses
  if (userRole === 'admin') {
    return { allowed: true };
  }

  const isTrainee = userRole === 'resident' || userRole === 'pgr';
  const isConsultant = userRole === 'consultant' || userRole === 'radiologist';

  // 4. Trainee (PGR / Resident) restrictions
  if (isTrainee) {
    if (targetStatus === 'final') {
      return {
        allowed: false,
        reason: 'Post-Graduate Residents (PGR) cannot finalize or sign reports independently. Submit for consultant verification instead.',
      };
    }
    if (targetStatus === 'amended') {
      return {
        allowed: false,
        reason: 'Only a Consultant Radiologist can author an official report amendment.',
      };
    }
    // Trainees can update submitted reports during consultant sign-out rounds
    if (currentStatus === 'submitted' && targetStatus === 'submitted') {
      return { allowed: true };
    }
    if (currentStatus === 'final' || currentStatus === 'amended') {
      // Trainees can set local status to preliminary or pending to draft addenda, reviews, or holds
      if (targetStatus === 'preliminary' || targetStatus === 'pending') {
        return { allowed: true };
      }
      return {
        allowed: false,
        reason: 'Trainees cannot overwrite finalized reports directly. Move to preliminary or pending to draft an addendum or revision.',
      };
    }
    // Trainees (PGR / residents) can transition between scheduled, draft, preliminary, pending, and submitted
    const traineeAllowed: ReportStatus[] = ['scheduled', 'draft', 'preliminary', 'pending', 'submitted'];
    if (traineeAllowed.includes(targetStatus)) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Trainees are not permitted to transition to '${targetStatus}'.`,
    };
  }

  // 5. Consultant / Radiologist validation
  if (isConsultant) {
    // Final reports cannot be silently overwritten without amendment or status change
    if (currentStatus === 'final' && targetStatus === 'final') {
      return {
        allowed: false,
        reason: 'This report is digitally signed and finalized. Any changes must be published as an official amendment.',
      };
    }
    // Consultants can freely move reports between draft, preliminary, submitted, final, and amended
    return { allowed: true };
  }

  // 6. Verify transition graph for any other roles
  const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Illegal state transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  return { allowed: true };
}
