import { apiGet, apiPost } from './client';

// Mirrors hms-backend-node's ChatMessage model + businesslogic/chat.js —
// one continuous, append-only thread per staff member (not per-company,
// not multiple named conversations), backed by a real OpenAI-powered
// assistant with function-calling access to live company data (occupancy,
// arrivals, checkouts, VIP guests, dirty rooms, maintenance tickets, and
// more — see hms-backend-node/src/AI-chat/tools.js). Revenue/ADR/RevPAR
// specifically are withheld from the model for non-management staff
// inside the tool handler itself — there's no role check to replicate
// here, the backend already only ever returns what a given staff member
// is allowed to see.
export type ChatRole = 'user' | 'assistant';

export type ChatMessageDto = {
  _id: string;
  companyId: string;
  staffId: string;
  role: ChatRole;
  content: string;
  // Mixed/opaque server-side — only ever used here to tell whether an
  // assistant reply was backed by a real data lookup (non-empty) or was
  // the model answering from general knowledge alone (empty/absent),
  // which the UI flags with a small disclaimer, same as the web app.
  toolCalls?: unknown;
  createdAt: string;
  updatedAt: string;
  // Client-only, never sent by the server: set on the local synthetic
  // message use-chat.ts injects when sendChatMessage fails, same as the
  // web app's own `isError` flag — the user's question was still saved,
  // only the reply failed, so this renders as an error-styled assistant
  // bubble rather than losing the question or blocking the thread.
  isError?: boolean;
};

// Sorted oldest-first, capped at 200 messages server-side.
export function getChatHistory() {
  return apiGet<ChatMessageDto[]>('/chat/history');
}

export type SendChatMessageResponse = {
  userMessage: ChatMessageDto;
  assistantMessage: ChatMessageDto;
};

// Note: the backend saves the user's message to history before it even
// attempts to generate a reply — so if this rejects (e.g. the assistant
// is unavailable), the user's own message still persisted; see
// use-chat.ts's mutation for how that's reconciled.
export function sendChatMessage(message: string) {
  return apiPost<SendChatMessageResponse>('/chat/message', { message });
}

// A reply with no tool call behind it wasn't checked against live data —
// could be a fine decline ("I can only help with hotel questions"), but
// could also be the model answering a factual question from its own
// memory instead of looking it up fresh. There's no reliable way to tell
// those apart from the message alone, so this flags every non-tool-backed
// assistant reply as a quiet transparency note, matching the web app.
export function isUnverified(message: ChatMessageDto) {
  if (message.role !== 'assistant' || message.isError) return false;
  const calls = message.toolCalls;
  if (!calls) return true;
  return Array.isArray(calls) && calls.length === 0;
}
