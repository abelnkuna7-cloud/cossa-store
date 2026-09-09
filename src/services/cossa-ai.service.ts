/**
 * Cossa AI customer-assistance boundary.
 *
 * The Store intelligence layer is connected to the customer-safe live catalogue
 * and deterministic Cossa service/project guidance. It never exposes supplier
 * cost or private operational data. A future server-side reasoning model can
 * extend this boundary without changing the customer chat contract.
 */
import {
  ensureConversation,
  saveChatMessage,
  saveQuickActionIntent,
  type ConversationHandle,
} from "@/services/chatbot";
import { submitHumanSupportRequest } from "@/services/support";
import type { SubmissionResult } from "@/services/service-result";
import { listProducts } from "@/services/store-products.service";
import { buildAdvisorPlan, formatAdvisorReply } from "@/lib/store-advisor";

export const COSSA_AI_CONNECTED = true;

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
  "I can help with products, project quantities and Cossa services. If I cannot verify something from the live Store information, I will direct you to sourcing, a quotation or a Cossa team member instead of guessing.";

export const OPENING_MESSAGE =
  "Hi, I'm Cossa AI. Tell me what you want to buy, fix, build, clean or improve. I can search Cossa Store, help estimate project quantities and connect you with Cossa Nexus Construction, Cossa Facility Services or Cossa Tech when you need more than a product.";

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildMessage(role: ChatRole, text: string): ChatMessage {
  return { id: id("msg"), role, text, created_at: new Date().toISOString() };
}

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

export async function saveMessage(
  conversationId: string | null,
  message: ChatMessage,
): Promise<void> {
  if (!conversationId) return;
  await saveChatMessage(conversationId, message.role, message.text);
}

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
  text: string,
): Promise<AssistantReply> {
  const plan = buildAdvisorPlan(text);
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  if (plan.searchTerm) {
    try {
      products = await listProducts({ search: plan.searchTerm });
    } catch {
      products = [];
    }
  }
  const replyText = formatAdvisorReply(
    plan,
    products.slice(0, 3).map((product) => ({
      name: product.name,
      slug: product.slug,
      selling_price: product.selling_price,
      estimated_delivery: product.estimated_delivery,
    })),
  );
  const message = buildMessage("assistant", replyText || ASSISTED_SUPPORT_REPLY);
  await saveMessage(conversationId, message);
  return { message, mode: "ai" };
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

export async function productSearch(term: string) {
  const products = await listProducts({ search: term });
  return products.slice(0, 8).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.selling_price,
    availability: product.availability_status,
    delivery: product.estimated_delivery,
  }));
}

export async function serviceRecommendation(context: string) {
  const plan = buildAdvisorPlan(context);
  return {
    service: plan.service,
    serviceName: plan.serviceName,
    guidance: plan.guidance,
    calculation: plan.calculation,
    safetyNote: plan.safetyNote,
  };
}
