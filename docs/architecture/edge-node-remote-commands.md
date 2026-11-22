# Edge Node Remote Commands, Relay Dispatch & Diagnostics Manual

This document is the authoritative operational guide for issuing remote commands, executing diagnostic scripts, and troubleshooting edge nodes connected to Rad Suite via reverse-heartbeat relays.

---

## 1. Remote Command Architecture (Reverse-Heartbeat Relay)

Edge nodes run on hospital clinic workstations behind strict firewalls and NAT without public IPs or inbound ports. All communication is strictly **outbound HTTPS over port 443**.

```
[AI Agent / Admin]
       │
       ▼ (PUT /api/clinic-node/heartbeat with nodeId & action)
[Rad Suite Workstation / VPS]
       │ (Stores in pendingActions[nodeId])
       │
       ▲ (Periodic POST /api/clinic-node/heartbeat every 5-10s)
[Clinic PC Edge Node (RadSuiteEdgeAgent Session 0)]
       │ (Pulls action, executes via child_process or worker)
       ▼
[Clinic PC Edge Node] ──(Next heartbeat: sends lastCommandOutput)──► [Rad Suite VPS]
```

### Authentication & Endpoints
- **Action Queue Endpoint**: `PUT https://radiology.sehatai.org/api/clinic-node/heartbeat`
  - Headers: `'x-clinic-token': 'clinic-secret-token'` (or Bearer token / Admin Session Cookie).
  - Body: `{ nodeId: string, action: string, payload: { command: string, timeout?: number } }`
- **Telemetry & Output Endpoint**: `GET https://radiology.sehatai.org/api/clinic-node/heartbeat?nodeId=<nodeId>`
  - Returns: `{ success: true, nodes: [...], telemetry: { lastCommandOutput, status, ... } }`

---

## 2. The 5 Cardinal Execution Pitfalls & Invariants

### Pitfall 1: Windows Service (Session 0) PATH Invariant
- **Symptom**: Executing `node script.js` or `nssm status` fails with:
  `'node' is not recognized as an internal or external command, operable program or batch file.`
