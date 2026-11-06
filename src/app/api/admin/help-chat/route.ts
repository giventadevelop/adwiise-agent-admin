import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCurrentAdminAccess } from '@/app/admin/adminAccessServer';
import { answerAdminHelpQuestion, suggestedChipsForPath } from '@/lib/adminHelp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type HelpChatBody = {
  question?: string;
  pathname?: string;
  siteType?: string | null;
  tenantId?: string | null;
};

/**
 * POST /api/admin/help-chat
 * Clerk-gated admin how-to chat. Grounded on curated knowledge; Bedrock when enabled.
 */
export async function POST(request: Request) {
  try {
    const authResult = await auth();
    const userId = authResult?.userId || null;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await getCurrentAdminAccess();
    if (!access.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: HelpChatBody = {};
    try {
      body = (await request.json()) as HelpChatBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const question = typeof body.question === 'string' ? body.question : '';
    if (!question.trim()) {
      return NextResponse.json({ error: 'question is required' }, { status: 400 });
    }

    const pathname =
      typeof body.pathname === 'string' && body.pathname.startsWith('/admin')
        ? body.pathname
        : '/admin';

    const result = await answerAdminHelpQuestion(question, {
      pathname,
      isPlatformSuperAdmin: access.isPlatformSuperAdmin,
      siteType: body.siteType ?? null,
      tenantId: typeof body.tenantId === 'string' ? body.tenantId : access.defaultTenantId ?? null,
    });

    return NextResponse.json({
      reply: result.reply,
      backend: result.backend,
      featureKey: result.featureKey ?? null,
      chunkIds: result.chunkIds,
      suggestedChips: suggestedChipsForPath(pathname, access.isPlatformSuperAdmin),
    });
  } catch (error) {
    console.error('[api/admin/help-chat]', error);
    return NextResponse.json({ error: 'Help chat failed' }, { status: 500 });
  }
}

/** Lightweight chips for the floating help UI without invoking the model. */
export async function GET(request: Request) {
  try {
    const authResult = await auth();
    if (!authResult?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const access = await getCurrentAdminAccess();
    if (!access.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const pathname = url.searchParams.get('pathname') || '/admin';
    return NextResponse.json({
      suggestedChips: suggestedChipsForPath(pathname, access.isPlatformSuperAdmin),
      bedrockEnabled: (() => {
        const raw = String(
          process.env.BEDROCK_ENABLED ?? process.env.ADMIN_HELP_BEDROCK_ENABLED ?? 'true',
        )
          .trim()
          .toLowerCase();
        return raw !== 'false' && raw !== '0' && raw !== 'off' && raw !== 'no';
      })(),
    });
  } catch (error) {
    console.error('[api/admin/help-chat GET]', error);
    return NextResponse.json({ error: 'Help chat failed' }, { status: 500 });
  }
}
