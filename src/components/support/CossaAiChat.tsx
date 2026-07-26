import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, TriangleAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE } from "@/config/site";
import { trackEvent } from "@/lib/analytics";
import {
  COSSA_AI_CONNECTED,
  buildMessage,
  createConversation,
  requestHumanSupport,
  saveMessage,
  sendMessage,
  type ChatMessage,
  type Conversation,
} from "@/services/cossa-ai.service";
import { useSupport } from "@/components/support/support-context";
import { CallButton, WhatsAppButton } from "@/components/support/ContactActions";

const QUICK_ACTIONS = [
  "Find a product",
  "Source a product",
  "Request a quote",
  "Business buying",
  "Construction help",
  "Cleaning service",
  "Technology support",
  "Speak to a person",
];

export function CossaAiChat() {
  const { panel, close, open } = useSupport();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [status, setStatus] = useState<"idle" | "typing" | "error">("idle");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOpen = panel === "chat";

  useEffect(() => {
    if (isOpen && !conversation) setConversation(createConversation());
  }, [isOpen, conversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversation, status]);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || !conversation || status === "typing") return;

    if (value === "Speak to a person") {
      trackEvent("human_support_requested");
      await requestHumanSupport("Requested a human from Cossa AI chat");
    }

    const userMessage = buildMessage("user", value);
    appendMessage(userMessage);
    setInput("");
    trackEvent("chatbot_message_sent");
    setStatus("typing");
    try {
      await saveMessage(conversation.id, userMessage);
      const reply = await sendMessage(conversation.id, value);
      appendMessage(reply.message);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function appendMessage(message: ChatMessage) {
    setConversation((current) =>
      current ? { ...current, messages: [...current.messages, message] } : current,
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (v ? null : close())}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-4 p-0">
        <DialogHeader className="border-b border-border px-5 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" aria-hidden />
            </span>
            Cossa AI
          </DialogTitle>
          <DialogDescription>Shopping and business assistant</DialogDescription>
          {!COSSA_AI_CONNECTED ? (
            <p className="mt-2 inline-flex items-start gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              Assisted-support mode. The Cossa AI brain is not connected yet, so no product,
              pricing, stock or delivery answers are generated.
            </p>
          ) : null}
        </DialogHeader>

        <div
          ref={scrollRef}
          className="min-h-40 flex-1 overflow-y-auto px-5"
          role="log"
          aria-live="polite"
        >
          <div className="space-y-3 pb-2">
            {conversation?.messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                    : "max-w-[90%] text-sm text-foreground"
                }
              >
                {message.text}
              </div>
            ))}
            {status === "typing" ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Cossa AI is typing…
              </p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                The assistant is unavailable right now. Please WhatsApp or call{" "}
                {SITE.phoneDisplay}.
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 border-t border-border px-5 pb-5 pt-4">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => void submit(action)}
                className="rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
              >
                {action}
              </button>
            ))}
          </div>

          <form
            onSubmit={(event: FormEvent) => {
              event.preventDefault();
              void submit(input);
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Message Cossa AI"
            />
            <Button type="submit" size="icon" aria-label="Send message" disabled={status === "typing"}>
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="flex flex-wrap gap-2">
            <WhatsAppButton
              variant="outline"
              label="Speak to a person on WhatsApp"
              message="Hello Cossa Store, I would like to speak to a person."
            />
            <Button
              variant="ghost"
              onClick={() => {
                trackEvent("human_support_requested", { channel: "callback" });
                open("callback");
              }}
            >
              Request a callback
            </Button>
            <CallButton variant="ghost" label={SITE.phoneDisplay} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}