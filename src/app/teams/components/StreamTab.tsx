'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/app/contexts/ThemeContext';
import { toast } from 'react-toastify';

// Import stream components
import ActiveTimers from './stream/ActiveTimers';
import TimerManager from './stream/TimerManager';
import PostCreator from './stream/PostCreator';
import StreamPosts from './stream/StreamPosts';
import {
  Event,
  Team
} from './stream/streamTypes';
import { useTeamStore } from '@/app/hooks/useTeamStore';

interface StreamTabProps {
  team: Team;
  isCaptain: boolean;
  activeSubteamId?: string | null;
}

export default function StreamTab({ team, isCaptain, activeSubteamId }: StreamTabProps) {
  const { darkMode } = useTheme();
  const { 
    getStream, 
    getTournaments, 
    getTimers, 
    loadStreamData,
    loadTimers
  } = useTeamStore();
  const [posting, setPosting] = useState(false);
  
  // Post creation state
  const [newPostContent, setNewPostContent] = useState('');
  
  // Event type filter state
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>(['tournament']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Comments state
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  // Load stream data using combined endpoint
  const loadData = useCallback(async () => {
    if (!activeSubteamId) return;

    try {
      await loadStreamData(team.slug, activeSubteamId);
    } catch (error) {
      console.error('Error loading stream data:', error);
      toast.error('Failed to load stream data');
    }
  }, [team.slug, activeSubteamId, loadStreamData]);

  // Create a new post
  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !activeSubteamId) return;

    setPosting(true);
    try {
      const response = await fetch(`/api/teams/${team.slug}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subteamId: activeSubteamId,
          content: newPostContent.trim(),
          showTournamentTimer: false,
          tournamentId: null,
          attachmentUrl: null,
          attachmentTitle: null
        })
      });

      if (response.ok) {
        setNewPostContent('');
        await loadData(); // Reload posts
        toast.success('Post created successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
    setPosting(false);
  };

  // Add an event timer
  const handleAddTimer = async (event: Event) => {
    if (activeTimers.some(t => t.id === event.id)) return; // Already added
    
    try {
      const response = await fetch(`/api/teams/${team.slug}/timers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subteamId: activeSubteamId,
          eventId: event.id
        })
      });

      if (response.ok) {
        // Reload timers to get updated data
        if (activeSubteamId) {
          await loadTimers(team.slug, activeSubteamId);
        }
        toast.success(`Added timer for ${event.title}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add timer');
      }
    } catch (error) {
      console.error('Error adding timer:', error);
      toast.error('Failed to add timer');
    }
  };

  // Remove an event timer
  const handleRemoveTimer = async (eventId: string) => {
    try {
      const response = await fetch(`/api/teams/${team.slug}/timers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subteamId: activeSubteamId,
          eventId: eventId
        })
      });

      if (response.ok) {
        // Reload timers to get updated data
        if (activeSubteamId) {
          await loadTimers(team.slug, activeSubteamId);
        }
        toast.success('Timer removed');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove timer');
      }
    } catch (error) {
      console.error('Error removing timer:', error);
      toast.error('Failed to remove timer');
    }
  };

  // Handle event type filter change
  const handleEventTypeFilterChange = (eventTypes: string[]) => {
    setSelectedEventTypes(eventTypes);
  };

  // Toggle comments visibility
  const toggleComments = (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedComments(newExpanded);
  };

  // Add a comment
  const handleAddComment = async (postId: string) => {
    const commentContent = newComments[postId];
    if (!commentContent?.trim()) return;

    try {
      const response = await fetch(`/api/teams/${team.slug}/stream/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: commentContent.trim()
        })
      });

      if (response.ok) {
        setNewComments(prev => ({ ...prev, [postId]: '' }));
        await loadData(); // Reload posts to get updated comments
        toast.success('Comment added');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  // Load data when subteam changes
  useEffect(() => {
    if (activeSubteamId) {
      loadData();
    }
  }, [loadData, activeSubteamId]);

  // Timer updates are now handled by background refresh in the enhanced hook

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isDropdownOpen) {
        const target = event.target as Element;
        if (!target.closest('.dropdown-container')) {
          setIsDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Get data from store and transform to expected types
  const rawPosts = activeSubteamId ? getStream(team.slug, activeSubteamId) : [];
  const rawTournaments = activeSubteamId ? getTournaments(team.slug, activeSubteamId) : [];
  const rawTimers = activeSubteamId ? getTimers(team.slug, activeSubteamId) : [];

  // Transform posts to match StreamPost interface
  const posts = rawPosts.map(post => ({
    id: post.id,
    content: post.content,
    show_tournament_timer: false,
    tournament_id: null,
    tournament_title: null,
    tournament_start_time: null,
    author_name: post.author,
    author_email: '',
    created_at: post.created_at,
    attachment_url: null,
    attachment_title: null,
    comments: []
  }));

  // Transform tournaments to match Event interface
  const events = rawTournaments.map(tournament => ({
    id: tournament.id,
    title: tournament.name,
    start_time: tournament.date,
    location: tournament.location,
    event_type: 'tournament' as const,
    has_timer: false
  }));

  // Transform timers to match Event interface
  const activeTimers = rawTimers.map(timer => ({
    id: timer.id,
    title: timer.event_title,
    start_time: timer.start_time,
    location: null,
    event_type: 'tournament' as const,
    has_timer: true
  }));

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Team Stream
        </h2>

        {/* Active Event Timers */}
        <ActiveTimers
          darkMode={darkMode}
          activeTimers={activeTimers}
          onRemoveTimer={handleRemoveTimer}
        />

        {/* Add Timers - Captain Only */}
        {isCaptain && (
          <TimerManager
            darkMode={darkMode}
            events={events}
            selectedEventTypes={selectedEventTypes}
            onAddTimer={handleAddTimer}
            isDropdownOpen={isDropdownOpen}
            onToggleDropdown={() => setIsDropdownOpen(!isDropdownOpen)}
            onEventTypeChange={handleEventTypeFilterChange}
          />
        )}

        {/* Post Creation Form */}
        {isCaptain && (
          <PostCreator
            darkMode={darkMode}
            newPostContent={newPostContent}
            onContentChange={setNewPostContent}
            onSubmit={handleCreatePost}
            posting={posting}
          />
        )}

        {/* Stream Posts */}
        <StreamPosts
          darkMode={darkMode}
          posts={posts}
          expandedComments={expandedComments}
          newComments={newComments}
          onToggleComments={toggleComments}
          onCommentChange={(postId, content) => setNewComments(prev => ({ ...prev, [postId]: content }))}
          onAddComment={handleAddComment}
        />
      </div>
    </div>
  );
}