import "server-only";

import { Liveblocks } from "@liveblocks/node";

const globalForLiveblocks = globalThis as unknown as { liveblocks?: Liveblocks };

export function getLiveblocks(): Liveblocks {
  if (globalForLiveblocks.liveblocks) return globalForLiveblocks.liveblocks;
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) throw new Error("LIVEBLOCKS_SECRET_KEY is required");
  const client = new Liveblocks({ secret });
  globalForLiveblocks.liveblocks = client;
  return client;
}
