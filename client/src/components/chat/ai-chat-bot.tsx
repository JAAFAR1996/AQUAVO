import { useState, useRef, useEffect, useMemo, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { useCart } from "@/contexts/cart-context";
import { useToast } from "@/hooks/use-toast";
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
    Star,
    ShoppingCart,
    ThumbsUp,
    ThumbsDown,
    Headphones,
    ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { WHATSAPP_URL } from "@/lib/constants/shipping";
import { openWhatsApp } from "@/lib/whatsapp";

interface Product {
    id: string;
    slug?: string;
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
    feedback?: "up" | "down" | null;
}

// ============================================================
// Lightweight Markdown Renderer (no external deps)
// Handles: **bold**, • bullets, ⚠️ warnings, line breaks
// ============================================================
const ChatMarkdown = memo(function ChatMarkdown({ text }: { text: string }) {
    const rendered = useMemo(() => {
        const lines = text.split("\n");
        return lines.map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <br key={i} />;

            // Warning line styling
            const isWarning = trimmed.startsWith("⚠️") || trimmed.startsWith("تحذير") || trimmed.startsWith("خطر");

            // Numbered list detection (1. 2. 3. etc.)
            const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
            const isNumbered = !!numberedMatch;

            // Bullet point detection
            const isBullet = !isNumbered && (trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* "));
            const bulletContent = isBullet ? trimmed.replace(/^[•\-*]\s*/, "") : trimmed;

            // Bold-only header detection (line is entirely **text**)
            const isHeader = !isNumbered && !isBullet && /^\*\*[^*]+\*\*[:\s]*$/.test(trimmed);

            // Process inline **bold** markers
            const rawContent = isNumbered ? numberedMatch![2] : (isBullet ? bulletContent : trimmed);
            const parts = rawContent.split(/(\*\*[^*]+\*\*)/g);
            const processed = parts.map((part, j) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
                }
                return <span key={j}>{part}</span>;
            });

            if (isWarning) {
                return (
                    <div key={i} className="bg-red-500/15 border border-red-500/30 rounded-lg px-2.5 py-1.5 my-1 text-red-200">
                        {processed}
                    </div>
                );
            }

            if (isHeader) {
                return (
                    <p key={i} className="font-bold text-foreground mt-2 mb-0.5">{processed}</p>
                );
            }

            if (isNumbered) {
                return (
                    <div key={i} className="flex gap-2 items-start my-0.5">
                        <span className="text-primary font-bold flex-shrink-0 min-w-[1.2rem] text-right">{numberedMatch![1]}.</span>
                        <span>{processed}</span>
                    </div>
                );
            }

            if (isBullet) {
                return (
                    <div key={i} className="flex gap-1.5 items-start pr-1 my-0.5">
                        <span className="text-primary mt-0.5 flex-shrink-0">•</span>
                        <span>{processed}</span>
                    </div>
                );
            }

            return <p key={i} className="my-0.5">{processed}</p>;
        });
    }, [text]);

    return <div className="space-y-0.5">{rendered}</div>;
});

// ============================================================
// Compact Product Card with Add-to-Cart (2026 Conversational Commerce)
// ============================================================
const ChatProductCard = memo(function ChatProductCard({
    product,
    onView,
    onAddToCart,
}: {
    product: Product;
    onView: () => void;
    onAddToCart: () => void;
}) {
    return (
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-background/50 border border-border/50 hover:border-primary/40 hover:bg-background/80 transition-all group">
            <img
                src={product.image}
                alt={product.name}
                className="w-10 h-10 object-cover rounded-md flex-shrink-0 cursor-pointer"
                loading="lazy"
                onClick={onView}
            />
            <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
                <h4 className="text-[11px] font-medium line-clamp-1 group-hover:text-primary transition-colors">
                    {product.name}
                </h4>
                <div className="flex items-center gap-1.5">
                    {product.rating && (
                        <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            {product.rating}
                        </span>
                    )}
                    <span className="text-[11px] font-bold text-purple-500">قريباً</span>
                </div>
            </div>
            {/* 🛒 Add to Cart — 2026 Conversational Commerce */}
            <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 flex-shrink-0 hover:bg-primary/20 hover:text-primary"
                onClick={(e) => { e.stopPropagation(); onAddToCart(); }}
                aria-label={`أضف ${product.name} للسلة`}
            >
                <ShoppingCart className="w-3.5 h-3.5" />
            </Button>
        </div>
    );
});

