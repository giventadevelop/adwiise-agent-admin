import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AdminNavigation from '@/components/AdminNavigation';
import BatchJobsClient from './BatchJobsClient';
import RetailSampleRunPanel from './RetailSampleRunPanel';
import { fetchBatchJobsDashboardServer } from './ApiServerActions';

export default async function BatchJobsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const PAGE_SIZE = 10;
  let summary = {};
  let executions: Awaited<ReturnType<typeof fetchBatchJobsDashboardServer>>['executions'] = [];
  let totalCount = 0;
  let failed: Awaited<ReturnType<typeof fetchBatchJobsDashboardServer>>['failed'] = [];
  let running: Awaited<ReturnType<typeof fetchBatchJobsDashboardServer>>['running'] = [];
  let configured: Awaited<ReturnType<typeof fetchBatchJobsDashboardServer>>['configured'] = [];
  let backendReachable = false;

  try {
    const result = await Promise.race([
      fetchBatchJobsDashboardServer(PAGE_SIZE),
      new Promise<Awaited<ReturnType<typeof fetchBatchJobsDashboardServer>>>((resolve) =>
        setTimeout(() => {
          console.warn('[BatchJobs] Data fetch timeout after 25 seconds');
          resolve({
            summary: {},
            executions: [],
            totalCount: 0,
            failed: [],
            running: [],
            configured: [],
            backendReachable: false,
          });
        }, 25000)
      ),
    ]);
    summary = result.summary;
    executions = result.executions;
    totalCount = result.totalCount;
    failed = result.failed;
    running = result.running;
    configured = result.configured;
    backendReachable = result.backendReachable;
  } catch (error) {
    console.error('[BatchJobsPage] Failed to fetch batch job dashboard:', error);
  }

  return (
    <div className="container mx-auto px-4 py-8" style={{ paddingTop: '180px' }}>
      <AdminNavigation currentPage="admin" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Batch Job Dashboard</h1>
        <div className="bg-gray-50 border-l-4 border-indigo-500 p-4 rounded-r-lg">
          <p className="text-gray-700">
            Monitor scheduled and manual batch job executions: status summary, paginated history,
            running/failed queues, and configured job metadata from{' '}
            <code className="text-sm bg-gray-100 px-1 rounded">/api/admin/batch-jobs</code>.
          </p>
        </div>
      </div>
      <div className="mb-8">
        <RetailSampleRunPanel />
      </div>
      <BatchJobsClient
        initialSummary={summary}
        initialExecutions={executions}
        initialTotalCount={totalCount}
        initialFailed={failed}
        initialRunning={running}
        initialConfigured={configured}
        initialBackendReachable={backendReachable}
        initialPageSize={PAGE_SIZE}
      />
    </div>
  );
}
