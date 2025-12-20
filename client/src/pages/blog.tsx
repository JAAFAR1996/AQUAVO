import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { WhatsAppWidget } from "@/components/whatsapp-widget";
import { BackToTop } from "@/components/back-to-top";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    BookOpen,
    Clock,
    User,
    ArrowLeft,
    Fish,
    Droplets,
    AlertTriangle,
    Sparkles,
    Filter,
    Leaf,
    Heart
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { blogPosts } from "@/lib/blog-data";

// Map icon strings to components
const iconMap: Record<string, React.ReactNode> = {
    Fish: <Fish className="w-5 h-5" />,
    AlertTriangle: <AlertTriangle className="w-5 h-5" />,
    Heart: <Heart className="w-5 h-5" />,
    Filter: <Filter className="w-5 h-5" />,
    Droplets: <Droplets className="w-5 h-5" />,
    Leaf: <Leaf className="w-5 h-5" />,
};

const categories = [
    { name: "الكل", count: blogPosts.length },
    { name: "للمبتدئين", count: blogPosts.filter(p => p.category === "للمبتدئين").length },
    { name: "نصائح", count: blogPosts.filter(p => p.category === "نصائح").length },
    { name: "أنواع الأسماك", count: blogPosts.filter(p => p.category === "أنواع الأسماك").length },
];

export default function Blog() {
    const [location, setLocation] = useLocation();
    const featuredPost = blogPosts.find((p) => p.featured);
    const regularPosts = blogPosts.filter((p) => !p.featured);

    return (
        <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30">
            <Navbar />

            {/* Hero Section - 2025 Premium Design */}
            <section className="relative pt-32 pb-16 overflow-hidden">
                {/* Ambient Background Glow */}
                <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl -z-10" />

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-8 backdrop-blur-md">
                            <Sparkles className="h-4 w-4 animate-pulse" />
                            <span className="font-bold text-sm tracking-wide">أحدث مقالات 2025</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
                            اكتشف أسرار <br />
                            <span className="text-primary italic">عالم البحار</span>
                        </h1>

                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            مساحتك المعرفية الموثوقة لكل ما يخص تربية الأسماك، تصميم الأحواض، والأنظمة البيئية المائية.
                        </p>
                    </motion.div>
                </div>
            </section>

            <main className="flex-1 pb-24">
                <div className="container mx-auto px-4">
                    {/* Categories Filter - Modern Pill Design */}
                    <div className="flex flex-wrap gap-3 mb-16 justify-center">
                        {categories.map((cat) => (
                            <Button
                                key={cat.name}
                                variant="ghost"
                                className={`rounded-full px-6 py-6 border transition-all duration-300 ${cat.name === "الكل"
                                    ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                                    : "bg-card hover:bg-muted border-border hover:border-primary/50"
                                    }`}
                            >
                                <span className="font-bold text-base">{cat.name}</span>
                                <Badge
                                    variant="secondary"
                                    className={`mr-2 ml-1 rounded-full px-2 ${cat.name === "الكل" ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                        }`}
                                >
                                    {cat.count}
                                </Badge>
                            </Button>
                        ))}
                    </div>

                    {/* Bento Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 auto-rows-[400px]">
                        {/* Featured Post - Large Block */}
                        {featuredPost && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="md:col-span-2 lg:col-span-2 row-span-2 relative group cursor-pointer rounded-3xl overflow-hidden border border-border/50 shadow-2xl"
                                onClick={() => setLocation(`/blog/${featuredPost.id}`)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
                                <img
                                    src={featuredPost.image}
                                    alt={featuredPost.title}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                />
                                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 z-20 flex flex-col items-start gap-4">
                                    <Badge className="bg-primary text-primary-foreground border-0 px-4 py-1.5 text-sm font-bold backdrop-blur-md shadow-lg shadow-primary/20">
                                        {iconMap[featuredPost.iconName]}
                                        <span className="mr-2">{featuredPost.category}</span>
                                    </Badge>
                                    <h2 className="text-3xl md:text-5xl font-black text-white leading-tight group-hover:text-primary transition-colors duration-300">
                                        {featuredPost.title}
                                    </h2>
                                    <p className="text-gray-300 text-lg line-clamp-2 max-w-2xl">
                                        {featuredPost.excerpt}
                                    </p>
                                    <div className="flex items-center gap-6 mt-4 text-white/80 font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                                <User className="w-4 h-4" />
                                            </div>
                                            {featuredPost.author}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            {featuredPost.readTime}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Regular Posts - Bento Blocks */}
                        {regularPosts.map((post, index) => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative group cursor-pointer rounded-3xl overflow-hidden border border-border/50 bg-card hover:border-primary/50 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5"
                                onClick={() => setLocation(`/blog/${post.id}`)}
                            >
                                <div className="h-full flex flex-col">
                                    <div className="relative h-48 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opactiy-60" />
                                        <img
                                            src={post.image}
                                            alt={post.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute top-4 right-4 z-20">
                                            <Badge variant="secondary" className="backdrop-blur-md bg-background/80 border-0">
                                                {iconMap[post.iconName]}
                                                <span className="mr-1">{post.category}</span>
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold mb-3 leading-snug group-hover:text-primary transition-colors">
                                            {post.title}
                                        </h3>
                                        <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
                                            {post.excerpt}
                                        </p>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto pt-4 border-t border-border/50">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {post.readTime}
                                            </span>
                                            <span className="font-medium text-primary cursor-pointer group-hover:underline">
                                                اقرأ المزيد &larr;
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {/* Newsletter Block - Bento Style */}
                        <div className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-primary via-primary/80 to-teal-600 rounded-3xl p-8 text-white flex flex-col justify-between relative overflow-hidden border border-white/10 shadow-2xl shadow-primary/20">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <BookOpen className="w-32 h-32 rotate-12" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">النشرة البريدية</h3>
                                <p className="text-white/90 mb-6 text-sm">
                                    انضم لأكثر من 5000 هاوي واحصل على نصائح أسبوعية مجانية.
                                </p>
                            </div>
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                // Logic similar to before
                                const emailInput = (e.target as HTMLFormElement).elements.namedItem('email') as HTMLInputElement;
                                const email = emailInput.value;
                                alert(`تم الاشتراك: ${email}`); // Placeholder for actual logic
                                emailInput.value = "";
                            }}>
                                <div className="space-y-3">
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="بريدك الإلكتروني"
                                        className="w-full px-4 py-3 rounded-xl bg-white/20 border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
                                    />
                                    <Button type="submit" className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold shadow-lg">
                                        اشترك الآن
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            </main>

            <WhatsAppWidget />
            <BackToTop />
            <Footer />
        </div>
    );
}
