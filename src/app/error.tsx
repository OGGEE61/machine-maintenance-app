'use client';

import { useEffect } from 'react';

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-[#dadada]/70 p-8 w-full max-w-md text-center">
        <h1 className="text-[#282828] font-bold text-xl mb-2">Something went wrong</h1>
        <p className="text-[#6b6969] text-sm mb-6">This page could not be loaded. Please try again in a moment.</p>
        <button
          onClick={() => retry()}
          className="w-full py-3 bg-[#282828] text-white font-bold rounded-xl hover:bg-[#444] transition-colors cursor-pointer text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
