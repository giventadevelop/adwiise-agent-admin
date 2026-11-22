'use client';

import React from 'react';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
  className?: string;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  onSort,
  onEdit,
  onDelete,
  onView,
  sortKey,
  sortDirection,
  emptyMessage = 'No data available',
  className = '',
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;

    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  const renderSortIcon = (columnKey: string) => {
    if (!onSort || !columns.find(col => col.key === columnKey)?.sortable) return null;

    if (sortKey === columnKey) {
      return sortDirection === 'asc' ? (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  };

  const actionsColumn = columns.find((column) => String(column.key) === 'actions');
  const dataColumns = columns.filter((column) => String(column.key) !== 'actions');
  const showBuiltInActions = !actionsColumn && Boolean(onEdit || onDelete || onView);
  const showActions = Boolean(actionsColumn || showBuiltInActions);
  const columnCount = dataColumns.length + (showActions ? 1 : 0);
  const stickyHeaderClass =
    'sticky left-0 z-20 bg-gray-50 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.18)]';
  const stickyCellClass =
    'sticky left-0 z-20 bg-white group-hover:bg-gray-50 shadow-[4px_0_8px_-4px_rgba(15,23,42,0.18)]';

  const renderBuiltInActions = (item: T) => (
    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
      {onView && (
        <button
          onClick={() => onView(item)}
          className="flex-shrink-0 w-14 h-14 rounded-xl bg-green-100 hover:bg-green-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
          title="View"
          aria-label="View"
          type="button"
        >
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )}
      {onEdit && (
        <button
          onClick={() => onEdit(item)}
          className="flex-shrink-0 w-14 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
          title="Edit"
          aria-label="Edit"
          type="button"
        >
          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      )}
      {onDelete && (
        <button
          onClick={() => onDelete(item)}
          className="flex-shrink-0 w-14 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-300 hover:scale-110"
          title="Delete"
          aria-label="Delete"
          type="button"
        >
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded-t-lg"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 border-b border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .table-scroll-container {
            overflow-x: scroll !important;
            overflow-y: visible !important;
            scrollbar-width: thin !important;
            scrollbar-color: #EC4899 #FCE7F3 !important;
            -ms-overflow-style: -ms-autohiding-scrollbar !important;
          }
          .table-scroll-container::-webkit-scrollbar {
            height: 20px !important;
            display: block !important;
            -webkit-appearance: none !important;
            appearance: none !important;
          }
          .table-scroll-container::-webkit-scrollbar-track {
            background: linear-gradient(90deg, #DBEAFE, #E9D5FF, #FCE7F3, #FED7AA) !important;
            border-radius: 10px !important;
            -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.15) !important;
            box-shadow: inset 0 0 6px rgba(0,0,0,0.15) !important;
          }
          .table-scroll-container::-webkit-scrollbar-thumb {
            background: linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899, #F97316) !important;
            border-radius: 10px !important;
            border: 4px solid #F3F4F6 !important;
            -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.4) !important;
            box-shadow: inset 0 0 6px rgba(0,0,0,0.4) !important;
            min-width: 50px !important;
            background-clip: padding-box !important;
          }
          .table-scroll-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(90deg, #2563EB, #7C3AED, #DB2777, #EA580C) !important;
            border-color: #E5E7EB !important;
          }
          .table-scroll-container::-webkit-scrollbar-thumb:active {
            background: linear-gradient(90deg, #1D4ED8, #6D28D9, #BE185D, #C2410C) !important;
            border-color: #D1D5DB !important;
          }
          .table-scroll-container::-webkit-scrollbar-button {
            display: none !important;
          }
          .table-scroll-container::-webkit-scrollbar-corner {
            background: #E0E7FF !important;
          }
          .table-scroll-container::after {
            content: '';
            display: block;
            width: 100vw;
            height: 1px;
            flex-shrink: 0;
          }
          .table-scroll-container {
            display: flex !important;
          }
        `
      }} />
      <div className={`rounded-lg shadow-md overflow-hidden ${className}`} style={{
        background: 'linear-gradient(to right, #3B82F6, #8B5CF6, #EC4899, #F97316)',
        padding: '4px'
      }}>
        <div
          className="w-full table-scroll-container"
          style={{
            overflowX: 'scroll',
            overflowY: 'visible',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
            display: 'flex',
            position: 'relative',
            width: '100%',
            minHeight: '1px',
            scrollbarGutter: 'stable',
            background: 'linear-gradient(to right, #3B82F6, #8B5CF6, #EC4899, #F97316)',
            borderRadius: '8px',
            padding: '20px'
          }}
        >
          <table className="divide-y divide-gray-200" style={{
            width: 'max-content',
            minWidth: 'fit-content',
            flexShrink: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '8px',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}>
            <thead className="bg-gray-50">
              <tr>
                {showActions && (
                  <th className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${stickyHeaderClass}`}>
                    {actionsColumn?.label || 'Actions'}
                  </th>
                )}
                {dataColumns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                      } ${column.className || ''}`}
                    style={{ width: column.width }}
                    onClick={() => column.sortable && handleSort(String(column.key))}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {renderSortIcon(String(column.key))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr
                    key={index}
                    className={`group hover:bg-gray-50 ${onView ? 'cursor-pointer' : ''}`}
                    onClick={() => onView && onView(item)}
                  >
                    {showActions && (
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${stickyCellClass}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actionsColumn
                          ? (actionsColumn.render
                            ? actionsColumn.render(item[actionsColumn.key as keyof T], item)
                            : item[actionsColumn.key as keyof T])
                          : renderBuiltInActions(item)}
                      </td>
                    )}
                    {dataColumns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(item[column.key as keyof T], item)
                          : item[column.key as keyof T]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
