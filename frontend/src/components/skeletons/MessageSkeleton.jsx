import React from 'react';

export function MessageRowSkeleton() {
  return (
    <div className="w-full rounded-lg border px-3 py-2 bg-slate-950/40 border-slate-800 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-28 bg-slate-800 rounded" />
          <div className="mt-2 h-3 w-44 bg-slate-800 rounded" />
        </div>
        <div className="h-3 w-10 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

export function ChatBubbleSkeleton({ mine = false } = {}) {
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-pulse`}>
      <div className={`max-w-[80%] rounded-3xl px-4 py-3 border ${mine ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900/50 border-slate-800'}`}>
        <div className="h-3 w-56 bg-slate-800 rounded" />
        <div className="mt-2 h-3 w-44 bg-slate-800 rounded" />
        <div className="mt-2 h-3 w-28 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

