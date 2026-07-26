/**
 * Cossa AI chatbot service boundary.
 *
 * THE AI BRAIN IS NOT CONNECTED. These functions describe the interface a
 * future server-side Cossa AI integration will implement. Until then
 * `sendMessage` returns a clearly labelled assisted-support reply and never
 * fabricates products, prices, stock or delivery information.
 *
 * No API keys are referenced here — model calls will live server-side.
 */
import { buildLead, createLead, type LeadResult } from "@/services/leads.service";

export const COSSA_AI_CONNECTED = false;

export type ChatRole = "assistant" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  created_at: string;
}

export interface Conversation {
  id: string;
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

export function createConversation(): Conversation {
  return {
    id: id("conv"),
    created_at: new Date().toISOString(),
    messages: [
      { id: id("msg"), role: "assistant", text: OPENING_MESSAGE, created_at: new Date().toISOString() },
    ],
  };
}

export function buildMessage(role: ChatRole, text: string): ChatMessage {
  return { id: id("msg"), role, text, created_at: new Date().toISOString() };
}

/**
 * Persistence hook for a future backend. Currently a no-op so no customer
 * conversation data is stored or transmitted.
 */
export async function saveMessage(_conversationId: string, _message: ChatMessage): Promise<void> {
  return;
}

export interface AssistantReply {
  message: ChatMessage;
  mode: "assisted_support" | "ai";
}

export async function sendMessage(_conversationId: string, _text: string): Promise<AssistantReply> {
  if (!COSSA_AI_CONNECTED) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { message: buildMessage("assistant", ASSISTED_SUPPORT_REPLY), mode: "assisted_support" };
  }
  // Future: call a server function that proxies Cossa AI.
  throw new Error("Cossa AI transport not implemented");
}

export function requestHumanSupport(context: string): Promise<LeadResult> {
  return createLead(
    buildLead(
      "human_support",
      { name: "Chat visitor", phone: "", interest: context, preferred_contact_method: "whatsapp" },
      { channel: "cossa_ai_chat" },
    ),
  );
}

/** Catalogue search hook for the future AI tool-calling layer. */
export async function productSearch(_term: string): Promise<{ connected: false }> {
  return { connected: false };
}

/** Service recommendation hook for the future AI tool-calling layer. */
export async function serviceRecommendation(_context: string): Promise<{ connected: false }> {
  return { connected: false };
}