- **Root Cause**: Windows LocalSystem services created via NSSM run in Session 0 and do NOT inherit user `PATH` variables. `C:\MedicalSandbox\bin` is not in the system-wide PATH.
- **Invariant**: **Never execute bare binary names.** Always use absolute filesystem paths:
  - Node.js runtime: `C:\MedicalSandbox\bin\node.exe`
  - NSSM daemon manager: `C:\MedicalSandbox\bin\nssm.exe`
  - Orthanc PACS binary: `C:\MedicalSandbox\Orthanc\Orthanc.exe`
  - Scripts root: `C:\MedicalSandbox\Scripts\`
  - Orthanc DICOM storage: `C:\MedicalSandbox\Orthanc\Storage\`

### Pitfall 2: `cmd.exe` Shell Mangling & Escaping Failures
- **Symptom**: In-line JavaScript or PowerShell commands fail with syntax errors:
  `Invalid switch - "MedicalSandbox"` or `'Select-Object' is not recognized` or broken JSON string parsing.
- **Root Cause**: `clinic-agent.js` invokes raw commands via Node's `child_process.exec()`, which routes through Windows `cmd.exe`. Windows `cmd.exe` parses forward slashes `/` as parameter switches and chokes on double quotes, single quotes, and pipe `|` symbols inside payloads.
- **Invariant**: **Use the Base64 PowerShell Loader Pattern.**
  Encode the target JavaScript code to Base64, write it to disk via PowerShell `[IO.File]::WriteAllBytes`, and execute via `node.exe`:
  ```powershell
  powershell -Command "[IO.File]::WriteAllBytes('C:\MedicalSandbox\Scripts\temp-exec.js', [Convert]::FromBase64String('<BASE64_PAYLOAD>')); & 'C:\MedicalSandbox\bin\node.exe' 'C:\MedicalSandbox\Scripts\temp-exec.js'"
  ```

### Pitfall 3: Multi-Node Addressing Defaulting to Stale Primary Node
- **Symptom**: Commands queue successfully with `{ success: true }`, but the active edge node never runs them and `lastCommandOutput` never updates.
- **Root Cause**: If `nodeId` is omitted in `PUT /api/clinic-node/heartbeat`, `dispatchClinicAction` defaults to `'clinic-pc-primary'`. If the active node is `node-desktop-1ldu8l1` and `clinic-pc-primary` is offline or a decommissioned node, the action sits pending indefinitely.
- **Invariant**: Always inspect active nodes via `GET /api/clinic-node/heartbeat` first (`nodes.filter(n => n.online)`) and explicitly pass `nodeId: '<active-node-id>'` in every queue payload.

### Pitfall 4: Heartbeat Polling Race Condition (Stale Output Reading)
- **Symptom**: Agent immediately inspects `lastCommandOutput` after queuing an action and reads the output of an unrelated command run hours earlier.
- **Root Cause**: Edge nodes poll every 5–10s. The agent queried before the edge node polled, executed the script, and reported back.
- **Invariant**: Record `const queuedAt = Date.now()`. Poll `GET /api/clinic-node/heartbeat?nodeId=<nodeId>` every 3–4 seconds. Only accept `lastCommandOutput` if:
  `new Date(lastCommandOutput.timestamp).getTime() >= queuedAt - 1000`.
  Allow a timeout of at least 45–60 seconds for long scripts.

### Pitfall 5: Orthanc Single-Association DIMSE Contention (Timeout)
- **Symptom**: Ad-hoc C-FIND or C-ECHO queries to Hospital PACS (`10.0.0.100:8040`) fail or timeout with:
  `DIMSE No data available (timeout in non-blocking mode)`
- **Root Cause**: Orthanc maintains a single active DICOM association to `HMIS_PACS`. If `pacs-worker.js` or `pacs-harvester.js` is running an active `DicomGetScu` (C-GET) download job, that job holds the DICOM connection exclusively.
- **Invariant**: Before running ad-hoc C-FIND/C-ECHO queries:
  1. Inspect active Orthanc jobs: `GET http://127.0.0.1:18042/jobs`.
  2. If a non-urgent `DicomGetScu` is running, pause or cancel it via `POST http://127.0.0.1:18042/jobs/<id>/cancel`.
  3. Run the priority query.
  4. Or delegate requests through `pacs-worker.js`'s serial command queue (`fetch-accession`).

---

## 3. The Standard Remote Execution Harness (`run-js-on-node.js`)

AI agents can execute any arbitrary local JavaScript script on the remote edge node using this exact pattern:

