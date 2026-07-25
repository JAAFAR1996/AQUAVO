import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Database, Loader2, MessageCircle, Send, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { addCsrfHeader } from "@/lib/csrf";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

async function askVerifiedData(message: string): Promise<string> {
  const response = await fetch("/api/pricing/dashboard-chat", {
    method: "POST",
    headers: addCsrfHeader({ "Content-Type": "application/json" }),
    credentials: "include",
    body: JSON.stringify({ message }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.success || !payload.data?.response) {
    throw new Error(payload.error || "تعذر قراءة بيانات الإدارة");
  }
  return payload.data.response as string;
}

function welcomeMessage(): ChatMessage {
  return {
    role: "assistant",
    content:
      "مرحباً، أنا مساعد بيانات AQUAVO. أجيب من قاعدة البيانات مباشرة عن المبيعات المحققة، الطلبات، المخزون، وأفضل المنتجات. لا أعرض رقماً تقديرياً عند غياب الدليل.",
    timestamp: new Date(),
  };
}

export function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const mutation = useMutation({
    mutationFn: askVerifiedData,
    onSuccess: (content) => {
      setMessages((current) => [...current, { role: "assistant", content, timestamp: new Date() }]);
    },
    onError: (error: Error) => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `تعذر التحقق من قاعدة البيانات: ${error.message}. لم يتم عرض رقم بديل.`,
          timestamp: new Date(),
        },
      ]);
    },
  });

  const send = (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || mutation.isPending) return;
    setMessages((current) => [...current, { role: "user", content: message, timestamp: new Date() }]);
    mutation.mutate(message);
    setInput("");
  };

  const quickPrompts = [
    "ما هي مبيعات اليوم؟",
    "أي منتجات تحتاج إعادة تخزين؟",
    "ما هو أفضل منتج مبيعاً هذا الشهر؟",
    "حلل الطلبات هذا الأسبوع",
    "ما هي تكلفة المخزون؟",
  ];

  return (
    <Card className="flex h-[600px] flex-col">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            مساعد بيانات AQUAVO
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Database className="h-3 w-3" />
              بيانات مباشرة
            </Badge>
            <Button variant="ghost" size="icon" aria-label="مسح المحادثة" onClick={() => setMessages([welcomeMessage()])}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col p-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={`${message.timestamp.getTime()}-${index}`} className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
                <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-cyan-600 text-white")}>
                  {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn("max-w-[82%] rounded-2xl px-4 py-3", message.role === "user" ? "rounded-tr-none bg-primary text-primary-foreground" : "rounded-tl-none bg-muted")}>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                  <p className="mt-1 text-[10px] opacity-60">
                    {message.timestamp.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-white"><Bot className="h-4 w-4" /></div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحساب من قاعدة البيانات...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {messages.length === 1 && (
          <div className="border-t bg-muted/20 p-4">
            <p className="mb-2 text-xs text-muted-foreground">أسئلة جاهزة:</p>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <Button key={prompt} variant="outline" size="sm" className="h-auto whitespace-normal text-xs" onClick={() => send(prompt)}>
                  <MessageCircle className="ml-1 h-3 w-3" />
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === "Enter" && send(input)} placeholder="اسأل عن المبيعات أو الطلبات أو المخزون..." disabled={mutation.isPending} />
            <Button onClick={() => send(input)} disabled={!input.trim() || mutation.isPending} aria-label="إرسال">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">عند تعذر الوصول للبيانات سيذكر ذلك صراحة بدل التخمين.</p>
        </div>
      </CardContent>
    </Card>
  );
}
