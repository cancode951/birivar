import React from 'react';

export default function PostCardSkeleton() {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-gray-800 backdrop-blur-md p-4 shadow-sm animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700" />
          <div className="min-w-0">
            <div className="h-4 w-40 bg-slate-800 rounded" />
            <div className="mt-2 h-3 w-64 bg-slate-800 rounded" />
          </div>
        </div>
        <div className="h-5 w-16 bg-slate-800 rounded-full" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-3 w-full bg-slate-800 rounded" />
        <div className="h-3 w-[92%] bg-slate-800 rounded" />
        <div className="h-3 w-[78%] bg-slate-800 rounded" />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-8 w-24 bg-slate-800 rounded-full" />
        <div className="h-8 w-24 bg-slate-800 rounded-full" />
      </div>
    </div>
  );
}

