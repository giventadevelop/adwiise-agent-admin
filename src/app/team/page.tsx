'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { ExecutiveCommitteeTeamMemberDTO } from '@/types';
import { getAppUrl } from '@/lib/env';
import styles from '@/components/TeamSection.module.css';

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<ExecutiveCommitteeTeamMemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImages, setShowImages] = useState(false);
  const [page, setPage] = useState(0); // 0-based for calculations
  const pageSize = 9; // Display 9 team members per page

  // Cache key for sessionStorage
  const CACHE_KEY = 'team_page_cache';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    // Fetch team members when component mounts
    const loadTeamMembers = async () => {
      // Check cache first
      try {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            console.log('✅ Using cached team data');
            setTeamMembers(data);
            setLoading(false);
            setShowImages(true);
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to read team cache:', error);
      }

      try {
        const baseUrl = getAppUrl();
        const response = await fetch(
          `${baseUrl}/api/proxy/executive-committee-team-members?isActive.equals=true&sort=priorityOrder,asc`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          }
        );

        if (!response.ok) {
          console.log('Backend unavailable - team members not loaded:', response.statusText);
          setTeamMembers([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        const teamMembersList = Array.isArray(data) ? data : [];

        // Cache the data
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({
            data: teamMembersList,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.warn('Failed to cache team data:', error);
        }

        setTeamMembers(teamMembersList);
        setLoading(false);
        setShowImages(true);
      } catch (error) {
        console.log('Backend connection error - team members not loaded:', error);
        setTeamMembers([]);
        setLoading(false);
      }
    };

    loadTeamMembers();
  }, []);

  // Helper function to get full name
  const getFullName = (member: ExecutiveCommitteeTeamMemberDTO) => {
    return `${member.firstName} ${member.lastName}`.trim();
  };

  // Helper function to parse expertise string into array
  const parseExpertise = (expertise?: string): string[] => {
    if (!expertise) return [];

    try {
      // Try to parse as JSON first (API returns JSON string)
      const parsed = JSON.parse(expertise);
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean);
      }
    } catch (e) {
      // If JSON parsing fails, fall back to comma-separated parsing
      return expertise.split(',').map(item => item.trim()).filter(Boolean);
    }

    return [];
  };

  // Helper function to get default profile image
  const getDefaultProfileImage = (member: ExecutiveCommitteeTeamMemberDTO) => {
    if (member.profileImageUrl) return member.profileImageUrl;
    return '/images/user_profile_loading.webp';
  };

  // Pagination calculations
  const totalCount = teamMembers.length;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const currentPage = page + 1; // Display as 1-based
  const startItem = totalCount > 0 ? page * pageSize + 1 : 0;
  const endItem = totalCount > 0 ? Math.min(page * pageSize + pageSize, totalCount) : 0;
  const isPrevDisabled = page === 0 || loading;
  const isNextDisabled = page >= totalPages - 1 || loading;

  // Get paginated team members
  const paginatedTeamMembers = teamMembers.slice(page * pageSize, page * pageSize + pageSize);

  // Reset page if it becomes invalid after data changes
  useEffect(() => {
    if (totalPages > 0 && page >= totalPages) {
      setPage(0);
    }
  }, [totalPages, page]);

  const handlePrevPage = () => {
    if (!isPrevDisabled) {
      setPage((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNextPage = () => {
    if (!isNextDisabled) {
      setPage((prev) => Math.min(totalPages - 1, prev + 1));
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ paddingTop: '100px' }}>
      {/* Header Section */}
      <section className="py-16 bg-card sacred-shadow-sm">
        <div className="w-full box-border px-4 sm:px-6 lg:px-[4.5rem]">
          {/* Header with back button - left aligned */}
          <div className="flex items-center mb-8 gap-4">
            <Link
              href="/"
              className="flex-shrink-0 h-14 rounded-xl bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-3 sm:px-6"
              title="Back to Home"
              aria-label="Back to Home"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </div>
              <span className="font-semibold text-indigo-700 hidden sm:inline">Back to Home</span>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Our Team</h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Meet the dedicated professionals working together to make a positive impact in our communities
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-24 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full box-border px-4 sm:px-6 lg:px-[4.5rem]">
          {loading ? (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Team Members Information Temporarily Unavailable</h3>
                <p className="text-gray-500">We're currently updating our team members information. Please check back later.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Dynamic Team Grid */}
              <div className={`${styles.teamGrid} gap-8 lg:gap-10`}>
                {paginatedTeamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className={`${styles.teamCard} group relative rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 ease-out hover:-translate-y-3`}
                    style={{
                      animationDelay: `${index * 150}ms`,
                    }}
                  >
                    {/* Large Photo Section */}
                    <div className="relative h-[400px] lg:h-[450px] overflow-hidden p-4">
                      <div className="relative w-full h-full rounded-xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 to-transparent z-10"></div>

                        {showImages ? (
                          <Image
                            src={getDefaultProfileImage(member)}
                            alt={getFullName(member)}
                            fill
                            className="object-cover object-top group-hover:scale-105 transition-transform duration-700 ease-out"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            style={{
                              objectPosition: 'center top'
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/user_profile_loading.webp';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/5 rounded-xl"></div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className={`${styles.cardContent} flex flex-col`}>
                      {/* Name and Title */}
                      <div className="mb-6">
                        <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                          {getFullName(member)}
                        </h3>
                        <p className="text-base font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full inline-block">
                          {member.title}
                        </p>
                        {member.designation && (
                          <p className="text-sm text-gray-500 mt-2">{member.designation}</p>
                        )}
                      </div>

                      {/* Bio Description */}
                      {member.bio && (
                        <p className="text-gray-600 leading-relaxed mb-6 text-sm lg:text-base">
                          {member.bio}
                        </p>
                      )}

                      {/* Expertise Tags */}
                      {member.expertise && parseExpertise(member.expertise).length > 0 && (
                        <div className="mb-6">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                            Expertise
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {parseExpertise(member.expertise).map((skill, skillIndex) => (
                              <span
                                key={skillIndex}
                                className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium hover:bg-gray-200 transition-colors duration-200"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Info */}
                      <div className="pt-4 border-t border-gray-100 mt-auto">
                        {member.email && (
                          <a
                            href={`mailto:${member.email}`}
                            className="text-sm text-gray-500 hover:text-blue-600 transition-colors duration-200 flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>{member.email}</span>
                          </a>
                        )}

                        {/* Social Links */}
                        <div className="flex space-x-3 mt-3">
                          {member.linkedinUrl && (
                            <a
                              href={member.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-600 transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.047-1.852-3.047-1.853 0-2.136 1.445-2.136 2.939v5.677H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                              </svg>
                            </a>
                          )}
                          {member.twitterUrl && (
                            <a
                              href={member.twitterUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-blue-400 transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.665 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.427 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                              </svg>
                            </a>
                          )}
                          {member.websiteUrl && (
                            <a
                              href={member.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-purple-600 transition-colors duration-200"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls - Always visible, matching admin page style */}
              {totalCount > 0 && (
                <div className="mt-8">
                  <div className="flex justify-between items-center">
                    {/* Previous Button */}
                    <button
                      onClick={handlePrevPage}
                      disabled={isPrevDisabled}
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
                        Page <span className="text-blue-600">{currentPage}</span> of <span className="text-blue-600">{totalPages}</span>
                      </span>
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={handleNextPage}
                      disabled={isNextDisabled}
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
                          Showing <span className="font-bold text-blue-600">{startItem}</span> to <span className="font-bold text-blue-600">{endItem}</span> of <span className="font-bold text-blue-600">{totalCount}</span> team members
                        </span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-sm">
                        <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-orange-700">No team members found</span>
                        <span className="text-sm text-orange-600">[No team members match your criteria]</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stats Section */}
              <div className="mt-32 text-center">
                <div className="relative">
                  <div className="text-6xl md:text-8xl lg:text-9xl font-bold leading-none tracking-tighter mb-6 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                    {teamMembers.length}+
                  </div>
                  <div className="absolute inset-0 text-6xl md:text-8xl lg:text-9xl font-bold leading-none tracking-tighter opacity-10 blur-sm bg-gradient-to-br from-cyan-400 to-purple-600 bg-clip-text text-transparent">
                    {teamMembers.length}+
                  </div>
                </div>
                <h3 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-3">
                  Dedicated team members
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Building stronger communities through dedication, innovation, and collaborative leadership.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
