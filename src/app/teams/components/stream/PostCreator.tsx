'use client';

import React, { useState } from 'react';
import { Send, Paperclip, X, FileText } from 'lucide-react';

interface PostCreatorProps {
  darkMode: boolean;
  newPostContent: string;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  posting: boolean;
}

interface Attachment {
  title: string;
  url: string;
}

export default function PostCreator({ 
  darkMode, 
  newPostContent, 
  onContentChange, 
  onSubmit, 
  posting 
}: PostCreatorProps) {
  const [showAttachmentForm, setShowAttachmentForm] = useState(false);
  const [newPostAttachment, setNewPostAttachment] = useState('');
  const [newPostAttachmentTitle, setNewPostAttachmentTitle] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);

  const handleAddAttachment = () => {
    if (newPostAttachmentTitle.trim() && newPostAttachment.trim()) {
      setPendingAttachment({
        title: newPostAttachmentTitle.trim(),
        url: newPostAttachment.trim()
      });
      setShowAttachmentForm(false);
      setNewPostAttachmentTitle('');
      setNewPostAttachment('');
    }
  };

  const handleCancelAttachment = () => {
    setShowAttachmentForm(false);
    setNewPostAttachmentTitle('');
    setNewPostAttachment('');
  };

  const handleRemovePendingAttachment = () => {
    setPendingAttachment(null);
  };

  const handleSubmit = () => {
    onSubmit();
    // Reset form after successful submission
    setPendingAttachment(null);
  };

  return (
    <div className={`mb-8 p-4 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <div className="space-y-4">
        <div>
          <textarea
            value={newPostContent}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="What's happening with the team?"
            className={`w-full p-3 rounded-lg border resize-none ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            rows={3}
          />
        </div>

        {/* Attachment Section */}
        {!showAttachmentForm && !pendingAttachment && (
          <button
            onClick={() => setShowAttachmentForm(true)}
            className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
              darkMode 
                ? 'bg-blue-900 hover:bg-blue-800 text-blue-300' 
                : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
          >
            <Paperclip className="w-4 h-4" />
            <span>Add attachment?</span>
          </button>
        )}

        {showAttachmentForm && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={newPostAttachmentTitle}
                  onChange={(e) => setNewPostAttachmentTitle(e.target.value)}
                  placeholder="Attachment title (optional)"
                  className={`w-full p-2 rounded-lg border text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
              <div>
                <input
                  type="url"
                  value={newPostAttachment}
                  onChange={(e) => setNewPostAttachment(e.target.value)}
                  placeholder="Attachment URL"
                  className={`w-full p-2 rounded-lg border text-sm ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddAttachment}
                disabled={!newPostAttachment.trim()}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Add</span>
              </button>
              <button
                onClick={handleCancelAttachment}
                className="flex items-center space-x-1 px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}

        {pendingAttachment && (
          <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">
                {pendingAttachment.title}
              </span>
            </div>
            <button
              onClick={handleRemovePendingAttachment}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={posting || !newPostContent.trim()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span>{posting ? 'Posting...' : 'Post'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