// ============================================================
// 👍/👎 Feedback Buttons (2026 Data-Driven Improvement)
// ============================================================
const FeedbackButtons = memo(function FeedbackButtons({
    feedback,
    onFeedback,
}: {
    feedback?: "up" | "down" | null;
    onFeedback: (type: "up" | "down") => void;
}) {
    if (feedback) {
        return (
            <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-muted-foreground/60">
                    {feedback === "up" ? "👍 شكراً!" : "👎 نتعلم ونتحسن"}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 hover:bg-green-500/20 hover:text-green-400"
                onClick={() => onFeedback("up")}
                aria-label="رد مفيد"
            >
                <ThumbsUp className="w-3 h-3" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                className="h-5 w-5 hover:bg-red-500/20 hover:text-red-400"
                onClick={() => onFeedback("down")}
                aria-label="رد غير مفيد"
            >
                <ThumbsDown className="w-3 h-3" />
            </Button>
        </div>
    );
});

// ============================================================
// Streaming API Call — كلمة بكلمة مثل Claude
// ============================================================
async function streamChatMessage(
    message: string,
    history: ChatMessage[],
    userName: string | undefined,
    onChunk: (text: string) => void,
    onDone: (products: Product[], normalizedText?: string) => void,
    onError: (msg: string) => void,
    onCartAction?: (productId: string, productName: string) => void
): Promise<void> {
    const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            message,
            history: history.map(m => ({ role: m.role, content: m.content })),
            userName,
        }),
    });

    if (!response.ok || !response.body) {
        onError("فشل الاتصال 😔 حاول مرة ثانية");
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // Keep incomplete line in buffer

        for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") return;

            try {
                const event = JSON.parse(data);
                if (event.type === "chunk") {
                    onChunk(event.text);
                } else if (event.type === "cart_action") {
                    onCartAction?.(event.productId, event.productName);
                } else if (event.type === "done") {
                    onDone(event.products || [], event.normalizedText);
                } else if (event.type === "error") {
                    onError(event.message || "صار خطأ 😔");
                }
            } catch {
                // Ignore malformed events
            }
        }
    }
}

// ============================================================
// Proactive Chat Triggers (2026 Predictive Automation)
// ============================================================
function useProactiveChat(isOpen: boolean, setIsOpen: (v: boolean) => void, messages: ChatMessage[], setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>) {
    const [hasTriggered, setHasTriggered] = useState(false);
    const [showProactiveHint, setShowProactiveHint] = useState(false);

    useEffect(() => {
        if (isOpen || hasTriggered) return;

        // Trigger after 45 seconds of browsing
        const timer = setTimeout(() => {
            setShowProactiveHint(true);
            setHasTriggered(true);

            // Auto-hide after 8 seconds
            setTimeout(() => setShowProactiveHint(false), 8000);
        }, 45000);

        return () => clearTimeout(timer);
    }, [isOpen, hasTriggered]);

    // Product page detection
    useEffect(() => {
        if (isOpen || hasTriggered) return;

        const path = window.location.pathname;
        if (path.includes("/products/") && !path.endsWith("/products")) {
            // User is viewing a specific product — wait 15 sec then hint
            const timer = setTimeout(() => {
                setShowProactiveHint(true);
                setHasTriggered(true);
                setTimeout(() => setShowProactiveHint(false), 8000);
            }, 15000);

            return () => clearTimeout(timer);
        }
    }, [isOpen, hasTriggered]);

    return { showProactiveHint, setShowProactiveHint };
}

