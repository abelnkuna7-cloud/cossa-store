/**
 * Cossa AI assisted-support persistence.
 *
 * One chatbot conversation is created per browser session and reused for every
 * message. Only the conversation id / reference and an anonymous session token
 * are kept in sessionStorage — never personal data.
 */
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { anonymousSessionId, currentPage, failure } from "@/services/service-result";

export type ChatRole = "user" | "assistant" | "system";

export interface ConversationHandle {
  id: string;
  reference: string;
}

const CONV_ID_KEY = "cossa.chat.conversation-id.v1";
const CONV_REF_KEY = "cossa.chat.conversation-reference.v1";

function readStoredConversation(): ConversationHandle | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.sessionStorage.getItem(CONV_ID_KEY);
    const reference = window.sessionStorage.getItem(CONV_REF_KEY);
    return id && reference ? { id, reference } : null;
  } catch {
    return null;
  }
}

function storeConversation(handle: ConversationHandle) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(CONV_ID_KEY, handle.id);
    window.sessionStorage.setItem(CONV_REF_KEY, handle.reference);
  } catch {
    /* private mode — the conversation simply is not reused after reload */
  }
}

let inFlight: Promise<ConversationHandle | null> | null = null;

/** Returns the session conversation, creating it once if needed. */
export async function ensureConversation(): Promise<ConversationHandle | null> {
  const existing = readStoredConversation();
  if (existing) return existing;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc("start_chatbot_conversation", {
        p_visitor_token: anonymousSessionId(),
        p_source_page: currentPage(),
      });
      if (error) return null;
      const row = data?.[0];
      if (!row?.id || !row.reference) return null;
      const handle: ConversationHandle = { id: row.id, reference: row.reference };
      storeConversation(handle);
      trackEvent("chatbot_conversation_started");
      return handle;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Persists a single message. Never throws — chat must keep working offline. */
export async function saveChatMessage(
  conversationId: string,
  role: ChatRole,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc("add_chatbot_message", {
      p_conversation_id: conversationId,
      p_role: role,
      p_content: content,
    });
    if (error) return { success: false, error: failure(error).error };
    trackEvent("chatbot_message_saved", { role });
    return { success: true };
  } catch (error) {
    return { success: false, error: failure(error).error };
  }
}

/** Records the quick-action intent the visitor tapped, when one was used. */
export function saveQuickActionIntent(conversationId: string, intent: string) {
  return saveChatMessage(conversationId, "system", `Quick action intent: ${intent}`);
}
