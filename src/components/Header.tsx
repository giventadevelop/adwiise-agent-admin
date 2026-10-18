'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ChevronDown, X, LogOut, User } from 'lucide-react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { useTenantSettings } from '@/components/TenantSettingsProvider';
import Image from 'next/image';
import { isAdminRole } from '@/lib/utils';
import { pickFirstUserProfile } from '@/lib/pickFirstUserProfile';
import { BRAND_LOGO_PATH, BRAND_NAME, BRAND_PRIMARY_HOST } from '@/lib/brand';

const navItemCatalog = [
  {
    key: 'home' as const,
    name: 'Home',
    href: '/home',
    active: false,
  },
  {
    key: 'about' as const,
    name: 'About',
    href: '/home#about-us',
    active: false,
    dropdown: [] as { name: string; href: string }[],
  },
  {
    key: 'events' as const,
    name: 'Events',
    href: '/events',
    active: false,
  },
  {
    key: 'features' as const,
    name: 'Features',
    href: '#',
    active: false,
    dropdown: [
      { name: 'Polls', href: '/polls' },
      { name: 'Focus Groups', href: '/focus-groups' },
      { name: 'Profile', href: '/profile', requiresAuth: true },
      { name: 'Membership', href: '/membership' },
      { name: 'MOSC', href: '/mosc' },
    ],
  },
  {
    key: 'calendar' as const,
    name: 'Calendar',
    href: '/calendar',
    active: false,
  },
  {
    key: 'gallery' as const,
    name: 'Gallery',
    href: '/gallery',
    active: false,
  },
  {
    key: 'news' as const,
    name: 'News',
    href: '/news',
    active: false,
  },
  {
    key: 'downloads' as const,
    name: 'Downloads',
    href: '/downloads',
    active: false,
  },
  {
    key: 'links' as const,
    name: 'Links',
    href: '/links',
    active: false,
  },
  {
    key: 'contact' as const,
    name: 'Contact',
    href: '/home#contact',
    active: false,
  },
];

// Admin submenu items
const adminSubmenuItems = [
  { name: 'Admin Home', href: '/admin' },
  { name: 'Manage Users', href: '/admin/manage-usage' },
  { name: 'Manage Events', href: '/admin/manage-events' },
  { name: 'Profile Site', href: '/admin/profile-site' },
  { name: 'Event Analytics', href: '/admin/events/dashboard' },
  { name: 'Registrations', href: '/admin/events/registrations' },
  { name: 'QR Scanner', href: '/admin/qr-scanner' },
  { name: 'Check-In Analytics', href: '/admin/check-in-analytics' },
  { name: 'Sales Analytics', href: '/admin/sales-analytics' },
  { name: 'Batch Jobs', href: '/admin/batch-jobs' },
  { name: 'Manual Payments', href: '/admin/manual-payments' },
  { name: 'Poll Management', href: '/admin/polls' },
  { name: 'Focus Groups', href: '/admin/focus-groups' },
  {
    name: 'Membership',
    href: '#',
    dropdown: [
      { name: 'Plans', href: '/admin/membership/plans' },
      { name: 'Subscriptions', href: '/admin/membership/subscriptions' }
    ]
  },
  { name: 'Bulk Email', href: '/admin/bulk-email' },
  { name: 'Test Stripe', href: '/admin/test-stripe' },
  { name: 'Media Management', href: '/admin/media' },
  { name: 'Executive Committee', href: '/admin/executive-committee' },
  { name: 'Event Sponsors', href: '/admin/event-sponsors' },
  { name: 'Satellite Domains', href: '/admin/satellite-domains' }
];

/** Prefer deployed branding PNG; repo often omits it — fallback avoids broken header image. */
const HEADER_LOGO_PREFERRED = BRAND_LOGO_PATH;
const HEADER_LOGO_FALLBACK = '/images/logo.svg';

type HeaderProps = {
  hideMenuItems?: boolean;
  variant?: 'charity' | 'default';
  isTenantAdmin?: boolean;
};

const getNavAriaLabel = (itemName: string) => {
  if (itemName === 'Calendar') {
    return 'Navigate to Schedule';
  }
  return `Navigate to ${itemName}`;
};

