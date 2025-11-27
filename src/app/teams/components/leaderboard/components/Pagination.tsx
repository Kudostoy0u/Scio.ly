"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  darkMode: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, darkMode, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = (): number[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (currentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  };

  return (
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={`flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            currentPage === 1
              ? darkMode
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center space-x-1">
          {getPageNumbers().map((pageNum) => (
            <button
              type="button"
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                currentPage === pageNum
                  ? "bg-blue-600 text-white"
                  : darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={`flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
            currentPage === totalPages
              ? darkMode
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              : darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
        </button>
      </div>
    </div>
  );
}
