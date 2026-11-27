import { auth } from "@clerk/nextjs/server";
import AdminRecordMissing from '@/components/admin/AdminRecordMissing';
import { fetchNewsletterEmailTemplateServer } from '../ApiServerActions';
import NewsletterEmailTemplateEditClient from './NewsletterEmailTemplateEditClient';

export default async function PromotionEmailTemplateEditPage(
  props: {
    params: Promise<{ id: string }> | { id: string };
    searchParams?: Promise<{ tenant?: string }> | { tenant?: string };
  }
) {
  const { params } = props;
  const rawSearch = props.searchParams;
  const searchParams: { tenant?: string } =
    rawSearch && typeof (rawSearch as Promise<unknown>).then === 'function'
      ? await (rawSearch as Promise<{ tenant?: string }>)
      : ((rawSearch as { tenant?: string } | undefined) ?? {});
  const { userId } = await auth();

  if (!userId) {
    return <div>You must be logged in to view this page.</div>;
  }

  // Handle params for Next.js 15+ compatibility
  let templateId: string;
  if (typeof params.then === 'function') {
    const resolvedParams = await params;
    templateId = resolvedParams.id;
  } else {
    templateId = params.id;
  }

  const numericId = Number(templateId);
  let template = null;
  let loadFailed = false;
  if (Number.isFinite(numericId) && numericId > 0) {
    try {
      template = await fetchNewsletterEmailTemplateServer(numericId, searchParams.tenant?.trim() || undefined);
    } catch {
      loadFailed = true;
    }
  }
  if (!template) {
    return (
      <AdminRecordMissing
        title={loadFailed ? 'This template could not be loaded' : 'This template is no longer available'}
        message={
          loadFailed
            ? 'Refresh the page, or go back to the template list and open it again.'
            : `Template #${templateId} was deleted, or this link is out of date. Open the template list to continue.`
        }
        backHref="/admin/newsletter-emails"
        backLabel="Back to templates"
      />
    );
  }

  return (
    <NewsletterEmailTemplateEditClient
      template={template}
      templateId={Number(templateId)}
    />
  );
}







