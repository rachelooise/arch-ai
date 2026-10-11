export const CURSOR_COLORS = [
  "#22D3EE", "#A78BFA", "#FB7185", "#FBBF24",
  "#34D399", "#60A5FA", "#F472B6", "#FB923C",
] as const;

export function getCursorColor(userId: string): string {
  let hash = 0;
  for (let index = 0; index < userId.length; index++) {
    hash = (Math.imul(hash, 31) + userId.charCodeAt(index)) >>> 0;
  }
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}
