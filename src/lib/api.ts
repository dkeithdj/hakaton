import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { EventState, Me } from "../../shared/types";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiOptions {
  method?: string;
  /** Plain objects are sent as JSON; Blobs are sent as-is. */
  body?: unknown;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const isBlob = options.body instanceof Blob;
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: options.body === undefined || isBlob ? undefined : { "content-type": "application/json" },
    body: options.body === undefined ? undefined : isBlob ? (options.body as Blob) : JSON.stringify(options.body),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new ApiError(response.status, data?.error ?? `Request failed (${response.status})`);
  return data as T;
}

export interface ClientState extends EventState {
  /** Add to Date.now() to get server time, so countdowns ignore device clock skew. */
  clockOffset: number;
}

const VOTING_POLL_MS = 1500;

export function useEventState(intervalMs: number) {
  return useQuery({
    queryKey: ["state"],
    queryFn: async (): Promise<ClientState> => {
      const state = await api<EventState>("/api/state");
      return { ...state, clockOffset: state.serverNow - Date.now() };
    },
    // The vote count is on the big screen while voting is open, so keep it fresh.
    refetchInterval: (query) => {
      const state = query.state.data;
      const voteEndsAt = state?.settings.voteEndsAt ?? null;
      const votingOpen = voteEndsAt !== null && Date.now() + state!.clockOffset < voteEndsAt;
      return votingOpen ? Math.min(intervalMs, VOTING_POLL_MS) : intervalMs;
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/api/me"),
  });
}

/** Server-aligned clock that re-renders a few times a second. */
export function useNow(clockOffset: number): number {
  const [now, setNow] = useState(() => Date.now() + clockOffset);
  useEffect(() => {
    setNow(Date.now() + clockOffset);
    const timer = setInterval(() => setNow(Date.now() + clockOffset), 250);
    return () => clearInterval(timer);
  }, [clockOffset]);
  return now;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