```javascript
const https = require('https');
const fs = require('fs');

async function runScriptOnEdgeNode(localScriptPath, targetNodeId = 'node-desktop-1ldu8l1') {
  const code = fs.readFileSync(localScriptPath, 'utf8');
  const b64 = Buffer.from(code).toString('base64');
  const remotePath = 'C:\\\\MedicalSandbox\\\\Scripts\\\\temp-exec.js';
  const cmd = `powershell -Command "[IO.File]::WriteAllBytes('${remotePath}', [Convert]::FromBase64String('${b64}')); & 'C:\\\\MedicalSandbox\\\\bin\\\\node.exe' '${remotePath}'"`;
  
  const queuedAt = Date.now();
  const payload = JSON.stringify({ nodeId: targetNodeId, action: 'exec', payload: { command: cmd, timeout: 120000 } });

  // 1. Queue action on VPS relay
  await new Promise((resolve, reject) => {
    const req = https.request('https://radiology.sehatai.org/api/clinic-node/heartbeat', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-clinic-token': 'clinic-secret-token' }
    }, (res) => { res.on('data', () => {}); res.on('end', resolve); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  // 2. Poll for fresh output with timestamp verification
  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise(r => setTimeout(r, 3500));
    const result = await new Promise((resolve) => {
      https.get(`https://radiology.sehatai.org/api/clinic-node/heartbeat?nodeId=${targetNodeId}`, {
        headers: { 'x-clinic-token': 'clinic-secret-token' }
      }, (res) => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(d);
            const node = json.nodes ? json.nodes.find(n => n.nodeId === targetNodeId) : json.telemetry;
            const out = node?.lastCommandOutput;
            if (out?.timestamp && new Date(out.timestamp).getTime() >= queuedAt - 1000) {
              return resolve(out);
            }
          } catch {}
          resolve(null);
        });
      });
    });
    if (result) return result;
  }
  throw new Error(`Execution timed out after 70 seconds on node ${targetNodeId}`);
}
```

---

## 4. Emergency Presentation Staging via Series-ZIP

When a clinician needs a case staged immediately on the VPS (e.g. for morning presentation or urgent reporting) without waiting for background WAN S3 uploads:

1. **Endpoint**: `POST /api/clinic-node/stage-series-zip`
2. **Mechanism**: Client compresses each series into a ZIP buffer in-memory and POSTs directly to the VPS. The VPS extracts files directly to `/storage/hot-cases/<accession>/series-<num>_<desc>/` on the NVMe SSD.
3. **Required Headers**:
   - `x-clinic-token`: `clinic-secret-token`
   - `x-accession`: Patient accession number (e.g. `192610007500`)
   - `x-series-number`: Series sequence index (e.g. `1`)
   - `x-series-description`: URL-encoded series title (e.g. `T2_SAG`)
   - `x-patient-name`: URL-encoded patient name
   - `x-modality`: `MR` or `CT`
   - `x-total-slices`: Total slices across the entire study
4. **Viewer Response**: The workstation web viewer (`/workstation/<accession>`) loads slices directly via `GET /api/cases/slice` with response header `x-radsuite-source: hot-staging` at **0ms disk latency**.

---

## 5. Standard Diagnostic Recipes for AI Agents

### Recipe A: Inspect Active Orthanc Jobs & Cancel Contention
```javascript
// remote-check-jobs.js
const http = require('http');
http.get('http://127.0.0.1:18042/jobs', (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', async () => {
    const jobIds = JSON.parse(d);
    console.log(`Active Orthanc jobs (${jobIds.length}):`);
    for (const id of jobIds) {
      await new Promise(r => http.get(`http://127.0.0.1:18042/jobs/${id}`, (jr) => {
        let jd = ''; jr.on('data', c => jd += c);
        jr.on('end', () => {
          const j = JSON.parse(jd);
          console.log(`- Job ${id}: Type=${j.Type}, State=${j.State}, Progress=${j.Progress}%`);
          // Cancel blocking C-GET jobs if needed:
          // if (j.Type === 'DicomGetScu' && j.State === 'Running') { ... }
          r();
        });
      }));
    }
  });
});
```

### Recipe B: Targeted C-FIND by Accession Number to Hospital PACS
```javascript
// targeted-cfind.js
const http = require('http');
const req = http.request('http://127.0.0.1:18042/modalities/HMIS_PACS/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let d = ''; res.on('data', c => d += c);
  res.on('end', () => {
    const q = JSON.parse(d);
    http.get(`http://127.0.0.1:18042/queries/${q.ID}/answers`, (ar) => {
      let ad = ''; ar.on('data', c => ad += c);
      ar.on('end', () => console.log('PACS Answers:', JSON.parse(ad)));
    });
  });
});
req.write(JSON.stringify({
  Level: 'Study',
  Query: { AccessionNumber: '192610007673', PatientName: '', StudyDescription: '', StudyDate: '20261029', ModalitiesInStudy: 'MR' }
}));
req.end();
```

### Recipe C: Verify Windows Service Health
```powershell
sc.exe query RadSuiteEdgeAgent
sc.exe query RadSuiteWatchdog
sc.exe query Orthanc
```
Ensure state is `STATE: 4 RUNNING`. If stopped, start via `sc.exe start <service-name>`.
