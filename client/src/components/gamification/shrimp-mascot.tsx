import { cn } from "@/lib/utils";

type MascotMood = "happy" | "sad" | "thinking" | "excited" | "working" | "drinking" | "guardian" | "relaxed";

interface ShrimpMascotProps {
    mood?: MascotMood;
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
    animate?: boolean;
    message?: string;
}

export function ShrimpMascot({
    mood = "happy",
    className,
    size = "md",
    animate = true,
    message
}: ShrimpMascotProps) {

    // Emoji mapping for different moods (until custom images are added)
    const getShrimpEmoji = (m: MascotMood) => {
        switch (m) {
            case "happy": return "🦐";
            case "sad": return "😢🦐";
            case "thinking": return "🤔🦐";
            case "excited": return "🎉🦐";
            case "working": return "💼🦐";
            case "drinking": return "🥤🦐";
            case "guardian": return "🛡️🦐";
            case "relaxed": return "🩳🦐";
            default: return "🦐";
        }
    };

    const getMoodMessage = (m: MascotMood) => {
        if (message) return message;

        switch (m) {
            case "happy": return "يا هلا! 😊";
            case "sad": return "زعلان شوية...";
            case "thinking": return "خليني أفكر...";
            case "excited": return "يا سلام! 🎊";
            case "working": return "شغال عليها...";
            case "drinking": return "بالعافية! 🥤";
            case "guardian": return "ولا يهمك، الشرمب حارس عليه! 🛡️";
            case "relaxed": return "ارتاح يا بطل ❤️";
            default: return "";
        }
    };

    // Animation Classes
    const getAnimation = (m: MascotMood) => {
        if (!animate) return "";
        switch (m) {
            case "sad": return "animate-pulse brightness-75";
            case "thinking": return "animate-float";
            case "excited": return "animate-pulse";
            case "working": return "animate-pulse";
            case "drinking": return "animate-pulse";
            case "guardian": return "animate-pulse";
            case "relaxed": return "animate-float";
            default: return "animate-float";
        }
    };

    const getBackgroundColor = (m: MascotMood) => {
        switch (m) {
            case "happy": return "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20";
            case "sad": return "bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20";
            case "thinking": return "bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20";
            case "excited": return "bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20";
            case "working": return "bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20";
            case "drinking": return "bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20";
            case "guardian": return "bg-gradient-to-br from-slate-100 to-zinc-200 dark:from-slate-900/20 dark:to-zinc-900/20";
            case "relaxed": return "bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/20 dark:to-rose-900/20";
            default: return "bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/20";
        }
    };

    const sizeClasses = {
        sm: "w-24 h-24 text-3xl", // Increased from w-16
        md: "w-32 h-32 text-5xl", // Increased from w-24
        lg: "w-48 h-48 text-7xl", // Increased from w-32
        xl: "w-64 h-64 text-9xl"  // Increased from w-48
    };

    // Image mapping for different moods
    const getShrimpImage = (m: MascotMood) => {
        switch (m) {
            case "happy": return "/assets/mascot/shrimp-happy.png";
            case "sad": return "/assets/mascot/shrimp-sad.png";
            case "thinking": return "/assets/mascot/shrimp-thinking.png";
            case "excited": return "/assets/mascot/shrimp-excited.png";
            case "working": return "/assets/mascot/shrimp-thinking.png"; // Fallback to thinking/happy for working
            case "drinking": return "/assets/mascot/shrimp-drinking.png";
            case "guardian": return "/assets/mascot/shrimp-knight.png";
            case "relaxed": return "/assets/mascot/shrimp-underwear.png";
            default: return "/assets/mascot/shrimp-happy.png";
        }
    };

    return (
        <div className={cn("relative transition-all duration-300 group", sizeClasses[size], className)}>
            {/* Shrimp Container */}
            <div
                className={cn(
                    "w-full h-full flex items-center justify-center", // Removed rounded-full/bg colors to let the doodle shine
                    "transition-all duration-300",
                    "group-hover:scale-110",
                    getAnimation(mood)
                )}
            >
                <div className="relative w-full h-full">
                    <img
                        src={getShrimpImage(mood)}
                        alt={`Shrimp ${mood}`}
                        className="w-full h-full object-contain drop-shadow-md"
                    />

                    {/* Decorative elements based on mood - kept as overlay */}
                    {mood === "thinking" && (
                        <div className="absolute -top-4 -right-2 text-2xl font-bold animate-pulse text-foreground">
                            ?
                        </div>
                    )}
                    {mood === "happy" && (
                        <div className="absolute -top-4 -right-2 text-2xl animate-pulse delay-100">
                            ✨
                        </div>
                    )}
                </div>
            </div>

            {/* Speech Bubble */}
            <div
                className={cn(
                    "absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap",
                    "bg-card dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg",
                    "text-xs font-medium text-gray-700 dark:text-gray-200",
                    "border border-gray-200 dark:border-gray-600",
                    "opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-300",
                    "pointer-events-none",
                    "before:content-[''] before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2",
                    "before:border-8 before:border-transparent before:border-b-white dark:before:border-b-gray-800"
                )}
            >
                {getMoodMessage(mood)}
            </div>
        </div>
    );
}