// ============================================================
// Main Chat Component — 2026 Edition
// ============================================================
export function AIChatBot() {
    const { user } = useAuth();
    const { addItem, refetchCart } = useCart();
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const userName = user?.fullName || user?.email?.split('@')[0];

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const streamingIndexRef = useRef<number>(-1);

    // Proactive chat triggers
    const { showProactiveHint, setShowProactiveHint } = useProactiveChat(isOpen, setIsOpen, messages, setMessages);

    // Personalized greeting
    useEffect(() => {
        const greeting = userName
            ? `هلا ${userName}! 🦐 أنا شريمب، مساعدك الشخصي في AQUAVO.\n\nشلون اكدر اساعدك اليوم؟\n• أسئلة عن الأسماك\n• نصايح رعاية\n• توصيات منتجات`
            : "هلا! 🦐 أنا شريمب، مساعد AQUAVO الذكي.\n\nشلون اكدر اساعدك اليوم؟\n• أسئلة عن الأسماك\n• نصايح رعاية\n• توصيات منتجات";

        setMessages([{
            role: "assistant",
            content: greeting,
            timestamp: new Date(),
        }]);
    }, [userName]);

    // Smooth auto-scroll on new content
    useEffect(() => {
        if (scrollRef.current) {
            const el = scrollRef.current;
            requestAnimationFrame(() => {
                el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            });
        }
    }, [messages]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isStreaming) return;

        const userMessage = input.trim();
        setInput("");
        setIsStreaming(true);

        // Add user message
        setMessages(prev => [...prev, {
            role: "user",
            content: userMessage,
            timestamp: new Date(),
        }]);

        // Add empty assistant message (will be filled by streaming)
        const assistantMsgIndex = messages.length + 1;
        streamingIndexRef.current = assistantMsgIndex;
        setMessages(prev => [...prev, {
            role: "assistant",
            content: "",
            timestamp: new Date(),
            feedback: null,
        }]);

        let accumulatedText = "";

        await streamChatMessage(
            userMessage,
            messages,
            userName,
            // onChunk: append text as it arrives
            (chunk) => {
                accumulatedText += chunk;
                setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === "assistant") {
                        updated[lastIdx] = { ...updated[lastIdx], content: accumulatedText };
                    }
                    return updated;
                });
            },
            // onDone: attach products + apply dialect correction if needed
            (products, normalizedText) => {
                setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === "assistant") {
                        updated[lastIdx] = {
                            ...updated[lastIdx],
                            products,
                            // Replace with normalized text if dialect was corrected
                            ...(normalizedText && { content: normalizedText }),
                        };
                    }
                    return updated;
                });
                setIsStreaming(false);
            },
            // onError
            (errMsg) => {
                setMessages(prev => {
                    const updated = [...prev];
                    const lastIdx = updated.length - 1;
                    if (updated[lastIdx]?.role === "assistant") {
                        updated[lastIdx] = { ...updated[lastIdx], content: `❌ ${errMsg}` };
                    }
                    return updated;
                });
                setIsStreaming(false);
            },
            // onCartAction
            (_productId, productName) => {
                refetchCart();
                toast({
                    title: "تمت الإضافة! 🛒",
                    description: `${productName} انضاف للسلة`,
                });
            }
        );

        // Safety: ensure streaming is marked done
        setIsStreaming(false);
    }, [input, isStreaming, messages, userName]);

    // Handle feedback
    const handleFeedback = useCallback((messageIndex: number, type: "up" | "down") => {
        setMessages(prev => {
            const updated = prev.map((msg, i) =>
                i === messageIndex ? { ...msg, feedback: type } : msg
            );

            // Extract user message + AI response for learning
            const aiResponse = updated[messageIndex]?.content;
            const userMessage = messageIndex > 0 ? updated[messageIndex - 1]?.content : undefined;

            // Send feedback to server (fire-and-forget)
            fetch("/api/ai/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    type,
                    messageIndex,
                    userMessage: userMessage,
                    aiResponse: aiResponse,
                }),
            }).catch(() => { /* best-effort */ });

            return updated;
        });
    }, []);

    // Handle add to cart from chat
    const handleAddToCart = useCallback((product: Product) => {
        addItem(product as any);
        toast({
            title: "تمت الإضافة! 🛒",
            description: `${product.name} انضاف للسلة`,
        });
    }, [addItem, toast]);

    // Handle contact support
    const handleContactSupport = useCallback(() => {
        // Open WhatsApp or Instagram
        openWhatsApp({ source: "chatbot", message: "مرحباً، أحتاج مساعدة من فريق AQUAVO" });
    }, []);

    // Quick questions
    const quickQuestions = [
        "أحسن سمكة للمبتدئ؟",
        "شلون أنظف الحوض؟",
        "شنو حرارة الماء المناسبة؟",
    ];

    return (
        <>
            {/* Proactive Chat Hint — 2026 Predictive Automation */}
            <AnimatePresence>
                {showProactiveHint && !isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, x: -10 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed bottom-[88px] left-6 z-50"
                    >
                        <div
                            className="bg-card border border-primary/30 rounded-2xl rounded-bl-none shadow-xl px-4 py-3 max-w-[260px] cursor-pointer hover:border-primary/60 transition-all"
                            onClick={() => {
                                setShowProactiveHint(false);
                                setIsOpen(true);
                            }}
                        >
                            <p className="text-xs text-foreground leading-relaxed">
                                هلا! تحتاج مساعدة؟ اسألني عن أي شي — أسماك، أحواض، أو منتجات!
                            </p>
                            <div className="flex items-center gap-1 mt-1.5 text-primary">
                                <span className="text-[10px] font-medium">ابدأ محادثة</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                            onClick={() => { setIsOpen(true); setShowProactiveHint(false); }}
                            className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-primary via-cyan-500 to-blue-600 hover:from-primary/90 hover:to-blue-700 p-0"
                            aria-label="فتح مساعد AQUAVO الذكي"
                        >
                            <div className="relative">
                                <MessageCircle className="w-6 h-6" aria-hidden="true" />
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
                        className={cn(
                            "fixed z-50",
                            "inset-0 sm:inset-auto",
                            "sm:bottom-6 sm:left-6 sm:w-[420px] sm:max-w-[calc(100vw-32px)]"
                        )}
                    >
                        <Card className={cn(
                            "shadow-2xl border-primary/20 overflow-hidden h-full sm:h-auto sm:rounded-xl rounded-none flex flex-col",
                            isMinimized && "h-auto"
                        )}>
                            {/* Header */}
                            <CardHeader className="p-3 bg-gradient-to-r from-primary via-cyan-500 to-blue-600 text-white flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-card/20 rounded-lg">
                                            <Fish className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-bold">شريمب 🦐</CardTitle>
                                            <div className="flex items-center gap-1">
                                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                <span className="text-xs opacity-80">متصل الآن</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Badge variant="secondary" className="text-xs gap-1 bg-card/20 text-white border-none">
                                            <Sparkles className="w-3 h-3" />
                                            AI
                                        </Badge>
                                        {/* 📞 Contact Support — 2026 Hybrid Handoff */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white hover:bg-white/20"
                                            onClick={handleContactSupport}
                                            aria-label="تواصل مع الدعم البشري"
                                            title="تواصل مع فريق الدعم"
                                        >
                                            <Headphones className="w-4 h-4" aria-hidden="true" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white hover:bg-white/20"
                                            onClick={() => setIsMinimized(!isMinimized)}
                                            aria-label="تصغير نافذة المحادثة"
                                        >
                                            <Minimize2 className="w-4 h-4" aria-hidden="true" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-white hover:bg-white/20"
                                            onClick={() => setIsOpen(false)}
                                            aria-label="إغلاق المحادثة"
                                        >
                                            <X className="w-4 h-4" aria-hidden="true" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>

                            {/* Content */}
                            {!isMinimized && (
                                <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
                                    {/* Messages */}
                                    <ScrollArea className="flex-1 sm:h-[420px] p-3" ref={scrollRef}>
                                        <div className="space-y-3">
                                            {messages.map((message, messageIndex) => (
                                                <div
                                                    key={`${message.timestamp.getTime()}-${message.role}`}
                                                    className={cn(
                                                        "flex gap-2 group",
                                                        message.role === "user" ? "flex-row-reverse" : ""
                                                    )}
                                                >
                                                    {/* Avatar */}
                                                    <div
                                                        className={cn(
                                                            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                                            message.role === "user"
                                                                ? "bg-primary text-white"
                                                                : "bg-gradient-to-br from-cyan-500 to-blue-500 text-white"
                                                        )}
                                                    >
                                                        {message.role === "user" ? (
                                                            <User className="w-3 h-3" />
                                                        ) : (
                                                            <Bot className="w-3 h-3" />
                                                        )}
                                                    </div>

                                                    {/* Message Content */}
                                                    <div className="flex-1 max-w-[88%]">
                                                        <div
                                                            className={cn(
                                                                "rounded-2xl px-3 py-2 text-xs leading-relaxed",
                                                                message.role === "user"
                                                                    ? "bg-primary text-white rounded-tr-none ml-auto"
                                                                    : "bg-muted rounded-tl-none"
                                                            )}
                                                        >
                                                            {message.role === "assistant" ? (
                                                                <ChatMarkdown text={message.content} />
                                                            ) : (
                                                                <p className="whitespace-pre-wrap">{message.content}</p>
                                                            )}
                                                        </div>

                                                        {/* Product Cards — 2026 Conversational Commerce */}
                                                        {message.role === "assistant" && message.products && message.products.length > 0 && (
                                                            <div className="mt-1.5 space-y-1">
                                                                {message.products
                                                                    .slice(0, 3)
                                                                    .map((product) => (
                                                                        <ChatProductCard
                                                                            key={product.id}
                                                                            product={product}
                                                                            onView={() => {
                                                                                const productPath = product.slug || product.id;
                                                                                setLocation(`/products/${productPath}`);
                                                                                setIsOpen(false);
                                                                            }}
                                                                            onAddToCart={() => handleAddToCart(product)}
                                                                        />
                                                                    ))}
                                                            </div>
                                                        )}

                                                        {/* 👍/👎 Feedback — 2026 Data-Driven Improvement */}
                                                        {message.role === "assistant" && messageIndex > 0 && (
                                                            <FeedbackButtons
                                                                feedback={message.feedback}
                                                                onFeedback={(type) => handleFeedback(messageIndex, type)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Typing Indicator — only show when waiting for first chunk */}
                                            {isStreaming && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
                                                <div className="flex gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                                        <Bot className="w-3 h-3 text-white" />
                                                    </div>
                                                    <div className="bg-muted rounded-2xl rounded-tl-none px-3 py-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="flex gap-1">
                                                                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                                <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground">شريمب يكتب...</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>

                                    {/* Quick Questions */}
                                    {messages.length <= 1 && (
                                        <div className="p-3 border-t bg-muted/30 flex-shrink-0">
                                            <p className="text-[10px] text-muted-foreground mb-2">أسئلة سريعة:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {quickQuestions.map((q) => (
                                                    <Button
                                                        key={q}
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-[10px] h-6 px-2"
                                                        onClick={() => setInput(q)}
                                                    >
                                                        {q}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact Support Banner — 2026 Hybrid Handoff */}
                                    {messages.length > 4 && (
                                        <div className="px-3 py-1.5 border-t bg-muted/20 flex-shrink-0">
                                            <button
                                                onClick={handleContactSupport}
                                                className="w-full flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                <Headphones className="w-3 h-3" />
                                                تحتاج مساعدة بشرية؟ تواصل مع فريق الدعم
                                                <ChevronRight className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Input */}
                                    <div className="p-3 border-t flex-shrink-0">
                                        <div className="flex gap-2">
                                            <Input
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                                placeholder="اكتب سؤالك..."
                                                disabled={isStreaming}
                                                className="flex-1 h-9 text-xs"
                                            />
                                            <Button
                                                onClick={handleSend}
                                                disabled={!input.trim() || isStreaming}
                                                size="icon"
                                                className="h-9 w-9"
                                                aria-label="إرسال الرسالة"
                                            >
                                                {isStreaming ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                                ) : (
                                                    <Send className="w-4 h-4" aria-hidden="true" />
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
