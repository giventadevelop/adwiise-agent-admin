import { fetchEventsForMonthServer } from './ApiServerActions';
import CalendarClient from './CalendarClient';

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?:
    | Promise<{ [key: string]: string | string[] | undefined }>
    | { [key: string]: string | string[] | undefined };
}) {
  const resolvedSearchParams =
    searchParams && typeof (searchParams as Promise<unknown>).then === 'function'
      ? await searchParams
      : searchParams;

  const today = new Date();
  let year = today.getFullYear();
  let month = today.getMonth() + 1;

  // Parse date from query params if provided
  const dateParam = typeof resolvedSearchParams?.date === 'string' ? resolvedSearchParams.date : undefined;
  if (dateParam) {
    try {
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        year = date.getFullYear();
        month = date.getMonth() + 1;
      }
    } catch (e) {
      // Invalid date, use today
    }
  }

  const focusGroup = typeof resolvedSearchParams?.focusGroup === 'string' ? resolvedSearchParams?.focusGroup : undefined;
  const initialView = typeof resolvedSearchParams?.view === 'string' ? resolvedSearchParams.view : 'month';
  const initialDate = dateParam ? new Date(dateParam) : today;
  const initialEvents = await fetchEventsForMonthServer(year, month, focusGroup);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50" style={{ paddingTop: '120px' }}>
      <div className="w-full box-border px-4 sm:px-6 lg:px-[4.5rem] py-4 sm:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 text-center sm:text-left">
            Event Calendar
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Browse and explore upcoming events across all months
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <CalendarClient
            initialEvents={initialEvents}
            initialYear={year}
            initialMonth={month}
            focusGroup={focusGroup}
            initialView={initialView as 'month' | 'week' | 'day'}
            initialDate={initialDate}
          />
        </div>
      </div>
    </div>
  );
}


