// Layer 2 (Domain/Services): Google OAuth Callback HTML Templates for Popup & Desktop Handshake

export function renderOAuthCallbackHtml(params: {
  status: string;
  targetUrl: string;
  sessionToken: string;
  isDesktop?: boolean;
}): string {
  const { status, targetUrl, sessionToken, isDesktop } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rad Suite Authentication</title>
  <style>
    body {
      margin: 0;
      background-color: #090d16;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background-color: #111827;
      border: 1px solid #1f2937;
      border-radius: 1rem;
      padding: 2.25rem;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 1.25rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-icon {
      width: 48px;
      height: 48px;
      background-color: rgba(16, 185, 129, 0.15);
      border: 2px solid #10b981;
      color: #10b981;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0 auto 1rem;
    }
    h2 { margin: 0 0 0.5rem; font-size: 1.15rem; font-weight: 600; }
    p { margin: 0 0 1.25rem; font-size: 0.85rem; color: #94a3b8; line-height: 1.4; }
    .btn {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background-color: #1d4ed8; }
    .subtext { font-size: 0.75rem; color: #64748b; margin-top: 0.75rem; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="card">
    ${
      isDesktop
        ? `<div class="success-icon">✓</div>
           <h2>Authentication Successful</h2>
           <p>Your Google account has been verified. You can now return to the Rad Suite Desktop Workstation.</p>
           <a id="desktopBtn" href="radsuite://auth/callback?token=${sessionToken}&status=${status}" class="btn">Open Rad Suite Desktop</a>
           <p class="subtext">You can safely close this browser tab.</p>`
        : `<div class="spinner"></div>
           <h2>Authentication Successful</h2>
           <p>Signing you into your diagnostic workstation...</p>
           <a id="desktopBtn" href="radsuite://auth/callback?token=${sessionToken}&status=${status}" class="btn" style="display:none;">Open Rad Suite Desktop</a>`
    }
  </div>
  <script>
    const authData = {
      type: 'RAD_SUITE_GOOGLE_AUTH_SUCCESS',
      status: '${status}',
      target: '${targetUrl}',
      token: '${sessionToken}'
    };

    if (${Boolean(isDesktop)}) {
      try {
        window.location.href = 'radsuite://auth/callback?token=${sessionToken}&status=${status}';
      } catch (e) {}
    }

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(authData, '*');
        setTimeout(() => { window.close(); }, 350);
      } else if (!${Boolean(isDesktop)}) {
        setTimeout(() => { window.location.href = '${targetUrl}'; }, 300);
      }
    } catch (e) {
      if (!${Boolean(isDesktop)}) {
        setTimeout(() => { window.location.href = '${targetUrl}'; }, 300);
      }
    }
  </script>
</body>
</html>`;
}

export function renderOAuthErrorHtml(error: string, isDesktop?: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authentication Error - Rad Suite</title>
  <style>
    body {
      margin: 0;
      background-color: #090d16;
      color: #f1f5f9;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background-color: #111827;
      border: 1px solid #371b1b;
      border-radius: 1rem;
      padding: 2.25rem;
      max-width: 380px;
      width: 90%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    }
    .icon { font-size: 2.5rem; margin-bottom: 0.75rem; color: #ef4444; }
    h2 { margin: 0 0 0.5rem; font-size: 1.15rem; font-weight: 600; color: #f87171; }
    p { margin: 0 0 1.25rem; font-size: 0.85rem; color: #94a3b8; line-height: 1.4; }
    button {
      background-color: #1e293b;
      color: #e2e8f0;
      border: 1px solid #334155;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      cursor: pointer;
    }
    button:hover { background-color: #334155; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✕</div>
    <h2>Authentication Failed</h2>
    <p>${error}</p>
    <button onclick="window.close()">Close Window</button>
  </div>
  <script>
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type: 'RAD_SUITE_GOOGLE_AUTH_ERROR',
          error: '${error.replace(/'/g, "\\'")}'
        }, '*');
      }
    } catch (e) {}
  </script>
</body>
</html>`;
}
