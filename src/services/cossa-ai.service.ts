/**
 * Cossa AI chatbot service boundary.
 *
 * THE AI BRAIN IS NOT CONNECTED. `sendMessage` returns a clearly labelled
 * assisted-support reply and never fabricates products, prices, stock or
 * delivery information.
 *
 * Conversations and messages ARE persisted to the Cossa backend so the team
 * can follow up. No API keys are referenced here — model calls will live
 * server-side.
 */
import {
  ensureConversation,
  saveChatMessage,
  saveQuickActionIntent,
  type ConversationHandle,
} from "@/services/chatbot";
import { submitHumanSupportRequest } from "@/services/support";
import type { SubmissionResult } from "@/services/service-result";

export const COSSA_AI_CONNECTED = false;

export type ChatRole = "assistant" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  created_at: string;
}

export interface Conversation {
  id: string | null;
  reference: string | null;
  created_at: string;
  messages: ChatMessage[];
}

export const ASSISTED_SUPPORT_REPLY =
  "Cossa AI's full intelligence is being connected. I can currently help you choose a support option or send your request to the Cossa team.";

export const OPENING_MESSAGE =
  "Hi, I'm Cossa AI, the shopping and business assistant for Cossa Store. I can help you find products, prepare a sourcing request, request a quotation or connect you with a Cossa service.";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildMessage(role: ChatRole, text: string): ChatMessage {
  return { id: id("msg"), role, text, created_at: new Date().toISOString() };
}

/**
 * Starts (or resumes) the session conversation in the backend. The chat UI
 * stays usable even when the backend is unreachable — `id` is then null and
 * messages are simply not persisted.
 */
export async function createConversation(): Promise<Conversation> {
  let handle: ConversationHandle | null = null;
  try {
    handle = await ensureConversation();
  } catch {
    handle = null;
  }
  return {
    id: handle?.id ?? null,
    reference: handle?.reference ?? null,
    created_at: new Date().toISOString(),
    messages: [buildMessage("assistant", OPENING_MESSAGE)],
  };
}

/** Persists a message. Silently ignored when no conversation is available. */
export async function saveMessage(
  conversationId: string | null,
  message: ChatMessage,
): Promise<void> {
  if (!conversationId) return;
  await saveChatMessage(conversationId, message.role, message.text);
}

/** Records the quick-action a visitor tapped, when one was used. */
export async function saveIntent(
  conversationId: string | null,
  intent: string,
): Promise<void> {
  if (!conversationId) return;
  await saveQuickActionIntent(conversationId, intent);
}

export interface AssistantReply {
  message: ChatMessage;
  mode: "assisted_support" | "ai";
}

export async function sendMessage(
  conversationId: string | null,
  _text: string,
): Promise<AssistantReply> {
  if (!COSSA_AI_CONNECTED) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const message = buildMessage("assistant", ASSISTED_SUPPORT_REPLY);
    await saveMessage(conversationId, message);
    return { message, mode: "assisted_support" };
  }
  // Future: call a server function that proxies Cossa AI.
  throw new Error("Cossa AI transport not implemented");
}

export function requestHumanSupport(
  context: string,
  conversationId: string | null = null,
): Promise<SubmissionResult> {
  return submitHumanSupportRequest({
    channel: "cossa_ai_chat",
    reason: context,
    conversation_id: conversationId,
  });
}

/** Catalogue search hook for the future AI tool-calling layer. */
export async function productSearch(_term: string): Promise<{ connected: false }> {
  return { connected: false };
}

/** Service recommendation hook for the future AI tool-calling layer. */
export async function serviceRecommendation(_context: string): Promise<{ connected: false }> {
  return { connected: false };
}
