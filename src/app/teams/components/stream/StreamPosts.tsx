'use client';

import React, { useState } from 'react';
import { Clock, User, MessageCircle, Send, FileText, Edit, Trash2, X, Check } from 'lucide-react';
import { StreamPost } from './streamTypes';

interface StreamPostsProps {
  darkMode: boolean;
  posts: StreamPost[];
  expandedComments: Set<string>;
  newComments: Record<string, string>;
  onToggleComments: (postId: string) => void;
  onCommentChange: (postId: string, content: string) => void;
  onAddComment: (postId: string) => void;
  isCaptain: boolean;
  onDeletePost: (postId: string) => void;
  onEditPost: (postId: string, content: string, attachmentUrl?: string, attachmentTitle?: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export default function StreamPosts({
  darkMode,
  posts,
  expandedComments,
  newComments,
  onToggleComments,
  onCommentChange,
  onAddComment,
  isCaptain,
  onDeletePost,
  onEditPost,
  onDeleteComment
}: StreamPostsProps) {
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editAttachmentUrl, setEditAttachmentUrl] = useState('');
  const [editAttachmentTitle, setEditAttachmentTitle] = useState('');

  const handleStartEdit = (post: StreamPost) => {
    setEditingPost(post.id);
    setEditContent(post.content);
    setEditAttachmentUrl(post.attachment_url || '');
    setEditAttachmentTitle(post.attachment_title || '');
  };

  const handleCancelEdit = () => {
    setEditingPost(null);
    setEditContent('');
    setEditAttachmentUrl('');
    setEditAttachmentTitle('');
  };

  const handleSaveEdit = () => {
    if (editingPost && editContent.trim()) {
      onEditPost(editingPost, editContent.trim(), editAttachmentUrl || undefined, editAttachmentTitle || undefined);
      handleCancelEdit();
    }
  };

  if (posts.length === 0) {
    return (
      <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p>No posts yet. Check back later for team updates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <div key={post.id} className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          {/* Post Content */}
          <div className="mb-3">
            {editingPost === post.id ? (
              <div className="space-y-3">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={`w-full p-3 rounded-lg border resize-none ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  rows={3}
                  placeholder="Edit post content..."
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={editAttachmentTitle}
                    onChange={(e) => setEditAttachmentTitle(e.target.value)}
                    placeholder="Attachment title (optional)"
                    className={`w-full p-2 rounded-lg border text-sm ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <input
                    type="url"
                    value={editAttachmentUrl}
                    onChange={(e) => setEditAttachmentUrl(e.target.value)}
                    placeholder="Attachment URL"
                    className={`w-full p-2 rounded-lg border text-sm ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editContent.trim()}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save</span>
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            ) : (
              <p className={`${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {post.content}
              </p>
            )}
          </div>

          {/* Attachment */}
          {post.attachment_url && !editingPost && (
            <div className="mb-3">
              <a
                href={post.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center space-x-2 p-3 rounded-lg border transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {post.attachment_title || 'Attachment'}
                </span>
              </a>
            </div>
          )}

          {/* Post Meta */}
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {post.author_name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {new Date(post.created_at).toLocaleString()}
              </span>
              {/* Captain Controls */}
              {isCaptain && !editingPost && (
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={() => handleStartEdit(post)}
                    className={`p-1 rounded hover:bg-gray-600 transition-colors ${
                      darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                    title="Edit post"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeletePost(post.id)}
                    className={`p-1 rounded hover:bg-red-600 transition-colors ${
                      darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-white'
                    }`}
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => onToggleComments(post.id)}
                className="flex items-center space-x-2 text-sm text-blue-500 hover:text-blue-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {post.comments?.length || 0} comment{(post.comments?.length || 0) !== 1 ? 's' : ''}
                </span>
              </button>
            </div>

            {/* Comments List */}
            {expandedComments.has(post.id) && (
              <div className="space-y-3 mb-3">
                {post.comments?.map(comment => (
                  <div key={comment.id} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <User className="w-3 h-3 text-gray-400" />
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {comment.author_name}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      {/* Captain Controls for Comments */}
                      {isCaptain && (
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className={`p-1 rounded hover:bg-red-600 transition-colors ${
                            darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-white'
                          }`}
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className={`text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            {expandedComments.has(post.id) && (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newComments[post.id] || ''}
                  onChange={(e) => onCommentChange(post.id, e.target.value)}
                  placeholder="Add a comment..."
                  className={`flex-1 p-2 rounded-lg border text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      onAddComment(post.id);
                    }
                  }}
                />
                <button
                  onClick={() => onAddComment(post.id)}
                  disabled={!newComments[post.id]?.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