const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  console.log('[Header] handleSmoothScroll called with:', href);

  // Handle both '#section' and '/#section' formats
  if (!href.startsWith('#') && !href.startsWith('/#')) return;

  e.preventDefault();
  console.log('[Header] Preventing default and handling hash navigation');

  // Extract the hash part (handle both '#section' and '/#section')
  const hashPart = href.startsWith('/#') ? href.substring(1) : href; // '/#team-section' -> '#team-section'
  const targetId = hashPart.substring(1); // '#team-section' -> 'team-section'

  // If we're not on the home page, navigate there first
  if (typeof window !== 'undefined' && window.location.pathname !== '/') {
    console.log('[Header] Not on home page, navigating to:', `/${hashPart}`);
    // Show loading indicator for team section navigation
    if (targetId === 'team-section') {
      showNavigationLoading();
    }
    // Navigate to home page with hash
    window.location.href = `/${hashPart}`;
    return;
  }

  // If we're on the home page, update the URL hash and scroll
  console.log('[Header] On home page, updating hash to:', hashPart);

  // Show loading indicator for team section
  if (targetId === 'team-section') {
    showNavigationLoading();
  }

  // Update the URL hash
  window.history.pushState(null, '', hashPart);

  // Wait for element to exist before scrolling (especially important for dynamically loaded sections)
  const headerHeight = 80;
  const maxWaitTime = 10000; // 10 seconds max wait
  const pollInterval = 100; // Check every 100ms
  const startTime = Date.now();

  const waitForElementAndScroll = () => {
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      // CRITICAL: For team-section, ensure it's fully rendered and visible
      // Check if element has content (not just the container)
      if (targetId === 'team-section') {
        const hasContent = targetElement.querySelector('.max-w-7xl') || targetElement.children.length > 0;
        if (!hasContent) {
          // Element exists but content not loaded yet, keep waiting
          const elapsed = Date.now() - startTime;
          if (elapsed < maxWaitTime) {
            setTimeout(waitForElementAndScroll, pollInterval);
            return false;
          }
        }
      }

      // Element exists and is ready, scroll to it with proper offset
      // Use larger offset for team-section to ensure it's fully visible above the fold
      const scrollOffset = targetId === 'team-section' ? headerHeight + 40 : headerHeight + 20;
      const targetPosition = targetElement.offsetTop - scrollOffset;

      // Ensure we scroll to the correct element by verifying the ID matches
      if (targetElement.id === targetId) {
        window.scrollTo({ top: Math.max(0, targetPosition), behavior: 'smooth' });
        hideNavigationLoading();
        console.log('[Header] Successfully scrolled to:', targetId, 'at position:', targetPosition);
        return true;
      }
    }

    // Element doesn't exist yet
    const elapsed = Date.now() - startTime;
    if (elapsed < maxWaitTime) {
      // Keep waiting
      setTimeout(waitForElementAndScroll, pollInterval);
      return false;
    } else {
      // Timeout reached
      console.warn('[Header] Timeout waiting for element:', targetId);
      hideNavigationLoading();
      return false;
    }
  };

  // Start waiting for element
  waitForElementAndScroll();

  // Also trigger a hashchange event to let the page component handle the scrolling
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

// Loading indicator functions
let loadingIndicator: HTMLElement | null = null;

