import { resolveWorkspaceCase } from '../src/services/workspace-case-resolver.service';
import { getCurrentUser } from '../src/services/auth.service';

async function diagnose() {
  const accession = '192610007500';
  console.log(`Diagnosing resolution for ${accession}...`);
  
  const t0 = Date.now();
  const res = await resolveWorkspaceCase(accession);
  console.log(`resolveWorkspaceCase took: ${Date.now() - t0} ms`);
  console.log('Result:', {
    studyId: res?.study?.id,
    accession: res?.study?.accessionNumber,
    patient: res?.patient?.fullName,
    isLocal: res?.isLocalCase,
    series: res?.localSeries?.length,
    companions: res?.study?.companionStudies?.length
  });
}

diagnose().catch(console.error);
