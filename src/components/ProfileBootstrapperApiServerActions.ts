"use server";
import { fetchWithJwtRetry } from '@/lib/proxyHandler';
import { getTenantId, getApiBaseUrl, getAppUrl } from '@/lib/env';
import { buildClerkProfileInsert, decideClerkProfileIdentity } from '@/lib/clerkProfileIdentity';
import { pickAllUserProfiles } from '@/lib/pickFirstUserProfile';

const API_BASE_URL = getApiBaseUrl();

export async function bootstrapUserProfile({
  userId,
  userData
}: {
  userId: string,
  userData?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }
}) {
  if (!userId) return;
  try {
    const tenantId = getTenantId();

    // 1. Try to fetch by userId + tenantId
    // CRITICAL: If profile exists with correct userId, do NOT update anything
    // This prevents overwriting existing firstName, lastName, email fields
    let res = await fetchWithJwtRetry(
      `${API_BASE_URL}/api/user-profiles/by-user/${userId}?tenantId.equals=${tenantId}`,
      {
        method: 'GET',
        cache: 'no-store',
        timeout: 15000,
      },
      'bootstrap-by-user'
    );

    // CRITICAL: If profile exists with correct userId + tenantId, return immediately
    // Do NOT update anything - preserve all existing fields
    if (res.ok) {
      const existingProfile = await res.json();
      console.log('[bootstrapUserProfile] ✅ Profile exists with correct userId, preserving all existing fields:', {
        id: existingProfile?.id,
        userId: existingProfile?.userId,
        firstName: existingProfile?.firstName || '(empty)',
        lastName: existingProfile?.lastName || '(empty)',
        email: existingProfile?.email || '(empty)',
      });
      return; // Profile exists - do NOT update
    }

    // Some backends return 5xx from /by-user/:id while the criteria list endpoint works (same as root layout / proxy).
    if (!res.ok && res.status !== 404) {
      const criteriaUrl = `${API_BASE_URL}/api/user-profiles?userId.equals=${encodeURIComponent(userId)}&tenantId.equals=${encodeURIComponent(tenantId)}&size=1`;
      const listRes = await fetchWithJwtRetry(criteriaUrl, {
        method: 'GET',
        cache: 'no-store',
      });
      if (listRes.ok) {
        const raw = await listRes.json();
        const profiles = Array.isArray(raw)
          ? raw
          : (raw as { _embedded?: { userProfiles?: unknown[] } })?._embedded?.userProfiles;
        if (Array.isArray(profiles) && profiles.length > 0) {
          console.log(
            '[bootstrapUserProfile] ✅ Profile found via criteria fallback (/by-user returned ' + res.status + ')'
          );
          return;
        }
      }
      console.warn(
        '[bootstrapUserProfile] /by-user returned',
        res.status,
        'and criteria list did not return a profile; skipping bootstrap (non-fatal).'
      );
      return;
    }

    // 2. Fallback: lookup by email
    if (res.status === 404) {
      const email = userData?.email || "";
      if (email) {
        const emailRes = await fetchWithJwtRetry(
          `${API_BASE_URL}/api/user-profiles?email.equals=${encodeURIComponent(email)}&tenantId.equals=${encodeURIComponent(tenantId)}&sort=id,asc&size=20`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          }
        );
        if (emailRes.ok) {
          const profiles = pickAllUserProfiles(await emailRes.json());
          if (profiles.length > 0) {
            const decision = decideClerkProfileIdentity(profiles, userId);
            if (decision.action === 'use') {
              console.log('[bootstrapUserProfile] Profile already has this Clerk user id');
              return;
            }

            if (decision.action === 'insert') {
              const payload = buildClerkProfileInsert({
                userId,
                email,
                tenantId,
                firstName: userData?.firstName,
                lastName: userData?.lastName,
                imageUrl: userData?.imageUrl,
                sibling: decision.sibling,
              });
              await fetch(`${getAppUrl()}/api/proxy/user-profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                cache: 'no-store',
              });
              return;
            }

            const userProfile = decision.row;
            // CRITICAL: Use PATCH (not PUT) and only update userId/clerkUserId
            // DO NOT overwrite firstName, lastName, email if they already exist
            const now = new Date().toISOString();
            const updatePayload: any = {
              id: userProfile.id, // MUST include id for PATCH
              userId: userId, // Update to current Clerk userId
              clerkUserId: userId, // Also update clerkUserId
              tenantId: tenantId, // Include tenantId
              updatedAt: now,
            };

            // CRITICAL: ONLY update firstName/lastName/email if they are missing/empty in existing profile
            // NEVER include these fields in the payload if they would overwrite existing non-empty values
            // This prevents overwriting existing data with empty values from Clerk
            if (!userProfile.firstName || userProfile.firstName.trim() === '') {
              // Only update if Clerk provides a non-empty value
              if (userData?.firstName && userData.firstName.trim() !== '') {
                updatePayload.firstName = userData.firstName;
                console.log('[bootstrapUserProfile] Will update firstName (was empty):', userData.firstName);
              } else {
                console.log('[bootstrapUserProfile] Skipping firstName update (Clerk data missing/empty)');
              }
            } else {
              console.log('[bootstrapUserProfile] Preserving existing firstName:', userProfile.firstName);
            }
            // Preserve existing firstName - do NOT update

            if (!userProfile.lastName || userProfile.lastName.trim() === '') {
              // Only update if Clerk provides a non-empty value
              if (userData?.lastName && userData.lastName.trim() !== '') {
                updatePayload.lastName = userData.lastName;
                console.log('[bootstrapUserProfile] Will update lastName (was empty):', userData.lastName);
              } else {
                console.log('[bootstrapUserProfile] Skipping lastName update (Clerk data missing/empty)');
              }
            } else {
              console.log('[bootstrapUserProfile] Preserving existing lastName:', userProfile.lastName);
            }
            // Preserve existing lastName - do NOT update

            if (!userProfile.email || userProfile.email.trim() === '') {
              // Only update if Clerk provides a non-empty value
              if (email && email.trim() !== '') {
                updatePayload.email = email;
                console.log('[bootstrapUserProfile] Will update email (was empty):', email);
              } else {
                console.log('[bootstrapUserProfile] Skipping email update (Clerk data missing/empty)');
              }
            } else {
              console.log('[bootstrapUserProfile] Preserving existing email:', userProfile.email);
            }
            // Preserve existing email - do NOT update

            if (!userProfile.profileImageUrl || userProfile.profileImageUrl.trim() === '') {
              if (userData?.imageUrl && userData.imageUrl.trim() !== '') {
                updatePayload.profileImageUrl = userData.imageUrl;
              }
            }
            // Preserve existing profileImageUrl - do NOT update

            // CRITICAL: Log the payload to verify we're not sending empty strings
            console.log('[bootstrapUserProfile] 🔍 PATCH payload before sending:', {
              profileId: userProfile.id,
              oldUserId: userProfile.userId,
              newUserId: userId,
              existingFirstName: userProfile.firstName || '(empty)',
              existingLastName: userProfile.lastName || '(empty)',
              existingEmail: userProfile.email || '(empty)',
              updatePayloadKeys: Object.keys(updatePayload),
              updatePayload: JSON.stringify(updatePayload, null, 2),
              willUpdateFirstName: updatePayload.hasOwnProperty('firstName'),
              willUpdateLastName: updatePayload.hasOwnProperty('lastName'),
              willUpdateEmail: updatePayload.hasOwnProperty('email'),
            });

            // CRITICAL: Double-check - remove any fields that are empty strings to prevent overwriting
            if (updatePayload.firstName === '' || updatePayload.firstName === null || updatePayload.firstName === undefined) {
              delete updatePayload.firstName;
              console.log('[bootstrapUserProfile] ⚠️ Removed empty firstName from payload');
            }
            if (updatePayload.lastName === '' || updatePayload.lastName === null || updatePayload.lastName === undefined) {
              delete updatePayload.lastName;
              console.log('[bootstrapUserProfile] ⚠️ Removed empty lastName from payload');
            }
            if (updatePayload.email === '' || updatePayload.email === null || updatePayload.email === undefined) {
              delete updatePayload.email;
              console.log('[bootstrapUserProfile] ⚠️ Removed empty email from payload');
            }

            await fetchWithJwtRetry(`${API_BASE_URL}/api/user-profiles/${userProfile.id}`, {
              method: 'PATCH', // Use PATCH instead of PUT to avoid overwriting fields
              headers: { 'Content-Type': 'application/merge-patch+json' },
              body: JSON.stringify(updatePayload),
            });
            return;
          }
        }
      }
      // 3. If not found by email, create minimal profile
      const payload = buildClerkProfileInsert({
        userId,
        email,
        tenantId,
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        imageUrl: userData?.imageUrl,
      });
      await fetch(`${getAppUrl()}/api/proxy/user-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });
      return;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('timed out')) {
      console.warn('[bootstrapUserProfile] Profile bootstrap timed out after 15 seconds');
    } else {
      console.error('[bootstrapUserProfile] Error bootstrapping user profile:', error);
    }
    // Don't throw - allow page to continue loading even if bootstrap fails
  }
}
