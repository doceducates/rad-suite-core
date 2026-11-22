import { resolveWorkspaceCase } from '../src/services/workspace-case-resolver.service';

async function main() {
  console.log('Resolving 192610007500...');
  const start = Date.now();
  const res = await resolveWorkspaceCase('192610007500');
  console.log('Resolved in', Date.now() - start, 'ms');
  console.log('Result:', res ? { study: res.study?.accessionNumber, isLocal: res.isLocalCase, seriesCount: res.localSeries?.length } : null);
}

main().catch(err => {
  console.error('Error during resolve:', err);
});