const showNavigationLoading = () => {
  if (typeof window === 'undefined') return;

  // Remove existing indicator if any
  hideNavigationLoading();

  // Create loading indicator
  loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'navigation-loading-indicator';
  loadingIndicator.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
  `;

  // Create spinner
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  `;

  // Add keyframes if not already present
  if (!document.getElementById('navigation-loading-styles')) {
    const style = document.createElement('style');
    style.id = 'navigation-loading-styles';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // Create text
  const text = document.createElement('div');
  text.textContent = 'Loading team members...';
  text.style.cssText = `
    margin-top: 16px;
    font-size: 16px;
    font-weight: 500;
    color: #3b82f6;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  loadingIndicator.appendChild(spinner);
  loadingIndicator.appendChild(text);
  document.body.appendChild(loadingIndicator);
};

const hideNavigationLoading = () => {
  if (loadingIndicator && loadingIndicator.parentNode) {
    loadingIndicator.parentNode.removeChild(loadingIndicator);
    loadingIndicator = null;
  }
};

/**
 * User Avatar Dropdown Component
 * Shows user's profile image with dropdown menu for Profile and Sign Out
 * Editorial design with gradient border and refined animations
 */
function UserAvatarDropdown({
  user,
  onSignOut,
  isSigningOut
}: {
  user: any;
  onSignOut: () => void;
  isSigningOut: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get user's profile image or use default avatar
  const userImageUrl = user?.imageUrl || user?.hasImage ? user?.imageUrl : null;
  const userName = user?.firstName || user?.fullName || user?.emailAddresses?.[0]?.emailAddress || 'User';
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || '';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button with Gradient Border */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="header-avatar flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--header-focus-ring)] focus:ring-offset-2"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {userImageUrl ? (
          <Image
            src={userImageUrl}
            alt={userName}
            width={40}
            height={40}
            className="w-full h-full object-cover rounded-full"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-amber-400 text-white">
            <User size={18} className="text-white" />
          </div>
        )}
      </button>

      {/* Dropdown Menu */}
      <div className={`header-dropdown absolute top-full right-0 mt-3 w-72 z-50 ${isOpen ? 'visible' : ''}`}>
        <div className="py-2">
          {/* User Info Header */}
          <div className="px-4 py-4 border-b border-[var(--header-border)]">
            <div className="flex items-center gap-3">
              {userImageUrl ? (
                <div className="flex-shrink-0">
                  <Image
                    src={userImageUrl}
                    alt={userName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-[var(--header-border)]"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-violet-500 to-amber-400 text-white rounded-full flex-shrink-0">
                  <User size={22} className="text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--header-text-primary)] truncate font-['Plus_Jakarta_Sans']">
                  {userName}
                </p>
                {userEmail && (
                  <p className="text-xs text-[var(--header-text-muted)] truncate mt-0.5">
                    {userEmail}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2 px-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className={`header-dropdown-item flex items-center gap-3 ${pathname === '/profile' ? 'active' : ''}`}
              role="menuitem"
              aria-label="View profile"
            >
              <User size={16} aria-hidden="true" />
              <span>Profile</span>
            </Link>

            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              disabled={isSigningOut}
              className={`
                w-full flex items-center gap-3 text-left
                font-['Plus_Jakarta_Sans'] font-medium text-sm
                px-4 py-2.5 mx-0 rounded-lg
                transition-all duration-200
                ${isSigningOut
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-rose-500 hover:text-rose-600 hover:bg-rose-50'
                }
              `}
              role="menuitem"
              aria-label="Sign out"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header({ hideMenuItems = false, variant = 'charity', isTenantAdmin }: HeaderProps) {
  const pathname = usePathname();
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const {
    settings,
    showTeamSection,
    showHeaderHome,
    showHeaderAbout,
    showHeaderEvents,
    showHeaderFeatures,
    showHeaderCalendar,
    showHeaderGallery,
    showHeaderContact,
    showHeaderNews,
    showHeaderDownloads,
    showHeaderLinks,
    loading: settingsLoading,
  } = useTenantSettings();
  const [isAdmin, setIsAdmin] = useState(!!isTenantAdmin);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [openMobileDropdowns, setOpenMobileDropdowns] = useState<Record<string, boolean>>({});
  const [headerLogoSrc, setHeaderLogoSrc] = useState(HEADER_LOGO_PREFERRED);

  // CRITICAL: When returning from primary domain sign-out, call Clerk signOut()
  // on the satellite to clear its own session cookie. Just clearing localStorage
  // is NOT enough — the Clerk session cookie persists and keeps the user signed in.
  // We wait for Clerk to load (isLoaded + signOut available) before calling signOut().
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const clerkSignedOut = urlParams.get('clerk_signout');

    if (clerkSignedOut !== 'true') return;

    // Wait for Clerk to be loaded before attempting sign-out
    if (!isLoaded) {
      console.log('[Header] clerk_signout=true detected, waiting for Clerk to load...');
      return;
    }

    console.log('[Header] Detected clerk_signout=true flag, clearing satellite session...');

    // Clear all Clerk-related items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('clerk') || key.includes('__clerk')) {
        localStorage.removeItem(key);
      }
    });

    // Build the clean URL (without clerk_signout param) for after sign-out
    urlParams.delete('clerk_signout');
    const cleanUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');

    // Call Clerk signOut() to properly clear the session cookie on this satellite domain.
    // Without this, the satellite still has a valid session cookie and will appear signed in.
    if (signOut) {
      signOut({ redirectUrl: cleanUrl })
        .then(() => {
          console.log('[Header] signOut() completed on satellite domain');
          // Clerk should redirect via redirectUrl. If it doesn't, fall back to manual redirect.
          window.location.replace(cleanUrl);
        })
        .catch((err: unknown) => {
          console.error('[Header] signOut() failed on satellite:', err);
          // Still redirect even if signOut fails — the localStorage is already cleared
          window.location.replace(cleanUrl);
        });
    } else {
      // signOut not available (edge case) — just clean URL and reload
      console.warn('[Header] signOut not available, redirecting without clearing session');
      window.location.replace(cleanUrl);
    }
  }, [isLoaded, signOut]);

  // Debug: Log auth state changes
  useEffect(() => {
    console.log('[Header] Auth state:', {
      isLoaded,
      userId,
      userName: user?.firstName,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server'
    });
  }, [isLoaded, userId, user]);

  // Prefer server-verified tenant admin flag when provided; re-check admin status when user logs in
  // CRITICAL: When user logs in client-side, isTenantAdmin prop may be stale (from initial SSR)
  // We need to re-check admin status from the database when userId changes
  useEffect(() => {
    // If auth is not loaded yet, use server-verified flag (from SSR)
    if (!isLoaded) {
      setIsAdmin(!!isTenantAdmin);
      return;
    }

    // Clear admin only when there is no Clerk userId.
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    // Wait for useUser() without clearing — requiring `user` too early caused Admin menu flicker.
    if (!user) {
      setIsAdmin(!!isTenantAdmin);
      return;
    }

    if (isTenantAdmin === true) {
      setIsAdmin(true);
      return;
    }

    // CRITICAL: When user logs in (userId changes from null to value), re-check admin status
    // This ensures admin menu appears immediately after login without requiring page refresh
    // We use the proxy API endpoint which is public and doesn't require authentication
    const checkAdminStatus = async () => {
      try {
        const tenantId =
          process.env.AMPLIFY_NEXT_PUBLIC_TENANT_ID ||
          process.env.NEXT_PUBLIC_TENANT_ID;
        const email = user.emailAddresses?.[0]?.emailAddress;

        let profile = null;
        if (tenantId) {
          const query = new URLSearchParams({
            'userId.equals': userId,
            'tenantId.equals': tenantId,
            size: '1',
          });
          const resp = await fetch(`/api/proxy/user-profiles?${query.toString()}`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
          });
          if (resp.ok) {
            profile = pickFirstUserProfile(await resp.json());
          }
          if (!profile && email) {
            const emailQuery = new URLSearchParams({
              'email.equals': email,
              'tenantId.equals': tenantId,
              size: '1',
            });
            const emailResp = await fetch(`/api/proxy/user-profiles?${emailQuery.toString()}`, {
              cache: 'no-store',
              headers: { 'Content-Type': 'application/json' }
            });
            if (emailResp.ok) {
              profile = pickFirstUserProfile(await emailResp.json());
            }
          }
        }

        // Duplicate MEMBER rows are newer and fill an unfiltered first page.
        // Ask for admin roles directly so a super-admin row is not skipped.
        if (!isAdminRole(profile?.userRole) && (email || userId)) {
          const roleQuery = new URLSearchParams();
          if (email) roleQuery.set('email.equals', email);
          else roleQuery.set('userId.equals', userId);
          roleQuery.append('userRole.in', 'ADMIN');
          roleQuery.append('userRole.in', 'SUPER_ADMIN');
          roleQuery.set('size', '1');
          roleQuery.set('sort', 'id,asc');
          const roleResp = await fetch(`/api/proxy/user-profiles?${roleQuery.toString()}`, {
            cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }
          });
          if (roleResp.ok) {
            const adminProfile = pickFirstUserProfile(await roleResp.json());
            if (adminProfile) profile = adminProfile;
          }
        }

        const isAdminUser = profile ? isAdminRole(profile.userRole) : false;
        if (profile) {
          console.log('[Header] Admin status check result:', {
            userId,
            isAdminUser,
            userRole: profile.userRole,
            tenantId: profile.tenantId,
            isTenantAdminProp: isTenantAdmin
          });
          setIsAdmin(isAdminUser);
        } else if (typeof isTenantAdmin === 'boolean') {
          setIsAdmin(isTenantAdmin);
        } else {
          const publicRole = user.publicMetadata?.role as string;
          const orgRole = user.organizationMemberships?.[0]?.role;
          setIsAdmin(
            publicRole === 'admin' ||
            publicRole === 'administrator' ||
            orgRole === 'admin' ||
            orgRole === 'org:admin'
          );
        }
      } catch (error) {
        console.error('[Header] Error checking admin status:', error);
        // Fallback to server-verified flag or Clerk metadata
        if (typeof isTenantAdmin === 'boolean') {
          setIsAdmin(isTenantAdmin);
        } else {
          setIsAdmin(false);
        }
      }
    };

    // Only check admin status if user is logged in
    // This prevents unnecessary API calls when user is not logged in
    checkAdminStatus();
  }, [isLoaded, userId, user, isTenantAdmin]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    console.log('[Header] Sign out button clicked');
    setIsSigningOut(true);

    // Broadcast sign-out to other tabs
    localStorage.setItem('clerk_signout_broadcast', Date.now().toString());

    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const primaryDomain = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || BRAND_PRIMARY_HOST;
    const primaryHost = primaryDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Local dev: treat as primary for sign-out so we never send localhost to satellite signout-redirect.
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    // CRITICAL: If we're on the primary domain, always do normal sign out (never redirect).
    // This prevents sign-out errors when NEXT_PUBLIC_CLERK_DOMAIN is mis-set on primary app.
    const isPrimary =
      isLocalDev ||
      hostname === primaryHost ||
      hostname === primaryDomain ||
      hostname.includes(primaryHost.replace('www.', '')) ||
      hostname.includes(primaryDomain.replace('www.', ''));

    /** Marketing home (not `/`, which is the auth shell on primary). */
    const afterPrimarySignOut = '/home';

    if (isPrimary) {
      try {
        await signOut();
        window.location.href = afterPrimarySignOut;
      } catch (error) {
        console.error('[Header] Error signing out:', error);
        setIsSigningOut(false);
      }
      return;
    }

    // Known satellite bare domains from public API (DB + cache, fallback JSON); then hardcoded fallback.
    let knownSatellites: string[] = ['mosc-temp.com', 'mcefee-temp.com', 'md-strikers.com'];
    try {
      const res = await fetch('/api/public/satellite-domains', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.domains) && data.domains.length > 0) {
          knownSatellites = data.domains;
        }
      }
    } catch {
      /* use hardcoded list */
    }
    const isSatellite = knownSatellites.some(sat => hostname.includes(sat));
    if (isSatellite) {
      console.log('[Header] Satellite domain detected, redirecting to primary domain sign-out...');
      const primarySignOutUrl = `https://${primaryHost}/auth/signout-redirect`;
      const returnUrl = encodeURIComponent(window.location.origin);
      window.location.href = `${primarySignOutUrl}?redirect_url=${returnUrl}`;
      return;
    }

    // Fallback: not primary and not satellite — normal sign out to marketing home
    try {
      await signOut();
      window.location.href = '/home';
    } catch (error) {
      console.error('[Header] Error signing out:', error);
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const headerHeight = 80;

    const scrollToHashWithOffset = (behavior: ScrollBehavior = 'smooth') => {
      const hash = window.location.hash;
      if (!hash || (window.location.pathname !== '/' && window.location.pathname !== '/charity-theme')) return;
      const targetId = hash.replace('#', '');

      // Show loading indicator for team section
      if (targetId === 'team-section') {
        showNavigationLoading();
      }

      // Wait for element to exist before scrolling (especially important for dynamically loaded sections)
      const maxWaitTime = targetId === 'team-section' ? 15000 : 10000; // 15 seconds for team-section, 10 for others
      const pollInterval = 100; // Check every 100ms
      const startTime = Date.now();

      const waitForElementAndScroll = () => {
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
          // CRITICAL: For team-section, ensure it's fully rendered and visible
          // Check if element has content (not just the container)
          if (targetId === 'team-section') {
            // Check if element has actual content (team members loaded)
            const hasContent = targetElement.querySelector('.max-w-7xl') &&
              (targetElement.querySelector('.grid') || targetElement.querySelector('.flex') ||
                targetElement.querySelector('[class*="team"]'));
            if (!hasContent) {
              // Element exists but content not loaded yet, keep waiting
              const elapsed = Date.now() - startTime;
              if (elapsed < maxWaitTime) {
                setTimeout(waitForElementAndScroll, pollInterval);
                return;
              }
            }
          }

          // Element exists and is ready, scroll to it with proper offset
          // Use larger offset for team-section to ensure it's fully visible above the fold
          const scrollOffset = targetId === 'team-section' ? headerHeight + 40 : headerHeight + 20;
          const targetPosition = targetElement.offsetTop - scrollOffset;

          // Ensure we scroll to the correct element by verifying the ID matches
          if (targetElement.id === targetId) {
            // Small delay to ensure layout is stable before scrolling
            setTimeout(() => {
              window.scrollTo({ top: Math.max(0, targetPosition), behavior });
              hideNavigationLoading();
              console.log('[Header useEffect] Successfully scrolled to:', targetId, 'at position:', targetPosition);
            }, 100);
            return;
          }
        }

        // Element doesn't exist yet
        const elapsed = Date.now() - startTime;
        if (elapsed < maxWaitTime) {
          // Keep waiting
          setTimeout(waitForElementAndScroll, pollInterval);
        } else {
          // Timeout reached
          console.warn('[Header useEffect] Timeout waiting for element:', targetId);
          hideNavigationLoading();
        }
      };

      // Start waiting for element
      waitForElementAndScroll();
    };

    if ((window.location.pathname === '/home' || window.location.pathname === '/charity-theme') && window.location.hash) {
      requestAnimationFrame(() => scrollToHashWithOffset('auto'));
      const timeout = setTimeout(() => scrollToHashWithOffset('auto'), 300);
      return () => clearTimeout(timeout);
    }

    const onHashChange = () => scrollToHashWithOffset('smooth');
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      hideNavigationLoading();
    };
  }, [pathname]);

  // Build About dropdown dynamically based on tenant settings
  // Only show Team when settings are loaded AND showTeamSection is explicitly true
  const aboutDropdown = [
    { name: 'About Us', href: '/home#about-us' }
  ];
  // Only add Team if:
  // 1. Settings are loaded (not loading)
  // 2. Settings exist (not null)
  // 3. showTeamSection is explicitly true
  if (!settingsLoading && settings && showTeamSection) {
    aboutDropdown.push({ name: 'Team', href: '/team' });
  }
  // Always add Sponsors menu item
  aboutDropdown.push({ name: 'Sponsors', href: '/sponsors' });

  const headerVisibility: Record<(typeof navItemCatalog)[number]['key'], boolean> = {
    home: showHeaderHome,
    about: showHeaderAbout,
    events: showHeaderEvents,
    features: showHeaderFeatures,
    calendar: showHeaderCalendar,
    gallery: showHeaderGallery,
    news: showHeaderNews,
    downloads: showHeaderDownloads,
    links: showHeaderLinks,
    contact: showHeaderContact,
  };

  // Filter catalog by tenant header flags, then attach About dropdown
  const navItemsWithDropdown = navItemCatalog
    .filter((item) => headerVisibility[item.key])
    .map((item) => {
      if (item.key === 'about') {
        return {
          ...item,
          dropdown: aboutDropdown,
        };
      }
      return item;
    });

  // Update active state based on current route
  const updatedNavItems = navItemsWithDropdown.map(item => ({
    ...item,
    active:
      item.href === pathname ||
      (item.href === '/home' && (pathname === '/charity-theme' || pathname === '/home')) ||
      (item.href === '/news' && (pathname === '/news' || pathname?.startsWith('/writings'))) ||
      (item.href === '/downloads' && pathname?.startsWith('/downloads')) ||
      (item.href === '/links' && pathname === '/links'),
  }));

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 header-glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-nowrap items-center justify-between h-[4.5rem]">
            {/* Left side - Unite India Text Logo with Editorial Typography */}
            <div className="flex items-center h-full">
              <Link href="/home" className="group flex items-center gap-3 h-full">
                {/* Unite India logo icon - full header height, 102px wide */}
                <div className="flex items-center justify-center h-full w-[102px] min-w-[102px] rounded-xl flex-shrink-0 overflow-hidden transition-all duration-300 group-hover:scale-105">
                  <Image
                    src={headerLogoSrc}
                    alt={`${BRAND_NAME} logo`}
                    width={102}
                    height={72}
                    className="w-full h-full object-contain"
                    unoptimized={headerLogoSrc.endsWith('.svg')}
                    onError={() => {
                      setHeaderLogoSrc((prev) =>
                        prev === HEADER_LOGO_FALLBACK ? prev : HEADER_LOGO_FALLBACK
                      );
                    }}
                  />
                </div>
                <div className="text-left">
                  <div className="header-logo-primary whitespace-nowrap text-[1.375rem] leading-tight group-hover:text-[var(--header-accent-primary)] transition-colors duration-300">
                    EVENT SITE ADMIN
                  </div>
                </div>
              </Link>
            </div>

            {/* Center - Desktop Navigation */}
            <div className="hidden lg:flex items-center flex-nowrap gap-1 ml-6 min-w-0">
              {/* Navigation Menu Items */}
              {!hideMenuItems && (
                <nav className="flex items-center flex-nowrap gap-0.5 whitespace-nowrap" role="navigation" aria-label="Main navigation">
                  {updatedNavItems.map((item) => {
                    const hasDropdown = item.dropdown && Array.isArray(item.dropdown) && item.dropdown.length > 0;
                    const isAboutActive = hasDropdown && item.name === 'About' && item.dropdown.some(
                      (subItem: any) => subItem.href === pathname ||
                        (subItem.href === '/home#about-us' && typeof window !== 'undefined' && window.location.hash === '#about-us') ||
                        (subItem.href === '/team' && pathname === '/team') ||
                        (subItem.href === '/sponsors' && pathname === '/sponsors')
                    );
                    const isFeaturesActive = hasDropdown && item.name === 'Features' && item.dropdown.some(
                      (subItem: any) => subItem.href === pathname ||
                        (subItem.href === '/profile' && pathname === '/profile') ||
                        (subItem.href === '/membership' && pathname?.startsWith('/membership')) ||
                        (subItem.href === '/mosc' && pathname?.startsWith('/mosc'))
                    );

                    return (
                      <div key={item.name} className="relative group shrink-0">
                        {hasDropdown ? (
                          <>
                            <div
                              className={`header-nav-link flex items-center gap-1.5 cursor-pointer ${(item.name === 'About' && isAboutActive) || (item.name === 'Features' && isFeaturesActive)
                                  ? 'active'
                                  : ''
                                }`}
                              aria-haspopup="true"
                              aria-expanded="false"
                              role="button"
                              tabIndex={0}
                            >
                              <span>{item.name}</span>
                              <ChevronDown
                                size={14}
                                className="header-chevron text-[var(--header-text-muted)]"
                                aria-hidden="true"
                              />
                            </div>
                            {/* Dropdown Menu */}
                            <div
                              className="header-dropdown absolute top-full left-0 mt-2 w-56 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 z-50"
                              role="menu"
                              aria-label={`${item.name} submenu`}
                            >
                              <div className="py-2">
                                {item.dropdown.map((subItem: any) => {
                                  // Skip Profile if user is not authenticated
                                  if (subItem.requiresAuth && !userId) return null;

                                  // Skip Membership if membership subscription is not enabled
                                  if (subItem.href === '/membership' && !settings?.isMembershipSubscriptionEnabled) return null;

                                  const isSubItemActive = subItem.href === pathname ||
                                    (subItem.href === '/membership' && pathname?.startsWith('/membership')) ||
                                    (subItem.href === '/home#about-us' && typeof window !== 'undefined' && window.location.hash === '#about-us') ||
                                    (subItem.href === '/team' && pathname === '/team');

                                  return (
                                    <Link
                                      key={subItem.name}
                                      href={subItem.href}
                                      onClick={(e) => {
                                        // Handle smooth scroll for hash links
                                        if (subItem.href.startsWith('/#')) {
                                          handleSmoothScroll(e, subItem.href);
                                        }
                                      }}
                                      className={`header-dropdown-item block ${isSubItemActive ? 'active' : ''}`}
                                      role="menuitem"
                                      aria-label={`Navigate to ${subItem.name}`}
                                    >
                                      {subItem.name}
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : (
                          <Link
                            href={item.href}
                            className={`header-nav-link ${item.active ? 'active' : ''}`}
                            onClick={(e) => handleSmoothScroll(e, item.href)}
                            aria-label={getNavAriaLabel(item.name)}
                            aria-current={item.active ? 'page' : undefined}
                          >
                            <span>{item.name}</span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </nav>
              )}

              {/* Auth and Admin Menu Items */}
              <div className="flex items-center gap-2 ml-2">
                {!userId ? (
                  <>
                    <Link
                      href="/sign-in"
                      className="header-nav-link"
                    >
                      <span>Sign In</span>
                    </Link>
                    <Link
                      href="/sign-up"
                      className="header-cta"
                    >
                      <span>Sign up</span>
                    </Link>
                  </>
                ) : (
                  <>
                    {/* Admin Menu with Submenu */}
                    {isAdmin && (
                      <div className="relative group">
                        <Link
                          href="/admin"
                          className={`header-nav-link flex items-center gap-1.5 ${pathname?.startsWith("/admin") ? 'active' : ''}`}
                        >
                          <span>Admin</span>
                          <ChevronDown
                            size={14}
                            className="header-chevron text-[var(--header-text-muted)]"
                            aria-hidden="true"
                          />
                        </Link>

                        {/* Admin Submenu */}
                        <div className="header-dropdown absolute top-full right-0 mt-2 w-64 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 z-50 max-h-[70vh] overflow-y-auto">
                          <div className="py-2">
                            {adminSubmenuItems.map(subItem => {
                              const hasDropdown = subItem.dropdown && Array.isArray(subItem.dropdown);
                              const isMembershipActive = hasDropdown && subItem.dropdown.some(
                                (subSubItem: any) => pathname?.startsWith(subSubItem.href)
                              );

                              if (hasDropdown) {
                                return (
                                  <div key={subItem.name} className="relative group/membership">
                                    <div
                                      className={`header-dropdown-item flex items-center justify-between cursor-pointer ${isMembershipActive ? 'active' : ''}`}
                                    >
                                      <span>{subItem.name}</span>
                                      <ChevronDown
                                        size={14}
                                        className="header-chevron text-[var(--header-text-muted)]"
                                        aria-hidden="true"
                                      />
                                    </div>
                                    {/* Membership Submenu */}
                                    <div className="header-dropdown absolute top-0 left-full ml-2 w-48 group-hover/membership:visible group-hover/membership:opacity-100 group-hover/membership:translate-y-0 group-hover/membership:scale-100 z-50">
                                      <div className="py-2">
                                        {subItem.dropdown.map((subSubItem: any) => {
                                          const isSubSubItemActive = pathname?.startsWith(subSubItem.href);
                                          return (
                                            <Link
                                              key={subSubItem.name}
                                              href={subSubItem.href}
                                              className={`header-dropdown-item block ${isSubSubItemActive ? 'active' : ''}`}
                                              role="menuitem"
                                              aria-label={`Navigate to ${subSubItem.name}`}
                                            >
                                              {subSubItem.name}
                                            </Link>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <Link
                                  key={subItem.name}
                                  href={subItem.href}
                                  className={`header-dropdown-item block ${pathname?.startsWith(subItem.href) ? 'active' : ''}`}
                                  role="menuitem"
                                  aria-label={`Navigate to ${subItem.name}`}
                                >
                                  {subItem.name}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* User Profile Avatar Dropdown - Rightmost */}
                    <UserAvatarDropdown
                      user={user}
                      onSignOut={handleSignOut}
                      isSigningOut={isSigningOut}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Right side - Search and Mobile Menu */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                aria-label="Search"
                className="header-search-btn hidden sm:flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[var(--header-focus-ring)]"
              >
                <Search
                  size={18}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </button>

              {/* Mobile menu button */}
              <button
                className="header-hamburger lg:hidden focus:outline-none focus:ring-2 focus:ring-[var(--header-focus-ring)]"
                onClick={toggleMobileMenu}
                aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                type="button"
              >
                {!isMobileMenuOpen ? (
                  <>
                    <div className="header-hamburger-line"></div>
                    <div className="header-hamburger-line"></div>
                    <div className="header-hamburger-line"></div>
                  </>
                ) : (
                  <X size={18} className="text-[var(--header-text-secondary)]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-[var(--header-text-primary)]/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        id="mobile-menu"
        className={`header-mobile-menu fixed top-0 right-0 h-full w-80 max-w-[85vw] z-50 transform transition-transform duration-300 ease-out lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="flex flex-col h-full">
          {/* Mobile Menu Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--header-border)]">
            <Link href="/home" className="flex items-center gap-2.5" onClick={closeMobileMenu}>
              <div className="flex items-center justify-center w-[86px] min-w-[86px] h-14 rounded-lg flex-shrink-0 overflow-hidden">
                <Image
                  src={headerLogoSrc}
                  alt={`${BRAND_NAME} logo`}
                  width={86}
                  height={56}
                  className="w-full h-full object-contain"
                  unoptimized={headerLogoSrc.endsWith('.svg')}
                  onError={() => {
                    setHeaderLogoSrc((prev) =>
                      prev === HEADER_LOGO_FALLBACK ? prev : HEADER_LOGO_FALLBACK
                    );
                  }}
                />
              </div>
              <div className="text-left">
                <div className="header-logo-primary whitespace-nowrap text-lg leading-tight">
                  EVENT SITE ADMIN
                </div>
              </div>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="
                flex items-center justify-center
                w-10 h-10
                text-[var(--header-text-muted)] hover:text-[var(--header-accent-primary)]
                bg-transparent hover:bg-[var(--header-hover-bg)]
                rounded-lg
                focus:outline-none focus:ring-2 focus:ring-[var(--header-focus-ring)]
                transition-all duration-200
                touch-manipulation
              "
              aria-label="Close navigation menu"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Mobile Menu Navigation */}
          <nav className="flex-1 overflow-y-auto py-4" role="navigation" aria-label="Mobile navigation">
            <ul className="space-y-0.5 px-3">
              {!hideMenuItems && updatedNavItems.map((item) => {
                const hasDropdown = item.dropdown && Array.isArray(item.dropdown) && item.dropdown.length > 0;
                const isDropdownOpen = openMobileDropdowns[item.name] || false;

                if (hasDropdown) {
                  return (
                    <li key={item.name}>
                      <button
                        onClick={() => setOpenMobileDropdowns(prev => ({ ...prev, [item.name]: !prev[item.name] }))}
                        className={`header-mobile-link w-full flex items-center justify-between ${isDropdownOpen ? 'active' : ''}`}
                        aria-label={`Toggle ${item.name} submenu`}
                        aria-expanded={isDropdownOpen}
                      >
                        <span>{item.name}</span>
                        <ChevronDown
                          size={16}
                          className={`text-[var(--header-text-muted)] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                      {isDropdownOpen && (
                        <ul className="pl-3 mt-1 space-y-0.5 border-l-2 border-[var(--header-border)] ml-4">
                          {item.dropdown.map((subItem: any) => {
                            // Skip Profile if user is not authenticated
                            if (subItem.requiresAuth && !userId) return null;

                            // Skip Membership if membership subscription is not enabled
                            if (subItem.href === '/membership' && !settings?.isMembershipSubscriptionEnabled) return null;

                            const isSubItemActive = subItem.href === pathname ||
                              (subItem.href === '/membership' && pathname?.startsWith('/membership')) ||
                              (subItem.href === '/mosc' && pathname?.startsWith('/mosc')) ||
                              (subItem.href === '/home#about-us' && typeof window !== 'undefined' && window.location.hash === '#about-us') ||
                              (subItem.href === '/team' && pathname === '/team') ||
                              (subItem.href === '/sponsors' && pathname === '/sponsors');

                            return (
                              <li key={subItem.name}>
                                <Link
                                  href={subItem.href}
                                  onClick={(e) => {
                                    // Handle smooth scroll for hash links
                                    if (subItem.href.startsWith('/#')) {
                                      handleSmoothScroll(e, subItem.href);
                                    }
                                    closeMobileMenu();
                                  }}
                                  className={`
                                    block py-2.5 px-4 rounded-lg
                                    font-['Plus_Jakarta_Sans'] text-sm font-medium
                                    transition-all duration-200
                                    ${isSubItemActive
                                      ? 'text-[var(--header-accent-primary)] font-semibold bg-[var(--header-active-bg)]'
                                      : 'text-[var(--header-text-secondary)] hover:text-[var(--header-accent-primary)] hover:bg-[var(--header-hover-bg)]'
                                    }
                                  `}
                                  aria-label={`Navigate to ${subItem.name}`}
                                >
                                  {subItem.name}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                }

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`header-mobile-link block ${item.active ? 'active' : ''}`}
                      onClick={(e) => {
                        closeMobileMenu();
                        handleSmoothScroll(e, item.href);
                      }}
                      aria-label={getNavAriaLabel(item.name)}
                      aria-current={item.active ? 'page' : undefined}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Mobile Menu Auth Section */}
            <div className="px-3 mt-6 space-y-2">
              {!userId ? (
                <div className="space-y-2 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-amber-50 border border-[var(--header-border)]">
                  <Link
                    href="/sign-in"
                    className="
                      block w-full py-3 px-4 rounded-lg
                      font-['Plus_Jakarta_Sans'] font-medium text-sm
                      text-center text-[var(--header-text-secondary)]
                      hover:text-[var(--header-accent-primary)] hover:bg-white/80
                      focus:outline-none
                      transition-all duration-200
                    "
                    onClick={closeMobileMenu}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    className="
                      block w-full py-3 px-4 rounded-lg
                      font-['Plus_Jakarta_Sans'] font-semibold text-sm
                      text-center text-white
                      bg-gradient-to-r from-violet-600 to-violet-500
                      hover:from-violet-700 hover:to-violet-600
                      shadow-lg shadow-violet-500/20
                      focus:outline-none focus:ring-2 focus:ring-violet-500/50
                      transition-all duration-200
                    "
                    onClick={closeMobileMenu}
                  >
                    Sign up
                  </Link>
                </div>
              ) : (
                <>
                  {/* Mobile User Profile Section */}
                  <div className="px-3 mb-4 pb-4 border-b border-[var(--header-border)]">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-amber-50">
                      {user?.imageUrl ? (
                        <div className="flex-shrink-0">
                          <Image
                            src={user.imageUrl}
                            alt={user?.firstName || user?.fullName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
                            width={48}
                            height={48}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-violet-500 to-amber-400 text-white rounded-full flex-shrink-0 shadow-md">
                          <User size={22} className="text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--header-text-primary)] truncate font-['Plus_Jakarta_Sans']">
                          {user?.firstName || user?.fullName || user?.emailAddresses?.[0]?.emailAddress || 'User'}
                        </p>
                        {user?.emailAddresses?.[0]?.emailAddress && (
                          <p className="text-xs text-[var(--header-text-muted)] truncate mt-0.5">
                            {user.emailAddresses[0].emailAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Profile Link */}
                  <Link
                    href="/profile"
                    className="header-mobile-link flex items-center gap-3"
                    onClick={closeMobileMenu}
                    aria-label="View profile"
                  >
                    <User size={18} aria-hidden="true" />
                    <span>Profile</span>
                  </Link>

                  {/* Mobile Sign Out Button */}
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleSignOut();
                    }}
                    disabled={isSigningOut}
                    className={`
                      flex items-center justify-center gap-2
                      w-full py-3 px-4 mx-0 rounded-lg
                      font-['Plus_Jakarta_Sans'] font-medium text-sm
                      border
                      focus:outline-none
                      transition-all duration-200
                      ${isSigningOut
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-rose-200 text-rose-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-300'
                      }
                    `}
                    aria-label="Sign out"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
                  </button>

                  {/* Mobile Admin Menu */}
                  {isAdmin && (
                    <div className="border-t border-[var(--header-border)] pt-4 mt-4">
                      <div className="text-xs font-semibold text-[var(--header-text-muted)] uppercase tracking-wider mb-3 px-4 font-['Plus_Jakarta_Sans']">
                        Admin Panel
                      </div>
                      <div className="space-y-0.5">
                        {adminSubmenuItems.map(subItem => {
                          const hasDropdown = subItem.dropdown && Array.isArray(subItem.dropdown);
                          const isDropdownOpen = openMobileDropdowns[`admin-${subItem.name}`] || false;

                          if (hasDropdown) {
                            return (
                              <div key={subItem.name}>
                                <button
                                  onClick={() => setOpenMobileDropdowns(prev => ({ ...prev, [`admin-${subItem.name}`]: !prev[`admin-${subItem.name}`] }))}
                                  className={`header-mobile-link w-full flex items-center justify-between text-sm py-2.5 ${isDropdownOpen ? 'active' : ''}`}
                                  aria-label={`Toggle ${subItem.name} submenu`}
                                  aria-expanded={isDropdownOpen}
                                >
                                  <span>{subItem.name}</span>
                                  <ChevronDown
                                    size={14}
                                    className={`text-[var(--header-text-muted)] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}
                                    aria-hidden="true"
                                  />
                                </button>
                                {isDropdownOpen && (
                                  <ul className="pl-3 mt-1 space-y-0.5 border-l-2 border-[var(--header-border)] ml-4">
                                    {subItem.dropdown.map((subSubItem: any) => {
                                      const isSubSubItemActive = pathname?.startsWith(subSubItem.href);
                                      return (
                                        <li key={subSubItem.name}>
                                          <Link
                                            href={subSubItem.href}
                                            className={`
                                              block py-2 px-4 rounded-lg
                                              font-['Plus_Jakarta_Sans'] text-xs font-medium
                                              transition-all duration-200
                                              ${isSubSubItemActive
                                                ? 'text-[var(--header-accent-primary)] font-semibold bg-[var(--header-active-bg)]'
                                                : 'text-[var(--header-text-secondary)] hover:text-[var(--header-accent-primary)] hover:bg-[var(--header-hover-bg)]'
                                              }
                                            `}
                                            onClick={closeMobileMenu}
                                            role="menuitem"
                                            aria-label={`Navigate to ${subSubItem.name}`}
                                          >
                                            {subSubItem.name}
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={`header-mobile-link block text-sm py-2.5 ${pathname?.startsWith(subItem.href) ? 'active' : ''}`}
                              onClick={closeMobileMenu}
                              role="menuitem"
                              aria-label={`Navigate to ${subItem.name}`}
                            >
                              {subItem.name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Actions */}
            <div className="px-3 mt-6 mb-6">
              <button
                className="
                  w-full py-3 px-4 rounded-lg
                  font-['Plus_Jakarta_Sans'] font-medium text-sm
                  border border-[var(--header-border)]
                  text-[var(--header-text-secondary)]
                  hover:text-[var(--header-accent-primary)] hover:bg-[var(--header-hover-bg)] hover:border-[var(--header-accent-primary)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--header-focus-ring)]
                  transition-all duration-200
                  flex items-center justify-center gap-2
                "
                aria-label="Search"
              >
                <Search size={16} aria-hidden="true" />
                <span>Search</span>
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
