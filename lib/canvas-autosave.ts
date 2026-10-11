import { parseCanvasState, serializeCanvas, type CanvasState } from "@/lib/canvas-state";

export type CanvasSaveStatus = "saving" | "saved" | "error";
export const AUTOSAVE_DELAY = 1200;
type Options = {
  projectId: string;
  getSnapshot: () => CanvasState;
  isRoomEmpty: () => boolean;
  restoreIfEmpty: (state: CanvasState) => boolean;
  onStatus: (status: CanvasSaveStatus, error?: string) => void;
  fetch?: typeof fetch;
};

export class CanvasAutosave {
  private ready = false;
  private disposed = false;
  private loading = false;
  private changedDuringLoad = false;
  private writing = false;
  private pending = false;
  private lastSaved: string | null = null;
  private observed: string | null = null;
  private initial: string;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private loadAbort = new AbortController();
  private request: typeof fetch;
  constructor(private options: Options) {
    this.initial = serializeCanvas(options.getSnapshot());
    // Native browser fetch requires the Window/global receiver, not this controller.
    this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
  }
  private status(value: CanvasSaveStatus, error?: string) { if (!this.disposed) this.options.onStatus(value, error); }
  private async responseError(response: Response, action: string) {
    let message = `${action} failed (HTTP ${response.status}). Please retry.`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "error" in body && typeof body.error === "string") message = body.error;
    } catch { /* Non-JSON failures retain the HTTP status. */ }
    return new Error(message);
  }
  private clearTimer() { clearTimeout(this.timer); this.timer = undefined; }

  async start() {
    if (this.loading || this.disposed) return;
    if (!this.options.isRoomEmpty()) { this.ready = true; this.update(); return; }
    this.loading = true;
    this.status("saving");
    try {
      const response = await this.request(`/api/projects/${encodeURIComponent(this.options.projectId)}/canvas`, { cache: "no-store", signal: this.loadAbort.signal });
      if (!response.ok) throw await this.responseError(response, "Loading canvas");
      const body: unknown = await response.json();
      const saved = body === null ? null : parseCanvasState(body);
      if (body !== null && !saved) throw new Error("Saved canvas data is invalid. Please retry loading.");
      if (this.disposed) return;
      const restored = saved && !this.changedDuringLoad && this.options.isRoomEmpty() && this.options.restoreIfEmpty(saved);
      this.ready = true;
      if (restored) { this.lastSaved = serializeCanvas(saved); this.status("saved"); }
      else {
        this.lastSaved = this.changedDuringLoad ? null : saved ? serializeCanvas(saved) : this.initial;
        this.update();
      }
    } catch (error) {
      if (!this.disposed) {
        if (!this.options.isRoomEmpty()) { this.ready = true; this.update(); }
        else this.status("error", error instanceof TypeError ? "Could not reach the server to load the canvas. Check your connection and retry." : error instanceof Error ? error.message : "Unable to load canvas. Please retry.");
      }
    } finally { this.loading = false; }
  }

  update() {
    if (this.disposed) return;
    const current = serializeCanvas(this.options.getSnapshot());
    if (!this.ready) { if (current !== this.initial) this.changedDuringLoad = true; return; }
    if (current === this.observed) return;
    this.observed = current;
    this.clearTimer();
    if (current === this.lastSaved && !this.writing) { this.status("saved"); return; }
    this.status("saving");
    this.timer = setTimeout(() => { void this.persist(); }, AUTOSAVE_DELAY);
  }

  saveNow() {
    this.clearTimer();
    if (!this.ready) { void this.start(); return; }
    void this.persist();
  }

  private async persist(flush = false) {
    if (!this.ready || (this.disposed && !flush)) return;
    if (this.writing) { this.pending = true; return; }
    const body = serializeCanvas(this.options.getSnapshot());
    if (body === this.lastSaved) { this.status("saved"); return; }
    this.writing = true;
    this.pending = false;
    this.status("saving");
    let succeeded = false;
    try {
      const response = await this.request(`/api/projects/${encodeURIComponent(this.options.projectId)}/canvas`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body,
        keepalive: new TextEncoder().encode(body).length < 60000,
      });
      if (!response.ok) throw await this.responseError(response, "Saving canvas");
      this.lastSaved = body;
      succeeded = true;
    } catch (error) { this.status("error", error instanceof TypeError ? "Could not reach the server to save the canvas. Check your connection and retry." : error instanceof Error ? error.message : "Unable to save canvas. Please retry."); }
    finally {
      this.writing = false;
      const dirty = serializeCanvas(this.options.getSnapshot()) !== this.lastSaved;
      if (dirty && (this.pending || (succeeded && this.disposed))) void this.persist(this.disposed);
      else if (dirty && succeeded) this.update();
      else if (succeeded) this.status("saved");
    }
  }

  dispose() {
    this.clearTimer();
    this.disposed = true;
    this.loadAbort.abort();
    if (this.ready) void this.persist(true);
  }
}
