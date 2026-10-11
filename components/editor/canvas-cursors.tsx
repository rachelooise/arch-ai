"use client";

import { useAuth } from "@clerk/nextjs";
import { useOther, useOthersConnectionIds } from "@liveblocks/react/suspense";
import { useViewport } from "@xyflow/react";

export function ParticipantCursor({ connectionId, currentUserId }: { connectionId: number; currentUserId: string | null | undefined }) {
  const other = useOther(connectionId, (participant) => participant);
  const viewport = useViewport();
  const cursor = other.presence.cursor;
  if (!currentUserId || other.id === currentUserId || !cursor || !Number.isFinite(cursor.x) || !Number.isFinite(cursor.y)) return null;
  const color = other.info.color;

  return <div className="absolute left-0 top-0" style={{ transform: `translate(${viewport.x + cursor.x * viewport.zoom}px, ${viewport.y + cursor.y * viewport.zoom}px)` }}>
    <svg width="18" height="22" viewBox="0 0 18 22" fill={color} stroke="var(--bg-base)" strokeWidth="1.5">
      <path d="M1 1L16 14L9 15L5 21Z" strokeLinejoin="round" />
    </svg>
    <span className="absolute left-4 top-4 max-w-40 truncate rounded-md px-2 py-1 text-xs font-medium text-base shadow-sm" style={{ backgroundColor: color }}>{other.info.name || "Collaborator"}</span>
  </div>;
}

export function CanvasCursors() {
  const { userId } = useAuth();
  const connectionIds = useOthersConnectionIds();
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
    {connectionIds.map((connectionId) => <ParticipantCursor key={connectionId} connectionId={connectionId} currentUserId={userId} />)}
  </div>;
}
