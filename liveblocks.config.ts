declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null;
      isThinking: boolean;
    };
    UserMeta: {
      id: string;
      info: { name: string; avatar: string; color: string };
    };
  }
}

export {};
