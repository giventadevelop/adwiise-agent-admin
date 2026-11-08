'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminBackButton from '@/components/admin/AdminBackButton';
import {
  deleteSchoolRecordServer,
  fetchSchoolRecordsServer,
  saveSchoolRecordServer,
} from './ApiServerActions';
import type { SchoolRecord } from '@/types/school';

type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'money';

type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: { value: string; label: string }[];
};

type TabDef = {
  key: string;
  label: string;
  resource: string;
  sort: string;
  titleField: string;
  groupBy?: string[];
  fields: FieldDef[];
  blank: SchoolRecord;
};

const STAFF_CATEGORY = [
  { value: 'ADMINISTRATION', label: 'Administration' },
  { value: 'TEACHING', label: 'Teaching' },
  { value: 'SUPPORTING', label: 'Supporting' },
];

const STAFF_STAGE = [
  { value: 'ALL', label: 'All stages' },
  { value: 'KG', label: 'KG' },
  { value: 'LP', label: 'LP' },
  { value: 'UP', label: 'UP' },
  { value: 'HS', label: 'HS' },
  { value: 'HSS', label: 'HSS' },
];

const TABS: TabDef[] = [
  {
    key: 'staff',
    label: 'Staff',
    resource: 'school-staff-members',
    sort: 'priorityOrder,asc',
    titleField: 'firstName',
    groupBy: ['staffCategory', 'stage'],
    blank: { staffCategory: 'TEACHING', stage: 'ALL', isActive: true, priorityOrder: 0 },
    fields: [
      { name: 'staffCategory', label: 'Category', kind: 'select', required: true, options: STAFF_CATEGORY },
      { name: 'stage', label: 'Stage', kind: 'select', required: true, options: STAFF_STAGE },
      { name: 'firstName', label: 'First name', kind: 'text', required: true },
      { name: 'lastName', label: 'Last name', kind: 'text', required: true },
      { name: 'designation', label: 'Designation', kind: 'text' },
      { name: 'qualification', label: 'Qualification', kind: 'text' },
      { name: 'subjectName', label: 'Subject', kind: 'text' },
      { name: 'classTeacherOf', label: 'Class teacher of', kind: 'text' },
      { name: 'departmentId', label: 'Department id', kind: 'number' },
      { name: 'email', label: 'Email', kind: 'text' },
      { name: 'phone', label: 'Phone', kind: 'text' },
      { name: 'profileImageUrl', label: 'Profile image URL', kind: 'text' },
      { name: 'bio', label: 'Bio', kind: 'textarea' },
      { name: 'priorityOrder', label: 'Priority order', kind: 'number' },
      { name: 'isActive', label: 'Active', kind: 'checkbox' },
    ],
  },
  {
    key: 'departments',
    label: 'Departments',
    resource: 'school-departments',
    sort: 'sortOrder,asc',
    titleField: 'name',
    blank: { isActive: true, sortOrder: 0 },
    fields: [
      { name: 'name', label: 'Name', kind: 'text', required: true },
      { name: 'slug', label: 'Slug', kind: 'text', required: true },
      { name: 'summary', label: 'Summary', kind: 'textarea' },
      { name: 'body', label: 'Body', kind: 'textarea' },
      { name: 'imageUrl', label: 'Image URL', kind: 'text' },
      { name: 'headStaffId', label: 'Head staff id', kind: 'number' },
      { name: 'sortOrder', label: 'Sort order', kind: 'number' },
      { name: 'isActive', label: 'Active', kind: 'checkbox' },
    ],
  },
  {
    key: 'facilities',
    label: 'Facilities',
    resource: 'school-facilities',
    sort: 'sortOrder,asc',
    titleField: 'name',
    blank: { isActive: true, sortOrder: 0 },
    fields: [
      { name: 'name', label: 'Name', kind: 'text', required: true },
      { name: 'slug', label: 'Slug', kind: 'text', required: true },
      { name: 'summary', label: 'Summary', kind: 'textarea' },
      { name: 'body', label: 'Body', kind: 'textarea' },
      { name: 'imageUrl', label: 'Image URL', kind: 'text' },
      { name: 'sortOrder', label: 'Sort order', kind: 'number' },
      { name: 'isActive', label: 'Active', kind: 'checkbox' },
    ],
  },
  {
    key: 'activities',
    label: 'Activities',
    resource: 'school-activities',
    sort: 'sortOrder,asc',
    titleField: 'name',
    blank: { activityKind: 'CLUB', isActive: true, sortOrder: 0 },
    fields: [
      {
        name: 'activityKind',
        label: 'Kind',
        kind: 'select',
        required: true,
        options: [
          { value: 'CLUB', label: 'Club' },
          { value: 'SPORT', label: 'Sport' },
          { value: 'PROGRAM', label: 'Program' },
        ],
      },
      { name: 'name', label: 'Name', kind: 'text', required: true },
      { name: 'slug', label: 'Slug', kind: 'text', required: true },
      { name: 'summary', label: 'Summary', kind: 'textarea' },
      { name: 'body', label: 'Body', kind: 'textarea' },
      { name: 'imageUrl', label: 'Image URL', kind: 'text' },
      { name: 'sortOrder', label: 'Sort order', kind: 'number' },
      { name: 'isActive', label: 'Active', kind: 'checkbox' },
    ],
  },
  {
    key: 'pages',
    label: 'Pages',
    resource: 'school-pages',
    sort: 'sortOrder,asc',
    titleField: 'title',
    blank: { isActive: true, sortOrder: 0, slug: 'principals-message' },
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true },
      { name: 'slug', label: 'Slug', kind: 'text', required: true },
      { name: 'summary', label: 'Summary', kind: 'textarea' },
      { name: 'body', label: 'Body', kind: 'textarea' },
      { name: 'imageUrl', label: 'Image URL', kind: 'text' },
      { name: 'sortOrder', label: 'Sort order', kind: 'number' },
      { name: 'isActive', label: 'Active', kind: 'checkbox' },
    ],
  },
  {
    key: 'highlights',
    label: 'Highlights',
    resource: 'school-highlights',
    sort: 'sortOrder,asc',
    titleField: 'personName',
    blank: { isActive: true, sortOrder: 0 },
    fields: [
      { name: 'personName', label: 'Person name', kind: 'text', required: true },
      { name: 'subtitle', label: 'Subtitle', kind: 'text' },
      { name: 'academicYear', label: 'Academic year', kind: 'text' },
      { name: 'imageUrl', label: 'Image URL', kind: 'text' },
      { name: 'sortOrder', label: 'Sort order', kind: 'number' },
      { name: 'isActive', label: 'Active', kind: 'checkbox' },
    ],
  },
  {
    key: 'fees',
    label: 'Fee invoices',
    resource: 'school-fee-invoices',
    sort: 'id,desc',
    titleField: 'title',
    blank: { feeKind: 'TUITION', status: 'DRAFT', currency: 'INR', amountDue: 0 },
    fields: [
      { name: 'title', label: 'Title', kind: 'text', required: true },
      { name: 'academicYear', label: 'Academic year', kind: 'text' },
      {
        name: 'feeKind',
        label: 'Fee kind',
        kind: 'select',
        required: true,
        options: [
          { value: 'ADMISSION', label: 'Admission' },
          { value: 'TUITION', label: 'Tuition' },
          { value: 'TRANSPORT', label: 'Transport' },
          { value: 'OTHER', label: 'Other' },
        ],
      },
      { name: 'studentName', label: 'Student name', kind: 'text' },
      { name: 'classLabel', label: 'Class', kind: 'text' },
      { name: 'payerName', label: 'Payer name', kind: 'text' },
      { name: 'payerEmail', label: 'Payer email', kind: 'text' },
      { name: 'payerPhone', label: 'Payer phone', kind: 'text' },
      { name: 'amountDue', label: 'Amount due', kind: 'money', required: true },
      { name: 'currency', label: 'Currency', kind: 'text', required: true },
      { name: 'dueDate', label: 'Due date', kind: 'date' },
      {
        name: 'status',
        label: 'Status',
        kind: 'select',
        required: true,
        options: [
          { value: 'DRAFT', label: 'Draft' },
          { value: 'OPEN', label: 'Open' },
          { value: 'PAID', label: 'Paid' },
          { value: 'VOID', label: 'Void' },
        ],
      },
    ],
  },
];

