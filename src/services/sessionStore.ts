import { CaptureSession } from '../types';

type Listener = (sessions: CaptureSession[]) => void;

class SessionStore {
  private sessions: CaptureSession[] = [];
  private listeners = new Set<Listener>();

  list(): CaptureSession[] {
    return [...this.sessions];
  }

  get(id: string): CaptureSession | undefined {
    return this.sessions.find((s) => s.id === id);
  }

  upsert(session: CaptureSession): void {
    const idx = this.sessions.findIndex((s) => s.id === session.id);
    if (idx === -1) {
      this.sessions = [session, ...this.sessions];
    } else {
      this.sessions[idx] = session;
    }
    this.emit();
  }

  remove(id: string): void {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.list());
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snapshot = this.list();
    for (const fn of this.listeners) fn(snapshot);
  }
}

export const sessionStore = new SessionStore();

export function newSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
