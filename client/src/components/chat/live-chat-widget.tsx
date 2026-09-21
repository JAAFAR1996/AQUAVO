import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MessageCircle,
    X,
    Send,
    Minimize2,
    Maximize2,
    Loader2,
    User,
    HeadsetIcon
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface ChatMessage {
    id: string;
    content: string;
    sender: "user" | "support";
    timestamp: Date;
    status?: "sent" | "delivered" | "read";
}

export function LiveChatWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const wsRef = useRef<WebSocket | null>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, isMinimized]);

    // Reset unread count when opened
    useEffect(() => {
        if (isOpen && !isMinimized) {
            setUnreadCount(0);
        }
    }, [isOpen, isMinimized]);

    // WebSocket Connection
    useEffect(() => {
        if (isOpen && !wsRef.current) {
            try {
                const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                const wsUrl = `${protocol}//${window.location.host}/ws`;

                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    setIsConnected(true);
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'message') {
                            setIsTyping(false);
                            setMessages(prev => [...prev, {
                                id: `msg-${Date.now()}`,
                                content: data.text,
                                sender: data.sender || 'support',
                                timestamp: new Date(),
                                status: 'delivered'
                            }]);

                            // Increment unread if minimized
                            if (isMinimized) {
                                setUnreadCount(prev => prev + 1);
                            }
                        }
                    } catch (e) {
                        console.error("WS parse error", e);
                    }
                };

                ws.onclose = () => {
                    setIsConnected(false);
                    wsRef.current = null;
                };

                return () => {
                    if (wsRef.current) {
                        wsRef.current.close();
                        wsRef.current = null;
                    }
                };
            } catch (err) {
                console.error("Failed to connect to WebSocket", err);
                setIsConnected(false);
            }
        }
    }, [isOpen, isMinimized]); // Re-connect logic needs care, mainly dependent on isOpen

    const handleOpen = useCallback(() => {
        setIsOpen(true);
        setIsMinimized(false);

        // Send welcome message if first time
        if (messages.length === 0) {
            setTimeout(() => {
                setMessages([{
                    id: "welcome",
                    content: "مرحباً بك! 👋 كيف يمكننا مساعدتك اليوم؟",
                    sender: "support",
                    timestamp: new Date(),
                }]);
            }, 500);
        }
    }, [messages.length]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    const handleMinimize = useCallback(() => {
        setIsMinimized(!isMinimized);
    }, [isMinimized]);

    const handleSendMessage = useCallback(() => {
        if (!inputValue.trim()) return;

        const content = inputValue.trim();
        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            content: content,
            sender: "user",
            timestamp: new Date(),
            status: "sent",
        };

        setMessages(prev => [...prev, newMessage]);
        setInputValue("");

        // Send via WebSocket
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'message',
                text: content,
                userId: user?.id
            }));
            // Simulate typing from support side (server will respond)
            setIsTyping(true);
        } else {
            // Fallback if disconnected
            setMessages(prev => [...prev, {
                id: `err-${Date.now()}`,
                content: "عذراً، فقدنا الاتصال بالخادم. حاول مرة أخرى لاحقاً.",
                sender: "support",
                timestamp: new Date(),
            }]);
        }
    }, [inputValue, user?.id]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [handleSendMessage]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    // Floating button when closed
    if (!isOpen) {
        return (
            <Button
                onClick={handleOpen}
                className="fixed bottom-6 left-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
                size="icon"
                aria-label="فتح محادثة الدعم المباشر"
            >
                <MessageCircle className="h-6 w-6" aria-hidden="true" />
                {unreadCount > 0 && (
                    <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                )}
            </Button>
        );
    }

    // Minimized state
    if (isMinimized) {
        return (
            <Card className="fixed bottom-6 left-6 z-50 w-72 shadow-lg cursor-pointer" onClick={handleMinimize}>
                <CardHeader className="p-3 flex flex-row items-center justify-between bg-gradient-to-r from-primary to-cyan-500 text-white rounded-t-lg">
                    <div className="flex items-center gap-2">
                        <HeadsetIcon className="h-5 w-5" />
                        <span className="font-medium">الدعم المباشر</span>
                        {unreadCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5">
                                {unreadCount}
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); handleMinimize(); }} aria-label="تكبير نافذة الدردشة">
                            <Maximize2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); handleClose(); }} aria-label="إغلاق الدردشة">
                            <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    // Full chat window
    return (
        <Card className="fixed bottom-6 left-6 z-50 w-80 sm:w-96 shadow-2xl flex flex-col" style={{ height: "480px" }}>
            {/* Header */}
            <CardHeader className="p-3 flex flex-row items-center justify-between bg-gradient-to-r from-primary to-cyan-500 text-white rounded-t-lg shrink-0">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <HeadsetIcon className="h-6 w-6" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isConnected ? "bg-green-400" : "bg-yellow-400"}`} />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-medium">الدعم المباشر</CardTitle>
                        <p className="text-xs opacity-90">
                            {isConnected ? "متصل الآن" : "جاري الاتصال..."}
                        </p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={handleMinimize} aria-label="تصغير نافذة الدردشة">
                        <Minimize2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-white hover:bg-white/20" onClick={handleClose} aria-label="إغلاق الدردشة">
                        <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className={`flex items-end gap-2 max-w-[85%] ${message.sender === "user" ? "flex-row-reverse" : ""}`}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${message.sender === "user"
                                        ? "bg-primary text-white"
                                        : "bg-cyan-500 text-white"
                                        }`}>
                                        {message.sender === "user" ? (
                                            <User className="h-4 w-4" />
                                        ) : (
                                            <HeadsetIcon className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className={`rounded-2xl px-4 py-2 ${message.sender === "user"
                                        ? "bg-primary text-white rounded-br-sm"
                                        : "bg-muted rounded-bl-sm"
                                        }`}>
                                        <p className="text-sm">{message.content}</p>
                                        <p className={`text-xs mt-1 ${message.sender === "user" ? "text-white/70" : "text-muted-foreground"
                                            }`}>
                                            {formatTime(message.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="flex items-end gap-2">
                                    <div className="w-7 h-7 rounded-full bg-cyan-500 flex items-center justify-center">
                                        <HeadsetIcon className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                                        <div className="flex gap-1">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>

            {/* Input */}
            <div className="p-3 border-t shrink-0">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="اكتب رسالتك..."
                        className="flex-1"
                        dir="rtl"
                    />
                    <Button
                        onClick={handleSendMessage}
                        size="icon"
                        disabled={!inputValue.trim()}
                        className="shrink-0"
                        aria-label="إرسال الرسالة"
                    >
                        <Send className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </div>
                {user && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        متصل كـ {user.email}
                    </p>
                )}
            </div>
        </Card>
    );
}

export default LiveChatWidget;
