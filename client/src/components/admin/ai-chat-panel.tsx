import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import {
    Send,
    Bot,
    User,
    Loader2,
    Sparkles,
    Trash2,
    MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

async function sendChatMessage(message: string, history: ChatMessage[]) {
    const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            history: history.map(m => ({ role: m.role, content: m.content })),
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل الاتصال بالذكاء الاصطناعي");
    }

    const data = await response.json();
    return data.data.response;
}

export function AIChatPanel() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "مرحباً! 🧠 أنا مساعد AQUAVO الذكي للإدارة\n\n**يمكنني مساعدتك في:**\n📊 تحليل المبيعات والإيرادات\n📦 متابعة المخزون والتنبيهات\n📈 توقعات الطلب والاتجاهات\n🎯 اقتراحات لتحسين الأداء\n\n**اسألني مثلاً:**\n• ما هي مبيعات اليوم؟\n• أي منتج يحتاج إعادة تخزين؟\n• كيف أداء المتجر هذا الشهر؟",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Chat mutation
    const chatMutation = useMutation({
        mutationFn: (message: string) => sendChatMessage(message, messages),
        onSuccess: (response) => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: response,
                    timestamp: new Date(),
                },
            ]);
        },
        onError: (error: Error) => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: `❌ خطأ: ${error.message}`,
                    timestamp: new Date(),
                },
            ]);
        },
    });

    // Send message
    const handleSend = () => {
        if (!input.trim() || chatMutation.isPending) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        chatMutation.mutate(input.trim());
        setInput("");
    };

    // Clear chat
    const handleClear = () => {
        setMessages([
            {
                role: "assistant",
                content: "تم مسح المحادثة. كيف يمكنني مساعدتك؟ 🐠",
                timestamp: new Date(),
            },
        ]);
    };

    // Quick prompts - Admin-focused analytics questions (2025 Best Practice)
    const quickPrompts = [
        "📊 ما هي مبيعات اليوم؟",
        "⚠️ ما هي المنتجات الأقل مخزوناً؟",
        "🏆 ما هو أفضل منتج مبيعاً هذا الشهر؟",
        "📈 تحليل الطلبات هذا الأسبوع",
    ];

    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <div className="p-2 bg-gradient-to-br from-primary to-cyan-500 rounded-lg">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        مساعد AQUAVO الذكي
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                            <Sparkles className="w-3 h-3" />
                            Gemini AI
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={handleClear}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "flex gap-3",
                                    message.role === "user" ? "flex-row-reverse" : ""
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                        message.role === "user"
                                            ? "bg-primary text-white"
                                            : "bg-gradient-to-br from-cyan-500 to-blue-500 text-white"
                                    )}
                                >
                                    {message.role === "user" ? (
                                        <User className="w-4 h-4" />
                                    ) : (
                                        <Bot className="w-4 h-4" />
                                    )}
                                </div>
                                <div
                                    className={cn(
                                        "max-w-[80%] rounded-2xl px-4 py-2",
                                        message.role === "user"
                                            ? "bg-primary text-white rounded-tr-none"
                                            : "bg-muted rounded-tl-none"
                                    )}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    <p className="text-[10px] opacity-60 mt-1">
                                        {message.timestamp.toLocaleTimeString("ar-IQ", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {chatMutation.isPending && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-white" />
                                </div>
                                <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm text-muted-foreground">
                                            جاري التفكير...
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Quick Prompts */}
                {messages.length <= 1 && (
                    <div className="p-4 border-t bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">اسأل عن:</p>
                        <div className="flex flex-wrap gap-2">
                            {quickPrompts.map((prompt, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setInput(prompt)}
                                >
                                    <MessageCircle className="w-3 h-3 ml-1" />
                                    {prompt}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t">
                    <div className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder="اكتب رسالتك هنا..."
                            disabled={chatMutation.isPending}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleSend}
                            disabled={!input.trim() || chatMutation.isPending}
                            className="gap-1"
                        >
                            {chatMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
