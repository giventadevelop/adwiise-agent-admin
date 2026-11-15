/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,

  // Enable image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'eventapp-media-bucket.s3.us-east-2.amazonaws.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },

  // Enable SWC minification for improved performance
  // swcMinify: true,

  // Next 16: `next build` defaults to Turbopack; empty config satisfies builds when a `webpack()` hook exists.
  turbopack: {},

  // Customize webpack config if needed
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack config here if needed
    return config;
  },

  // Configure redirects if needed
  async redirects() {
    return [];
  },

  // Clerk FAPI proxy is now handled by clerkMiddleware's frontendApiProxy option (v7+).
  // The old manual rewrite for /__clerk/* has been removed because it didn't forward
  // required headers (Clerk-Proxy-Url, Clerk-Secret-Key, X-Forwarded-For).
  async rewrites() {
    return [];
  },

  // Configure headers if needed
  async headers() {
    return [
      // Global CORS headers for all API routes (essential for mobile browsers)
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
      // Specific headers for file upload endpoint
      {
        source: '/api/proxy/event-medias/upload-multiple',
        headers: [
          {
            key: 'Access-Control-Max-Age',
            value: '86400',
          },
        ],
      },
      // CRITICAL FIX: Cache-busting headers for mobile browsers
      // Prevents aggressive caching of JavaScript bundles that can cause stale code execution
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      // Allow Next.js static assets to be cached (they have unique hashes)
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Enable experimental features if needed
  experimental: {
    // Add experimental features here
    serverActions: {
      bodySizeLimit: '50mb', // Increase from default 1mb to 50mb for file uploads
    },
  },

  // Server external packages (moved from experimental in Next.js 15)
  serverExternalPackages: ['tesseract.js', 'tesseract.js-core'],

  env: {
    // Clerk environment variables
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    // Clerk v6: afterSignInUrl/afterSignUpUrl are deprecated.
    // Use fallbackRedirectUrl env vars instead. Also support the legacy env vars as fallback.
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL || process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL || process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,

    // API JWT credentials (prioritize AMPLIFY_ prefix for AWS Amplify)
    API_JWT_USER: process.env.AMPLIFY_API_JWT_USER || process.env.API_JWT_USER,
    API_JWT_PASS: process.env.AMPLIFY_API_JWT_PASS || process.env.API_JWT_PASS,
    AMPLIFY_API_JWT_USER: process.env.AMPLIFY_API_JWT_USER,
    AMPLIFY_API_JWT_PASS: process.env.AMPLIFY_API_JWT_PASS,
    NEXT_PUBLIC_API_JWT_USER: process.env.NEXT_PUBLIC_API_JWT_USER,
    NEXT_PUBLIC_API_JWT_PASS: process.env.NEXT_PUBLIC_API_JWT_PASS,
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || process.env.AMPLIFY_NEXT_PUBLIC_API_BASE_URL,
    // Tenant ID and Payment Method Domain ID (prioritize AMPLIFY_ prefix for AWS Amplify)
    NEXT_PUBLIC_TENANT_ID: process.env.AMPLIFY_NEXT_PUBLIC_TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID,
    AMPLIFY_NEXT_PUBLIC_TENANT_ID: process.env.AMPLIFY_NEXT_PUBLIC_TENANT_ID,
    NEXT_PUBLIC_ALL_TENANTS_ADMIN:
      process.env.AMPLIFY_NEXT_PUBLIC_ALL_TENANTS_ADMIN || process.env.NEXT_PUBLIC_ALL_TENANTS_ADMIN,
    AMPLIFY_NEXT_PUBLIC_ALL_TENANTS_ADMIN: process.env.AMPLIFY_NEXT_PUBLIC_ALL_TENANTS_ADMIN,
    DISABLE_ADMIN_ON_SATELLITE:
      process.env.AMPLIFY_DISABLE_ADMIN_ON_SATELLITE || process.env.DISABLE_ADMIN_ON_SATELLITE,
    AMPLIFY_DISABLE_ADMIN_ON_SATELLITE: process.env.AMPLIFY_DISABLE_ADMIN_ON_SATELLITE,
    NEXT_PUBLIC_PAYMENT_METHOD_DOMAIN_ID: process.env.AMPLIFY_NEXT_PUBLIC_PAYMENT_METHOD_DOMAIN_ID || process.env.NEXT_PUBLIC_PAYMENT_METHOD_DOMAIN_ID,
    AMPLIFY_NEXT_PUBLIC_PAYMENT_METHOD_DOMAIN_ID: process.env.AMPLIFY_NEXT_PUBLIC_PAYMENT_METHOD_DOMAIN_ID,

    // Stripe environment variables
    // CRITICAL: STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET removed from env section
    // They are only in serverRuntimeConfig (lines 26-27) to prevent build-time exposure
    // Server-side code can access process.env directly, so env section is not needed
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.AMPLIFY_NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRO_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    NEXT_PUBLIC_STRIPE_MAX_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_MAX_PRICE_ID,
    NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_ULTRA_PRICE_ID,

    // Additional environment variables required in production
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    POOLED_URL: process.env.POOLED_URL,
    NEXT_PUBLIC_CLERK_FRONTEND_API: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API,
    NEXT_PUBLIC_CLERK_PROXY_URL: process.env.NEXT_PUBLIC_CLERK_PROXY_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,

    // Zoho SalesIQ OAuth (server routes /oauth/zoho/*)
    ZOHO_CLIENT_ID: process.env.AMPLIFY_ZOHO_CLIENT_ID || process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: process.env.AMPLIFY_ZOHO_CLIENT_SECRET || process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: process.env.AMPLIFY_ZOHO_REFRESH_TOKEN || process.env.ZOHO_REFRESH_TOKEN,
    ZOHO_OAUTH_REDIRECT_URI: process.env.ZOHO_OAUTH_REDIRECT_URI,
    ZOHO_OAUTH_SCOPES: process.env.ZOHO_OAUTH_SCOPES,
    ZOHO_OAUTH_SETUP_SECRET: process.env.ZOHO_OAUTH_SETUP_SECRET,
    ZOHO_ACCOUNTS_BASE_URL: process.env.ZOHO_ACCOUNTS_BASE_URL,
  },
};

export default nextConfig;

