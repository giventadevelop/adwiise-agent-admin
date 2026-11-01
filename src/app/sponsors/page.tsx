'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { EventSponsorsDTO } from "@/types";
import { getAppUrl } from '@/lib/env';
import { SponsorCard } from '@/components/sponsors/SponsorCard';

export default function SponsorsPage() {
  const [sponsors, setSponsors] = useState<EventSponsorsDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSponsors, setFilteredSponsors] = useState<EventSponsorsDTO[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10; // Standard page size

  // Array of modern background colors - using MOSC warm earth tones
  const cardBackgrounds = [
    'bg-gradient-to-br from-primary/10 to-primary/20',
    'bg-gradient-to-br from-secondary/10 to-secondary/20',
    'bg-gradient-to-br from-accent/10 to-accent/20',
    'bg-gradient-to-br from-muted to-muted/80',
    'bg-gradient-to-br from-background to-muted',
    'bg-gradient-to-br from-primary/5 to-secondary/10',
    'bg-gradient-to-br from-accent/5 to-primary/10',
    'bg-gradient-to-br from-muted/50 to-background',
    'bg-gradient-to-br from-secondary/5 to-muted',
    'bg-gradient-to-br from-primary/15 to-muted/50'
  ];

  const getRandomBackground = (index: number) => {
    return cardBackgrounds[index % cardBackgrounds.length];
  };

  useEffect(() => {
    fetchSponsors();
  }, [currentPage, searchTerm]); // Refetch when page or search changes

  async function fetchSponsors() {
    setLoading(true);
    setFetchError(false);
    try {
      // Fetch sponsors with pagination and search
      const params = new URLSearchParams({
        sort: 'priorityRanking,asc',
        page: (currentPage - 1).toString(), // Convert to 0-based for backend
        size: pageSize.toString(),
        'isActive.equals': 'true'
      });

      // Add search filter if provided
      if (searchTerm.trim()) {
        params.append('name.contains', searchTerm.trim());
      }

      const baseUrl = getAppUrl();
      const response = await fetch(`${baseUrl}/api/proxy/event-sponsors?${params.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const sponsorsList = Array.isArray(data) ? data : [];

        // Get total count from x-total-count header as per UI style guide
        const totalCountHeader = response.headers.get('x-total-count');
        const count = totalCountHeader ? parseInt(totalCountHeader, 10) : sponsorsList.length;
        const pages = Math.ceil(count / pageSize);

        console.log('✅ Fetched sponsors:', {
          page: currentPage,
          count: sponsorsList.length,
          totalCount: count,
          totalPages: pages
        });

        setSponsors(sponsorsList);
        setFilteredSponsors(sponsorsList);
        setTotalCount(count);
        setTotalPages(pages);
      } else {
        console.warn('Failed to fetch sponsors:', response.status);
        setFetchError(true);
      }
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }

  const pendingScrollToTopRef = useRef(false);
  const sawPageFetchRef = useRef(false);

  const scrollPageToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };

  const goToPage = (page: number) => {
    if (page === currentPage) return;
    pendingScrollToTopRef.current = true;
    setCurrentPage(page);
    scrollPageToTop();
  };

  useLayoutEffect(() => {
    if (!pendingScrollToTopRef.current) return;
    if (loading) {
      sawPageFetchRef.current = true;
      return;
    }
    if (!sawPageFetchRef.current) return;
    sawPageFetchRef.current = false;
    pendingScrollToTopRef.current = false;
    scrollPageToTop();
  }, [loading, sponsors]);

  // Pagination handlers
  const handlePrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const handleSearch = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Calculate pagination info
  const hasPrevPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  const startItem = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = (currentPage - 1) * pageSize + filteredSponsors.length;

  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: '100px' }}>
      {/* Header Section - MOSC Styling */}
      <section className="py-16 bg-card sacred-shadow-sm">
        <div className="w-full box-border px-4 sm:px-6 lg:px-[4.5rem]">
          <div className="text-center mb-8">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-primary hover:text-accent reverent-transition mb-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-body">Back to Home</span>
            </Link>
            <h1 className="font-heading font-semibold text-4xl text-foreground mb-4">
              Our Sponsors
            </h1>
            <p className="font-body text-lg text-muted-foreground max-w-3xl mx-auto">
              Meet the organizations that support our community initiatives
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Section - MOSC Styling */}
      <section className="py-16 bg-background">
        <div className="w-full box-border px-4 sm:px-6 lg:px-[4.5rem]">
          {/* Search Bar - MOSC Styling */}
          <div className="mb-12">
            <div className="relative max-w-md mx-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search sponsors..."
                className="block w-full pl-10 pr-3 py-3 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring reverent-transition font-body"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-12">
              <div className="bg-card rounded-lg sacred-shadow p-8 max-w-md mx-auto">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-muted rounded-full">
                  <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="font-heading font-semibold text-xl text-foreground mb-2">Unable to Load Sponsors</h3>
                <p className="font-body text-muted-foreground">Please try refreshing the page or contact us if the problem persists.</p>
              </div>
            </div>
          ) : filteredSponsors.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-card rounded-lg sacred-shadow p-8 max-w-md mx-auto">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-muted rounded-full">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="font-heading font-semibold text-xl text-foreground mb-2">
                  {searchTerm ? 'No Sponsors Found' : 'No Sponsors Available'}
                </h3>
                <p className="font-body text-muted-foreground">
                  {searchTerm
                    ? `No sponsors match "${searchTerm}". Try a different search term.`
                    : 'We\'re currently seeking sponsors for our events. Contact us to learn about sponsorship opportunities!'
                  }
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Results Count - MOSC Styling */}
              <div className="text-center mb-12">
                <p className="font-body text-muted-foreground">
                  {searchTerm
                    ? `Found ${totalCount} sponsor${totalCount !== 1 ? 's' : ''} matching "${searchTerm}"`
                    : `Showing ${totalCount} sponsor${totalCount !== 1 ? 's' : ''}`
                  }
                </p>
              </div>

              {/* Sponsors List - Single column stacked layout */}
              <div className="space-y-8 mb-12">
                {filteredSponsors.map((sponsor, index) => (
                  <SponsorCard
                    key={sponsor.id ?? `${sponsor.name}-${index}`}
                    sponsor={sponsor}
                    backgroundClass={getRandomBackground(index)}
                  />
                ))}
              </div>

              {/* Pagination Controls - Standard Admin Style */}
              <div className="mt-8">
                <div className="flex justify-between items-center">
                  <button
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
                    title="Previous Page"
                    aria-label="Previous Page"
                    type="button"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous</span>
                  </button>

                  {/* Page Info */}
                  <div className="px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                    <span className="text-sm font-bold text-blue-700">
                      Page <span className="text-blue-600">{currentPage}</span> of <span className="text-blue-600">{Math.max(totalPages, 1)}</span>
                    </span>
                  </div>

                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className="px-5 py-2.5 bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold rounded-lg shadow-sm border-2 border-blue-400 hover:border-blue-500 disabled:bg-blue-100 disabled:border-blue-300 disabled:text-blue-500 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-300 hover:scale-105 hover:shadow-md"
                    title="Next Page"
                    aria-label="Next Page"
                    type="button"
                  >
                    <span>Next</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Item Count Text */}
                <div className="text-center mt-3">
                  {totalCount > 0 ? (
                    <div className="inline-flex items-center px-4 py-2 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm">
                      <span className="text-sm text-gray-700">
                        Showing <span className="font-bold text-blue-600">{filteredSponsors.length > 0 ? startItem : 0}</span> to <span className="font-bold text-blue-600">{filteredSponsors.length > 0 ? endItem : 0}</span> of <span className="font-bold text-blue-600">{totalCount}</span> sponsors
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-orange-700">No sponsors found</span>
                      <span className="text-sm text-orange-600">[No sponsors match your criteria]</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
