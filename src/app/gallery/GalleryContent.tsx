'use client';

import { useState, useEffect } from 'react';
import { GalleryEventCard } from './components/GalleryEventCard';
import { GalleryAlbumCard } from './components/GalleryAlbumCard';
import { GalleryTabs } from './components/GalleryTabs';
import { GallerySearch } from './components/GallerySearch';
import { GalleryPagination } from './components/GalleryPagination';
import { fetchEventsForGallery, fetchAlbumsForGallery } from './ApiServerActions';
import type { GalleryPageData, GalleryAlbumWithMedia } from './ApiServerActions';

const ITEMS_PER_PAGE = 20;

type TabType = 'albums' | 'events';

export function GalleryContent() {
  const [activeTab, setActiveTab] = useState<TabType>('albums');
  const [galleryData, setGalleryData] = useState<GalleryPageData | null>(null);
  const [albumsData, setAlbumsData] = useState<{
    albumsWithMedia: GalleryAlbumWithMedia[];
    totalAlbums: number;
    currentPage: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [albumsCount, setAlbumsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [searchFilters, setSearchFilters] = useState({
    searchTerm: '',
    startDate: undefined as string | undefined,
    endDate: undefined as string | undefined,
  });

  // Initial load: Fetch counts to determine default tab and load initial data
  useEffect(() => {
    const determineDefaultTabAndLoad = async () => {
      setLoading(true);
      try {
        // Fetch first page of albums to check if any exist
        const albumsResult = await fetchAlbumsForGallery(0, 1, '', undefined, undefined);
        const albumsTotal = albumsResult.totalAlbums;

        // Fetch first page of events to check if any exist
        const eventsResult = await fetchEventsForGallery(0, 1, '', undefined, undefined);
        const eventsTotal = eventsResult.totalEvents;

        setAlbumsCount(albumsTotal);
        setEventsCount(eventsTotal);

        // Set default tab: albums if they exist, otherwise events
        let defaultTab: TabType = 'albums';
        if (albumsTotal > 0) {
          defaultTab = 'albums';
        } else if (eventsTotal > 0) {
          defaultTab = 'events';
        }

        setActiveTab(defaultTab);
        setInitialLoad(false);

        // Load data for the default tab
        if (defaultTab === 'albums') {
          const albumsData = await fetchAlbumsForGallery(
            0,
            ITEMS_PER_PAGE,
            searchFilters.searchTerm,
            searchFilters.startDate,
            searchFilters.endDate
          );
          setAlbumsData(albumsData);
          setAlbumsCount(albumsData.totalAlbums);
        } else {
          const eventsData = await fetchEventsForGallery(
            0,
            ITEMS_PER_PAGE,
            searchFilters.searchTerm,
            searchFilters.startDate,
            searchFilters.endDate
          );
          setGalleryData(eventsData);
          setEventsCount(eventsData.totalEvents);
        }
      } catch (error) {
        console.error('Failed to determine default tab and load data:', error);
        setInitialLoad(false);
      } finally {
        setLoading(false);
      }
    };

    determineDefaultTabAndLoad();
  }, []); // Only run once on mount

  // Load albums data when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'albums' && !initialLoad) {
      const loadAlbumsData = async () => {
        setLoading(true);
        try {
          const data = await fetchAlbumsForGallery(
            currentPage,
            ITEMS_PER_PAGE,
            searchFilters.searchTerm,
            searchFilters.startDate,
            searchFilters.endDate
          );
          setAlbumsData(data);
          setAlbumsCount(data.totalAlbums);
        } catch (error) {
          console.error('Failed to fetch albums data:', error);
          setAlbumsData(null);
        } finally {
          setLoading(false);
        }
      };
      loadAlbumsData();
    }
  }, [activeTab, currentPage, searchFilters.searchTerm, searchFilters.startDate, searchFilters.endDate, initialLoad]);

  // Load events data when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'events' && !initialLoad) {
      const loadEventsData = async () => {
        setLoading(true);
        try {
          const data = await fetchEventsForGallery(
            currentPage,
            ITEMS_PER_PAGE,
            searchFilters.searchTerm,
            searchFilters.startDate,
            searchFilters.endDate
          );
          setGalleryData(data);
          setEventsCount(data.totalEvents);
        } catch (error) {
          console.error('Failed to fetch events data:', error);
          setGalleryData(null);
        } finally {
          setLoading(false);
        }
      };
      loadEventsData();
    }
  }, [activeTab, currentPage, searchFilters.searchTerm, searchFilters.startDate, searchFilters.endDate, initialLoad]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (filters: {
    searchTerm: string;
    startDate?: string;
    endDate?: string;
  }) => {
    // Always update filters and reset to first page, even if filters appear unchanged
    // This ensures clearing search properly reloads all items
    setSearchFilters({
      searchTerm: filters.searchTerm || '',
      startDate: filters.startDate,
      endDate: filters.endDate,
    });
    setCurrentPage(0); // Reset to first page on new search
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(0); // Reset to first page when switching tabs
  };

  // Loading state
  if (loading && initialLoad) {
    return (
      <div className="space-y-6">
        <GalleryTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          albumsCount={albumsCount}
          eventsCount={eventsCount}
          loading={true}
        />
        <GallerySearch onSearch={handleSearch} loading={loading} />

        {/* Grid Container with Bold Dark Gradient Background - Matching events page style */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 border border-white/10 shadow-2xl mb-8">
          {/* Bold Dark Radial Gradient Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 55%)' }} />

          {/* Grid Content */}
          <div className="relative px-6 py-10 sm:px-10 lg:px-14">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Always show pagination controls, even when loading */}
        <GalleryPagination
          currentPage={currentPage}
          totalPages={1}
          totalCount={0}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
          loading={loading}
        />
      </div>
    );
  }

  // Albums tab content
  if (activeTab === 'albums') {
    const hasFilters = searchFilters.searchTerm || searchFilters.startDate || searchFilters.endDate;
    const hasAlbums = albumsData && albumsData.albumsWithMedia && albumsData.albumsWithMedia.length > 0;

    if (!hasAlbums && !loading) {
      return (
        <div className="space-y-6">
          <GalleryTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
            albumsCount={albumsCount}
            eventsCount={eventsCount}
            loading={loading}
          />
          <GallerySearch onSearch={handleSearch} loading={loading} />
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {hasFilters ? 'No albums found' : 'No albums available'}
            </h3>
            <p className="text-gray-600">
              {hasFilters
                ? 'No albums match your search criteria. Try adjusting your filters.'
                : 'Check back later for album photos and videos'
              }
            </p>
            {hasFilters && (
              <button
                onClick={() => handleSearch({ searchTerm: '', startDate: undefined, endDate: undefined })}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Always show pagination controls, even when no results */}
          <GalleryPagination
            currentPage={currentPage}
            totalPages={albumsData?.totalPages || 1}
            totalCount={albumsData?.totalAlbums || 0}
            pageSize={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <GalleryTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          albumsCount={albumsCount}
          eventsCount={eventsCount}
          loading={loading}
        />
        <GallerySearch onSearch={handleSearch} loading={loading} />

        {/* Grid Container with Bold Dark Gradient Background - Matching events page style */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 border border-white/10 shadow-2xl mb-8">
          {/* Bold Dark Radial Gradient Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 55%)' }} />

          {/* Grid Content */}
          <div className="relative px-6 py-10 sm:px-10 lg:px-14">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                    <div className="h-48 bg-gray-200"></div>
                    <div className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {albumsData?.albumsWithMedia?.map((albumWithMedia) => (
                  <GalleryAlbumCard
                    key={albumWithMedia.album.id}
                    albumWithMedia={albumWithMedia}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <GalleryPagination
          currentPage={currentPage}
          totalPages={albumsData?.totalPages || 1}
          totalCount={albumsData?.totalAlbums || 0}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
          loading={loading}
          itemType="albums"
        />
      </div>
    );
  }

  // Events tab content
  const hasFilters = searchFilters.searchTerm || searchFilters.startDate || searchFilters.endDate;
  const hasEvents = galleryData && galleryData.eventsWithMedia && galleryData.eventsWithMedia.length > 0;

  if (!hasEvents && !loading) {
    return (
      <div className="space-y-6">
        <GalleryTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
          albumsCount={albumsCount}
          eventsCount={eventsCount}
          loading={loading}
        />
        <GallerySearch onSearch={handleSearch} loading={loading} />
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📸</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {hasFilters ? 'No events found' : 'No events available'}
          </h3>
          <p className="text-gray-600">
            {hasFilters
              ? 'No events match your search criteria. Try adjusting your filters.'
              : 'Check back later for event photos and videos'
            }
          </p>
          {hasFilters && (
            <button
              onClick={() => handleSearch({ searchTerm: '', startDate: undefined, endDate: undefined })}
              className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Always show pagination controls, even when no results */}
        <GalleryPagination
          currentPage={currentPage}
          totalPages={galleryData?.totalPages || 1}
          totalCount={galleryData?.totalEvents || 0}
          pageSize={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
          loading={loading}
        />
      </div>
    );
  }

  const { eventsWithMedia, totalEvents, totalPages } = galleryData || { eventsWithMedia: [], totalEvents: 0, totalPages: 0 };

  return (
    <div className="space-y-6">
      <GalleryTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        albumsCount={albumsCount}
        eventsCount={eventsCount}
        loading={loading}
      />
      <GallerySearch onSearch={handleSearch} loading={loading} />

      {/* Grid Container with Bold Dark Gradient Background - Matching events page style */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 border border-white/10 shadow-2xl mb-8">
        {/* Bold Dark Radial Gradient Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-70" style={{ backgroundImage: 'radial-gradient(circle at top left, rgba(255,255,255,0.18), transparent 55%)' }} />

        {/* Grid Content */}
        <div className="relative px-6 py-10 sm:px-10 lg:px-14">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventsWithMedia?.map((eventWithMedia) => (
                <GalleryEventCard
                  key={eventWithMedia.event.id}
                  eventWithMedia={eventWithMedia}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <GalleryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalEvents}
        pageSize={ITEMS_PER_PAGE}
        onPageChange={handlePageChange}
        loading={loading}
      />
    </div>
  );
}
