import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentId: string;
  agentName: string;
  milestoneId: string;
  milestoneTitle: string;
  onEndSession?: (summary: string) => void;
}

export function AgentChatDrawer({
  open,
  onOpenChange,
  agentId,
  agentName,
  milestoneId,
  milestoneTitle,
  onEndSession,
}: AgentChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset messages when drawer closes
  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // TODO: Implement actual WebSocket connection to agent
    // For now, simulate response after delay
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `[${agentName}] I received your message about "${milestoneTitle}". This is a placeholder response - WebSocket integration needed.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleEndSession = async () => {
    setIsEnding(true);
    // TODO: Call API to end session and get summary
    setTimeout(() => {
      const summary = "Placeholder summary of conversation about milestone review.";
      onEndSession?.(summary);
      setIsEnding(false);
      onOpenChange(false);
    }, 1000);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>Chat with {agentName}</SheetTitle>
          <SheetDescription>Discussing milestone: {milestoneTitle}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Start a conversation with {agentName} about this milestone.
              </p>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t pt-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleEndSession}
            disabled={isEnding || messages.length === 0}
          >
            {isEnding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Summary...
              </>
            ) : (
              "End Conversation & Generate Summary"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
