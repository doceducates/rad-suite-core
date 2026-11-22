// Layer 1 (Transport): Unified Google OAuth Callback (Login, Registration, Linking & Desktop Handshake)
import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeGoogleAuthCode,
  linkUserGoogleAccount,
  getGoogleOAuthCredentials,
} from '@/services/google-auth.service';
import {
  handleGoogleOAuthLogin,
  renderOAuthCallbackHtml,
  renderOAuthErrorHtml,
  GoogleLoginState,
} from '@/services/google-login.service';
import { getCurrentUser } from '@/services/auth.service';
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from '@/services/auth-crypto';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const stateStr = url.searchParams.get('state');

  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
  const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'https';
  const reqBaseUrl = host ? `${proto}://${host}` : undefined;
  const { appUrl } = getGoogleOAuthCredentials(reqBaseUrl);
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

  let state: Partial<GoogleLoginState> | null = null;
  if (stateStr) {
    try {
      state = JSON.parse(Buffer.from(stateStr, 'base64url').toString('utf8'));
    } catch {}
  }

  const isPopupOrDesktop = state?.mode === 'popup' || state?.mode === 'desktop';
  const isDesktop = state?.mode === 'desktop';

  // 1. Handle OAuth Error from Google
  if (error) {
    if (isPopupOrDesktop) {
      return new NextResponse(renderOAuthErrorHtml(`Google authorization error: ${error}`, isDesktop), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    const target = state?.intent === 'link'
      ? `${appUrl}/settings?tab=google&error=${encodeURIComponent(error)}`
      : `${appUrl}/login?error=${encodeURIComponent(error)}`;
    return NextResponse.redirect(target);
  }

  // 2. Missing authorization code
  if (!code) {
    if (isPopupOrDesktop) {
      return new NextResponse(renderOAuthErrorHtml('Missing Google authorization code in callback.', isDesktop), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    const target = state?.intent === 'link'
      ? `${appUrl}/settings?tab=google&error=missing_code`
      : `${appUrl}/login?error=missing_code`;
    return NextResponse.redirect(target);
  }

  try {
    // 3. Handle Account Linking (Logged-in clinician linking Google Drive from Settings)
    if (state?.intent === 'link' || (state?.userId && !state?.intent)) {
      let targetUserId = state?.userId;
      if (!targetUserId) {
        const currentUser = await getCurrentUser();
        targetUserId = currentUser?.id;
      }

      if (!targetUserId) {
        return NextResponse.redirect(`${appUrl}/settings?tab=google&error=unauthenticated`);
      }

      const tokens = await exchangeGoogleAuthCode(code, reqBaseUrl);
      await linkUserGoogleAccount(targetUserId, tokens);

      if (isPopupOrDesktop) {
        return new NextResponse(
          renderOAuthCallbackHtml({
            status: 'connected',
            targetUrl: `${appUrl}/settings?tab=google&status=connected`,
            sessionToken: '',
            isDesktop,
          }),
          { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }

      return NextResponse.redirect(`${appUrl}/settings?tab=google&status=connected`);
    }

    // 4. Handle Google Sign-in / Registration (Web, Popup & Desktop)
    const loginResult = await handleGoogleOAuthLogin({
      code,
      state: stateStr || undefined,
      customAppUrl: reqBaseUrl,
      ipAddress: ip,
    });

    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    if (isPopupOrDesktop) {
      const html = renderOAuthCallbackHtml({
        status: loginResult.user.status,
        targetUrl: loginResult.targetUrl,
        sessionToken: loginResult.sessionToken,
        isDesktop,
      });

      const response = new NextResponse(html, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });

      response.cookies.set(SESSION_COOKIE_NAME, loginResult.sessionToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production' && process.env.IS_DESKTOP !== '1',
        path: '/',
        expires: expiresAt,
      });

      return response;
    }

    // Standard Browser Full-Page Redirect
    const redirectUrl = new URL(loginResult.targetUrl, appUrl);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(SESSION_COOKIE_NAME, loginResult.sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' && process.env.IS_DESKTOP !== '1',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (err: any) {
    console.error('[GOOGLE_OAUTH_CALLBACK_ERROR]', err);
    const msg = err.message || 'Authentication failed';

    if (isPopupOrDesktop) {
      return new NextResponse(renderOAuthErrorHtml(msg, isDesktop), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const errorTarget = state?.intent === 'link'
      ? `${appUrl}/settings?tab=google&error=${encodeURIComponent(msg)}`
      : `${appUrl}/login?error=${encodeURIComponent(msg)}`;
    return NextResponse.redirect(errorTarget);
  }
}
