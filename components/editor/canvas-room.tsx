"use client";

import { Component, useState, type ReactNode } from "react";
import { ClientSideSuspense, LiveblocksProvider, RoomProvider, useErrorListener } from "@liveblocks/react/suspense";

import { Canvas } from "@/components/editor/canvas";

function CanvasError() {
  return <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-copy-muted">
    Unable to connect to the canvas. Please reload to try again.
  </div>;
}

class CanvasErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <CanvasError /> : this.props.children;
  }
}

function RoomCanvas() {
  const [connectionFailed, setConnectionFailed] = useState(false);
  useErrorListener((error) => {
    if (error.context.type === "ROOM_CONNECTION_ERROR") setConnectionFailed(true);
  });

  if (connectionFailed) return <CanvasError />;

  return <ClientSideSuspense fallback={
    <div role="status" className="flex h-full items-center justify-center p-6 text-copy-muted">Loading canvas…</div>
  }>
    <Canvas />
  </ClientSideSuspense>;
}

export function CanvasRoom({ roomId }: { roomId: string }) {
  return (
    <CanvasErrorBoundary key={roomId}>
      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider id={roomId} initialPresence={{ cursor: null, isThinking: false }}>
          <RoomCanvas />
        </RoomProvider>
      </LiveblocksProvider>
    </CanvasErrorBoundary>
  );
}