const PAGE_SIZE = 20;

function formatMoney(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function rowTitle(row: SchoolRecord, tab: TabDef): string {
  const record = row as Record<string, unknown>;
  if (tab.key === 'staff') {
    return `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Staff member';
  }
  const value = record[tab.titleField];
  return typeof value === 'string' && value.trim() ? value : `#${record.id ?? ''}`;
}

export default function SchoolAdminClient() {
  const [tabKey, setTabKey] = useState(TABS[0].key);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<SchoolRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<SchoolRecord | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [moneyDisplay, setMoneyDisplay] = useState('');

  const tab = TABS.find((item) => item.key === tabKey) || TABS[0];
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchSchoolRecordsServer(tab.resource, page, PAGE_SIZE, tab.sort);
      setRows(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      setRows([]);
      setTotalCount(0);
      setError(err instanceof Error ? err.message : 'Could not load records');
    } finally {
      setLoading(false);
    }
  }, [page, tab.resource, tab.sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!tab.groupBy) return [{ label: '', rows }];
    const buckets = new Map<string, SchoolRecord[]>();
    for (const row of rows) {
      const record = row as Record<string, unknown>;
      const label = tab.groupBy.map((key) => String(record[key] || 'ALL')).join(' / ');
      const list = buckets.get(label) || [];
      list.push(row);
      buckets.set(label, list);
    }
    return Array.from(buckets.entries()).map(([label, groupRows]) => ({ label, rows: groupRows }));
  }, [rows, tab.groupBy]);

  function openNew() {
    setFieldErrors({});
    setEditing({ ...tab.blank });
    const amount = (tab.blank as { amountDue?: number }).amountDue;
    setMoneyDisplay(typeof amount === 'number' ? amount.toFixed(2) : '');
  }

  function openEdit(row: SchoolRecord) {
    setFieldErrors({});
    setEditing({ ...row });
    const amount = (row as { amountDue?: number }).amountDue;
    setMoneyDisplay(typeof amount === 'number' ? amount.toFixed(2) : '');
  }

  function validate(draft: SchoolRecord): Record<string, string> {
    const errors: Record<string, string> = {};
    const record = draft as Record<string, unknown>;
    for (const field of tab.fields) {
      if (!field.required) continue;
      const value = record[field.name];
      if (field.kind === 'money' || field.kind === 'number') {
        if (value === undefined || value === null || value === '' || Number.isNaN(Number(value))) {
          errors[field.name] = `${field.label} is required`;
        }
        continue;
      }
      if (typeof value !== 'string' || value.trim() === '') {
        errors[field.name] = `${field.label} is required`;
      }
    }
    return errors;
  }

  async function onSave() {
    if (!editing) return;
    const errors = validate(editing);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setError('');
    try {
      await saveSchoolRecordServer(tab.resource, editing);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(row: SchoolRecord) {
    if (!row.id) return;
    if (!window.confirm('Delete this record?')) return;
    setError('');
    try {
      await deleteSchoolRecordServer(tab.resource, row.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function updateField(name: string, value: unknown) {
    setEditing((current) => (current ? { ...current, [name]: value } : current));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <AdminBackButton href="/admin" label="Back to Admin" />
        <h1 className="font-heading text-3xl text-foreground">School site</h1>
      </div>
      <p className="text-sm text-gray-600 mb-6">
        Staff, departments, facilities, activities, pages, merit highlights, and fee invoices for a school tenant.
        Lower priority or sort numbers appear first.
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTabKey(item.key);
              setPage(0);
              setEditing(null);
            }}
            className={`px-4 py-2 rounded-lg font-semibold ${
              item.key === tab.key ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={openNew}
        className="mb-6 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 px-6 transition-all duration-300 hover:scale-105"
      >
        <span className="font-semibold text-blue-700">Add {tab.label.replace(/s$/, '')}</span>
      </button>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {loading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        grouped.map((group) => (
          <section key={group.label || 'all'} className="mb-8">
            {group.label && <h2 className="text-lg font-semibold text-gray-800 mb-3">{group.label}</h2>}
            <div className="grid gap-3">
              {group.rows.map((row) => {
                const record = row as Record<string, unknown>;
                const amount = typeof record.amountDue === 'number' ? record.amountDue : null;
                return (
                  <div key={String(row.id)} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{rowTitle(row, tab)}</p>
                      {amount != null && (
                        <p className="text-sm text-gray-600">{formatMoney(amount, String(record.currency || 'INR'))}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEdit(row)} className="px-3 py-2 rounded-lg bg-blue-100 text-blue-700 font-semibold" title="Edit" aria-label="Edit">
                        Edit
                      </button>
                      <button type="button" onClick={() => void onDelete(row)} className="px-3 py-2 rounded-lg bg-red-100 text-red-700 font-semibold" title="Delete" aria-label="Delete">
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {group.rows.length === 0 && <p className="text-gray-500">No records on this page.</p>}
            </div>
          </section>
        ))
      )}
      <div className="mt-8">
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0 || loading}
            className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed"
            title="Previous Page"
            aria-label="Previous Page"
          >
            Previous
          </button>
          <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm text-sm font-bold text-blue-700">
            Page <span className="text-blue-600">{page + 1}</span> of <span className="text-blue-600">{totalPages}</span>
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= totalPages - 1 || loading}
            className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed"
            title="Next Page"
            aria-label="Next Page"
          >
            Next
          </button>
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-6">
          <form
            className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void onSave();
            }}
          >
            <h2 className="text-xl font-semibold">{editing.id ? 'Edit' : 'Add'} {tab.label}</h2>
            {tab.fields.map((field) => {
              const record = editing as Record<string, unknown>;
              const value = record[field.name];
              const inputClass = `mt-1 block w-full border rounded-xl px-4 py-3 text-base ${
                fieldErrors[field.name] ? 'border-red-500 focus:border-red-500' : 'border-gray-400 focus:border-blue-500'
              }`;
              return (
                <label key={field.name} className="block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.kind === 'textarea' && (
                    <textarea
                      className={inputClass}
                      rows={4}
                      value={typeof value === 'string' ? value : ''}
                      onChange={(event) => updateField(field.name, event.target.value)}
                    />
                  )}
                  {field.kind === 'select' && (
                    <select className={inputClass} value={typeof value === 'string' ? value : ''} onChange={(event) => updateField(field.name, event.target.value)}>
                      {(field.options || []).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  )}
                  {field.kind === 'checkbox' && (
                    <input
                      type="checkbox"
                      className="ml-2"
                      checked={value !== false}
                      onChange={(event) => updateField(field.name, event.target.checked)}
                    />
                  )}
                  {(field.kind === 'text' || field.kind === 'date' || field.kind === 'number') && (
                    <input
                      className={inputClass}
                      type={field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text'}
                      value={value == null ? '' : String(value)}
                      onChange={(event) => {
                        if (field.kind === 'number') {
                          const next = event.target.value === '' ? null : Number(event.target.value);
                          updateField(field.name, next);
                          return;
                        }
                        updateField(field.name, event.target.value);
                      }}
                    />
                  )}
                  {field.kind === 'money' && (
                    <input
                      className={inputClass}
                      inputMode="decimal"
                      value={moneyDisplay}
                      placeholder="0.00"
                      onChange={(event) => {
                        let next = event.target.value;
                        if (next.startsWith('.')) next = `0${next}`;
                        setMoneyDisplay(next);
                        const numeric = next === '' || next === '.' ? 0 : Number.parseFloat(next);
                        updateField(field.name, Number.isNaN(numeric) ? 0 : numeric);
                      }}
                      onBlur={() => {
                        const numeric = Number.parseFloat(moneyDisplay) || 0;
                        setMoneyDisplay(numeric.toFixed(2));
                        updateField(field.name, numeric);
                      }}
                    />
                  )}
                  {fieldErrors[field.name] && <span className="text-red-500 text-sm mt-1 block">{fieldErrors[field.name]}</span>}
                </label>
              );
            })}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 h-14 rounded-xl bg-blue-100 text-blue-700 font-semibold">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 h-14 rounded-xl bg-green-100 text-green-700 font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
