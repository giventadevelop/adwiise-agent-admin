'use client';

import EventSectionTiles from '@/components/admin/EventSectionTiles';
import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaHome, FaUsers, FaCalendarAlt, FaPhotoVideo, FaTags, FaTicketAlt, FaPercent } from 'react-icons/fa';
import { useAuth } from '@clerk/nextjs';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DataTable, { Column } from '@/components/ui/DataTable';
import Modal, { ConfirmModal } from '@/components/ui/Modal';
import type { EventEmailsDTO, EventDetailsDTO } from '@/types';
import AdminBackButton from '@/components/admin/AdminBackButton';
import AdminTenantIdBanner from '@/components/admin/AdminTenantIdBanner';
import {
  fetchEventEmailsServer,
  createEventEmailServer,
  updateEventEmailServer,
  deleteEventEmailServer,
} from './ApiServerActions';

export default function EventEmailsPage() {
  const { userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  const [event, setEvent] = useState<EventDetailsDTO | null>(null);
  const [emails, setEmails] = useState<EventEmailsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EventEmailsDTO | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<EventEmailsDTO>>({
    email: '',
    event: { id: parseInt(eventId) } as EventDetailsDTO,
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (userId && eventId) {
      loadEventAndEmails();
    }
  }, [userId, eventId]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadEventAndEmails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load event details
      const eventResponse = await fetch(`/api/proxy/event-details/${eventId}`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        setEvent(eventData);
      }

      // Load emails for this event
      const emailsData = await fetchEventEmailsServer(parseInt(eventId));
      setEmails(emailsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load event emails');
      setToastMessage({ type: 'error', message: err.message || 'Failed to load event emails' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      const emailData = { ...formData, event: { id: parseInt(eventId) } as EventDetailsDTO };
      const newEmail = await createEventEmailServer(emailData as any);
      setEmails(prev => [...prev, newEmail]);
      setIsCreateModalOpen(false);
      resetForm();
      setToastMessage({ type: 'success', message: 'Email created successfully' });
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to create email' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedEmail) return;

    try {
      setLoading(true);
      const updatedEmail = await updateEventEmailServer(selectedEmail.id!, formData);
      setEmails(prev => prev.map(e => e.id === selectedEmail.id ? updatedEmail : e));
      setIsEditModalOpen(false);
      setSelectedEmail(null);
      resetForm();
      setToastMessage({ type: 'success', message: 'Email updated successfully' });
    } catch (err: any) {
      setToastMessage({ type: 'error', message: err.message || 'Failed to update email' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmail) {
      console.log('❌ No selected email for deletion');
      return;
    }

    console.log('🗑️ Deleting email:', selectedEmail);

    try {
      setLoading(true);
      console.log('🔄 Calling deleteEventEmailServer with ID:', selectedEmail.id);
      await deleteEventEmailServer(selectedEmail.id!);

      console.log('✅ Email deleted successfully, updating UI');
      setEmails(prev => prev.filter(e => e.id !== selectedEmail.id));
      setIsDeleteModalOpen(false);
      setSelectedEmail(null);
      setToastMessage({ type: 'success', message: 'Email deleted successfully' });
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      setToastMessage({ type: 'error', message: err.message || 'Failed to delete email' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      event: { id: parseInt(eventId) } as EventDetailsDTO,
    });
  };

  const openEditModal = (email: EventEmailsDTO) => {
    setSelectedEmail(email);
    setFormData(email);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (email: EventEmailsDTO) => {
    console.log('🗑️ Opening delete modal for email:', email);
    setSelectedEmail(email);
    setIsDeleteModalOpen(true);
  };

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortKey(key);
    setSortDirection(direction);

    const sorted = [...emails].sort((a, b) => {
      const aVal = a[key as keyof EventEmailsDTO];
      const bVal = b[key as keyof EventEmailsDTO];

      if (direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setEmails(sorted);
  };

  const filteredEmails = emails.filter(email =>
    email.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: Column<EventEmailsDTO>[] = [
    { key: 'email', label: 'Email Address', sortable: true },
  ];

  if (!userId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if (!eventId) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Event ID not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8" style={{ paddingTop: '180px' }}>
      <AdminTenantIdBanner
        tenantId={event?.tenantId}
        contextLine="Event analytics section for this tenant."
      />
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <AdminBackButton href={`/admin/events/${eventId}/edit`} label="Back to Event" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Event Emails
            {event && <span className="text-lg font-normal text-gray-600 ml-2">- {event.title}</span>}
          </h1>
          <p className="text-gray-600">Manage emails for this event</p>
        </div>
      </div>

      {/* Toast Message */}
      {toastMessage && (
        <div className={`mb-4 p-4 rounded-lg ${toastMessage.type === 'success'
          ? 'bg-green-50 border border-green-200 text-green-700'
          : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
          {toastMessage.message}
        </div>
      )}

      <EventSectionTiles eventId={eventId} current="emails" showTickets showDiscounts  />

      {/* Search and Filter Bar */}
      <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow font-bold flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <FaPlus />
            Add Email
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <DataTable
        data={filteredEmails}
        columns={columns}
        loading={loading}
        onSort={handleSort}
        onEdit={openEditModal}
        onDelete={openDeleteModal}
        sortKey={sortKey}
        sortDirection={sortDirection}
        emptyMessage="No emails found for this event"
      />

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add Event Email"
        size="lg"
      >
        <EmailForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          loading={loading}
          submitText="Create Email"
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEmail(null);
          resetForm();
        }}
        title="Edit Event Email"
        size="lg"
      >
        <EmailForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEdit}
          loading={loading}
          submitText="Update Email"
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedEmail(null);
        }}
        onConfirm={handleDelete}
        title="Delete Email"
        message={`Are you sure you want to delete "${selectedEmail?.email || 'this email'}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

// Email Form Component
interface EmailFormProps {
  formData: Partial<EventEmailsDTO>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<EventEmailsDTO>>>;
  onSubmit: () => void;
  loading: boolean;
  submitText: string;
}

function EmailForm({ formData, setFormData, onSubmit, loading, submitText }: EmailFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Address *
        </label>
        <input
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={handleChange}
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter email address"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : submitText}
        </button>
      </div>
    </form>
  );
}
