"use client";

import type React from "react";
import { useState } from "react";
import type { CipherVideo } from "@/app/codebusters/data/cipherVideos";

interface VideoCarouselProps {
  videos: CipherVideo[];
  darkMode: boolean;
}

export const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos, darkMode }) => {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  if (videos.length === 0) {
    return (
      <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        No videos available for this cipher type.
      </div>
    );
  }

  const currentVideo = videos[currentVideoIndex];
  if (!currentVideo) {
    return (
      <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        No video available.
      </div>
    );
  }

  const getYouTubeEmbedUrl = (url: string): string => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  const goToPrevious = () => {
    setCurrentVideoIndex((prev) => (prev > 0 ? prev - 1 : videos.length - 1));
  };

  const goToNext = () => {
    setCurrentVideoIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0));
  };

  const goToVideo = (index: number) => {
    setCurrentVideoIndex(index);
  };

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative">
        <div className="aspect-video w-full">
          <iframe
            src={getYouTubeEmbedUrl(currentVideo.url)}
            title={currentVideo.title}
            className="w-full h-full rounded-lg"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={true}
          />
        </div>

        {/* Navigation Arrows */}
        {videos.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                darkMode
                  ? "bg-gray-800/80 text-white hover:bg-gray-700/80"
                  : "bg-white/80 text-gray-800 hover:bg-gray-100/80"
              } shadow-lg transition-colors`}
              aria-label="Previous video"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                darkMode
                  ? "bg-gray-800/80 text-white hover:bg-gray-700/80"
                  : "bg-white/80 text-gray-800 hover:bg-gray-100/80"
              } shadow-lg transition-colors`}
              aria-label="Next video"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Video Info */}
      <div className="space-y-2">
        <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
          {currentVideo.title}
        </h3>
        {currentVideo.description && (
          <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            {currentVideo.description}
          </p>
        )}
      </div>

      {/* Video Thumbnails/Dots */}
      {videos.length > 1 && (
        <div className="flex justify-center space-x-2">
          {videos.map((_video, index) => (
            <button
              key={index}
              onClick={() => goToVideo(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentVideoIndex
                  ? darkMode
                    ? "bg-blue-400"
                    : "bg-blue-600"
                  : darkMode
                    ? "bg-gray-600"
                    : "bg-gray-300"
              }`}
              aria-label={`Go to video ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Video List (for multiple videos) */}
      {videos.length > 1 && (
        <div className="space-y-2">
          <h4 className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
            All Videos ({videos.length})
          </h4>
          <div className="space-y-1">
            {videos.map((video, index) => (
              <button
                key={index}
                onClick={() => goToVideo(index)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  index === currentVideoIndex
                    ? darkMode
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-blue-50 text-blue-700 border border-blue-200"
                    : darkMode
                      ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <div className="text-sm font-medium">{video.title}</div>
                {video.description && (
                  <div className={`text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    {video.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
