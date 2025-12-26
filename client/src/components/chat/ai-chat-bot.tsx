import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import {
    MessageCircle,
    Send,
    X,
    Bot,
    User,
    Loader2,
    Sparkles,
    Minimize2,
    Fish,
    ExternalLink,
    Star
} from "lucide-react";

import { cn } from "@/lib/utils";

interface Product {
    id: string;
    name: string;
    price: string;
    image: string;
    category: string;
    rating: number | null;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    products?: Product[];
}

async function sendChatMessage(message: string, history: ChatMessage[], userName?: string) {
    const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            message,
            history: history.map(m => ({ role: m.role, content: m.content })),
            userName,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "فشل الاتصال");
    }

    const data = await response.json();
    return {
        response: data.data.response,
        products: data.data.products || [],
    };
}

export function AIChatBot() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const userName = user?.fullName || user?.email?.split('@')[0];

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Initialize with personalized greeting
    useEffect(() => {
        const greeting = userName
            ? `أهلاً ${userName}! 🐠 أنا أكوا، مساعدك الشخصي في AQUAVO.\n\nكيف أقدر أساعدك اليوم؟\n• أسئلة عن الأسماك\n• نصائح رعاية\n• توصيات منتجات`
            : "مرحباً! 🐠 أنا أكوا، مساعد AQUAVO الذكي.\n\nكيف يمكنني مساعدتك اليوم؟\n• أسئلة عن الأسماك\n• نصائح رعاية\n• توصيات منتجات";

        setMessages([{
            role: "assistant",
            content: greeting,
            timestamp: new Date(),
        }]);
    }, [userName]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Chat mutation
    const chatMutation = useMutation({
        mutationFn: (message: string) => sendChatMessage(message, messages, userName),
        onSuccess: (data) => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.response,
                    products: data.products,
                    timestamp: new Date()
                },
            ]);
        },
        onError: (error: Error) => {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `❌ ${error.message}`, timestamp: new Date() },
            ]);
        },
    });

    const handleSend = () => {
        if (!input.trim() || chatMutation.isPending) return;

        setMessages((prev) => [
            ...prev,
            { role: "user", content: input.trim(), timestamp: new Date() },
        ]);
        chatMutation.mutate(input.trim());
        setInput("");
    };

    // Quick questions
    const quickQuestions = [
        "أفضل سمكة للمبتدئين؟",
        "كيف أنظف الحوض؟",
        "درجة حرارة الماء المثالية؟",
    ];

    return (
        <>
            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="fixed bottom-6 left-6 z-50"
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-primary via-cyan-500 to-blue-600 hover:from-primary/90 hover:to-blue-700 p-0"
                        >
                            <div className="relative">
                                <MessageCircle className="w-6 h-6" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                            </div>
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="fixed bottom-6 left-6 z-50 w-[360px] max-w-[calc(100vw-48px)]"
                    >
                        <Card className={cn(
                            "shadow-2xl border-primary/20 overflow-hidden",
                            isMinimized && "h-auto"
                        )}>
                            {/* Header */}
                            <CardHeader className="p-3 bg-gradient-to-r from-primary via-cyan-500 to-blue-600 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-white/20 rounded-lg">
                                            <Fish className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold">مساعد AQUAVO</CardTitle>
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                <span className="text-xs opacity-80">متصل الآن</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge variant="secondary" className="text-xs gap-1 bg-white/20 text-white border-none">
                                            <Sparkles className="w-3 h-3" />
                                            AI
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white hover:bg-white/20"
                                            onClick={() => setIsMinimized(!isMinimized)}
                                        >
                                            <Minimize2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white hover:bg-white/20"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Content */}
                            {!isMinimized && (
                                <CardContent className="p-0">
                                    {/* Messages */}
                                    <ScrollArea className="h-[300px] p-3" ref={scrollRef}>
                                        <div className="space-y-3">
                                            {messages.map((message, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "flex gap-2",
                                                        message.role === "user" ? "flex-row-reverse" : ""
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                                                            message.role === "user"
                                                                ? "bg-primary text-white"
                                                                : "bg-gradient-to-br from-cyan-500 to-blue-500 text-white"
                                                        )}
                                                    >
                                                        {message.role === "user" ? (
                                                            <User className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <Bot className="w-3.5 h-3.5" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div
                                                            className={cn(
                                                                "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                                                                message.role === "user"
                                                                    ? "bg-primary text-white rounded-tr-none ml-auto"
                                                                    : "bg-muted rounded-tl-none"
                                                            )}
                                                        >
                                                            <p className="whitespace-pre-wrap leading-relaxed">
                                                                {message.content}
                                                            </p>
                                                        </div>

                                                        {/* Product Cards */}
                                                        {message.role === "assistant" && message.products && message.products.length > 0 && (
                                                            <div className="mt-2 space-y-2">
                                                                {message.products.map((product) => (
                                                                    <Card
                                                                        key={product.id}
                                                                        className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer max-w-[280px]"
                                                                        onClick={() => {
                                                                            setLocation(`/products/${product.id}`);
                                                                            setIsOpen(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex gap-2 p-2">
                                                                            <img
                                                                                src={product.image}
                                                                                alt={product.name}
                                                                                className="w-16 h-16 object-cover rounded"
                                                                            />
                                                                            <div className="flex-1 min-w-0">
                                                                                <h4 className="text-xs font-medium line-clamp-2 mb-1">
                                                                                    {product.name}
                                                                                </h4>
                                                                                <div className="flex items-center gap-1 mb-1">
                                                                                    {product.rating && (
                                                                                        <>
                                                                                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                                                            <span className="text-xs">{product.rating}</span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-xs font-bold text-primary">
                                                                                        {product.price} د.ع
                                                                                    </span>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="ghost"
                                                                                        className="h-6 text-xs px-2"
                                                                                    >
                                                                                        <ExternalLink className="w-3 h-3 ml-1" />
                                                                                        عرض
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </Card>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Loading */}
                                            {chatMutation.isPending && (
                                                <div className="flex gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                                        <Bot className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <div className="bg-muted rounded-2xl rounded-tl-none px-3 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            <span className="text-xs text-muted-foreground">يكتب...</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>

                                    {/* Quick Questions */}
                                    {messages.length <= 1 && (
                                        <div className="p-3 border-t bg-muted/30">
                                            <p className="text-xs text-muted-foreground mb-2">أسئلة سريعة:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {quickQuestions.map((q, i) => (
                                                    <Button
                                                        key={i}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-7"
                                                        onClick={() => setInput(q)}
                                                    >
                                                        {q}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Input */}
                                    <div className="p-3 border-t">
                                        <div className="flex gap-2">
                                            <Input
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                                placeholder="اكتب سؤالك..."
                                                disabled={chatMutation.isPending}
                                                className="flex-1 h-9 text-sm"
                                            />
                                            <Button
                                                onClick={handleSend}
                                                disabled={!input.trim() || chatMutation.isPending}
                                                size="icon"
                                                className="h-9 w-9"
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
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
