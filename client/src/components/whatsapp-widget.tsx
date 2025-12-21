import { cn } from "@/lib/utils";

interface WhatsAppWidgetProps {
    phoneNumber?: string;
    message?: string;
    className?: string;
}

export function WhatsAppWidget({
    phoneNumber = "9647700000000",
    message = "مرحباً، عندي استفسار عن المنتجات",
    className,
}: WhatsAppWidgetProps) {
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                "fixed bottom-6 left-6 z-50",
                "bg-gradient-to-br from-primary/90 to-accent/80",
                "p-2 rounded-full",
                "shadow-2xl hover:shadow-primary/40",
                "transition-all duration-300 hover:scale-110",
                "animate-bounce hover:animate-none",
                "group",
                "border-2 border-white/20",
                className
            )}
            aria-label="تواصل معنا عبر واتساب"
        >
            {/* Shrimp Mascot Icon */}
            <img
                src="/images/shrimp-chat-icon.png"
                alt="تواصل معنا"
                className="w-12 h-12 object-contain group-hover:rotate-12 transition-transform"
            />

            {/* Tooltip */}
            <span className="absolute left-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                🦐 تواصل معنا الآن!
            </span>

            {/* Ping animation ring */}
            <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping opacity-25" />
        </a>
    );
}

