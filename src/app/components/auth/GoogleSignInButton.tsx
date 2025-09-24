'use client';

import React from 'react';
import Image from 'next/image';

export default function GoogleSignInButton({
  darkMode,
  oauthLoading,
  isOffline,
  onClick,
}: {
  darkMode: boolean;
  oauthLoading: boolean;
  isOffline: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={oauthLoading || isOffline}
      className={`w-full rounded-lg px-4 py-2 flex items-center justify-center gap-3 transition-colors duration-200 border font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        darkMode
          ? 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-100 shadow disabled:opacity-100 disabled:bg-gray-700 disabled:text-gray-100 disabled:border-gray-600'
          : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-900 shadow-sm disabled:opacity-100 disabled:bg-white disabled:text-gray-900 disabled:border-gray-300'
      }`}
    >
      <Image src="/about/google-icon.png" alt="Google" width={18} height={18} />
      {oauthLoading ? 'Connecting…' : 'Continue with Google'}
    </button>
  );
}


