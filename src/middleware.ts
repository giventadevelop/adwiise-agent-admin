import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { hubAdminUrl, shouldRedirectAdminToHub } from "@/lib/clerkSatellite";

const logger = createLogger('MIDDLEWARE');

/**
 * Clerk SDK Middleware (v6 compatible)
 *
 * This middleware handles Clerk authentication for server-side functions like auth() and currentUser().
 * It allows both public and protected routes, with authentication checks handled by:
 * - Server-side: auth() and currentUser() in API routes and server components
 * - Client-side: useAuth() and useUser() hooks in client components
 *
 * In Clerk v5+/v6, clerkMiddleware runs for ALL routes so auth() works everywhere.
 * Public routes simply don't call auth.protect(), so unauthenticated users can access them.
 * Protected routes call auth.protect() which redirects to sign-in if not authenticated.
 *
 * PROXY SETUP (Clerk v7 / Core 3):
 * The Clerk publishable key encodes FAPI domain as clerk.adwiiseagent.ai (no www).
 * But the site runs at www.adwiiseagent.ai. Without a proxy, Clerk tries to reach
 * clerk.www.adwiiseagent.ai which doesn't exist in DNS.
 *
 * Fix: clerkMiddleware's built-in frontendApiProxy option handles the proxy automatically.
 * It adds required headers (Clerk-Proxy-Url, Clerk-Secret-Key, X-Forwarded-For) that the
 * old manual Next.js rewrite was missing. The /__clerk path is INCLUDED in the matcher
 * so clerkMiddleware can intercept and proxy the requests with proper headers.
 */

// Public routes that don't require authentication
// CRITICAL: These routes must be accessible without session cookies (Playwright tests, curl, etc.)
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/auth/signout-redirect(.*)',
  '/oauth/zoho(.*)',
  '/api/webhooks(.*)',
  '/api/school(.*)',
  '/api/public(.*)',
  '/api/proxy(.*)',
  '/api/event/success(.*)',
  '/api/membership/success(.*)',
  '/api/events/donation/success(.*)',
  '/membership/success(.*)',
  '/membership/qr(.*)',
  '/api/diagnostic(.*)',
  '/api/logs(.*)',
  '/api/stripe/payment-intent(.*)',
  '/api/stripe/event-checkout(.*)',
  '/api/stripe/membership-payment-intent(.*)',
  '/api/stripe/competition-payment-intent(.*)',
  '/api/payment(.*)',
  '/api/billing(.*)',
  '/api/checkout(.*)',
  '/api/health(.*)',
  '/api/liturgy(.*)',
  '/events(.*)',
  '/sponsors(.*)',
  '/team(.*)',
  '/gallery(.*)',
  '/about(.*)',
  '/contact(.*)',
  '/polls(.*)',
  '/charity-theme(.*)',
  '/calendar(.*)',
  '/focus-groups(.*)',
  '/pricing(.*)',
  '/member-portal(.*)',
  '/home(.*)',
  '/writings(.*)',
  '/downloads(.*)',
  '/news(.*)',
  '/links(.*)',
  '/get-started(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  const isApiProxy = pathname.startsWith('/api/proxy');
  const isDiagnostic = pathname.startsWith('/api/diagnostic');
  const userAgent = req.headers.get('user-agent') || 'unknown';

  // Competition register / my-registrations require sign-in (public /events otherwise)
  const needsCompetitionAuth = /^\/events\/[^/]+\/competitions\/(register|my-registrations)(\/|$)/.test(
    pathname
  );
  if (needsCompetitionAuth) {
    await auth.protect();
  }

  // Enhanced mobile detection
  const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|WhatsApp|Mobile|CriOS|FxiOS/i.test(userAgent);
  const cloudfrontMobile = req.headers.get('cloudfront-is-mobile-viewer') === 'true';
  const cloudfrontAndroid = req.headers.get('cloudfront-is-android-viewer') === 'true';
  const cloudfrontIOS = req.headers.get('cloudfront-is-ios-viewer') === 'true';
  const isMobile = userAgentMobile || cloudfrontMobile || cloudfrontAndroid || cloudfrontIOS;

  // Log API requests
  if (isApiRoute) {
    logger.info('API REQUEST DETECTED', {
      pathname,
      method: req.method,
      isMobile,
      isProxy: isApiProxy,
      isDiagnostic,
      userAgent: userAgent.substring(0, 150),
      timestamp: new Date().toISOString(),
    });
  }

  // Satellite public sites do not serve /admin — send operators to the primary hub.
  if (pathname.startsWith('/admin')) {
    const host = req.headers.get('host') || req.nextUrl.hostname || '';
    if (shouldRedirectAdminToHub(host)) {
      const satelliteTenant =
        process.env.AMPLIFY_NEXT_PUBLIC_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || '';
      return NextResponse.redirect(hubAdminUrl(satelliteTenant));
    }
  }

  // For protected routes, require authentication
  // Public routes skip auth.protect() so unauthenticated users can access them
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // CRITICAL: Forward x-pathname as a request header so the root layout can determine
  // the current route. Without this header, layout.tsx cannot detect whether a route
  // is public or protected, which prevents auth checks and admin detection from running.
  // Using request headers (not response headers) ensures the value is available to
  // server components via headers() without interfering with Clerk's session management.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-pathname', pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});
// NOTE: frontendApiProxy has been REMOVED. The CNAME record clerk.adwiiseagent.ai
// is verified and points to frontend-api.clerk.services, so Clerk can reach its FAPI
// directly without a proxy. The old proxy (both the manual rewrite and frontendApiProxy)
// was causing auth failures because it couldn't be registered in the Clerk Dashboard
// (chicken-and-egg validation issue). With the CNAME working, no proxy is needed.
// If third-party cookie issues arise in the future, re-enable frontendApiProxy and
// register the proxy URL in Clerk Dashboard FIRST (with Jordan's help).

export const config = {
  matcher: [
    // Skip Next.js internals, static files, AND /__clerk path
    // __clerk is EXCLUDED because we're using the CNAME (clerk.adwiiseagent.ai) directly
    // instead of proxying through the app. No proxy = no need to match __clerk.
    '/((?!_next|__clerk|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
