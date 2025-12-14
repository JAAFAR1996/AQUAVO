import { useRoute, Link } from "wouter";
import { blogPosts } from "@/lib/blog-data";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, User, Share2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";


export default function BlogPost() {
    const [match, params] = useRoute("/blog/:id");
    const post = blogPosts.find(p => p.id === params?.id);

    if (!match || !post) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold mb-4">المقال غير موجود</h1>
                <Link href="/blog">
                    <Button>العودة للمدونة</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans">
            <Navbar />

            <main className="flex-1 pb-20">
                {/* Hero Header */}
                <div className="relative h-[50vh] min-h-[400px]">
                    <div className="absolute inset-0">
                        <img
                            src={post.image}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    </div>

                    <div className="container mx-auto px-4 relative h-full flex flex-col justify-end pb-12">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="max-w-4xl"
                        >
                            <div className="flex gap-2 mb-4">
                                <Badge className="bg-primary hover:bg-primary/90 text-white text-lg px-4 py-1">
                                    {post.category}
                                </Badge>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-foreground drop-shadow-sm">
                                {post.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6 text-muted-foreground bg-background/50 backdrop-blur-sm p-4 rounded-xl w-fit border border-border/50">
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5" />
                                    <span className="font-medium">{post.author}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    <span>{post.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    <span>{post.readTime}</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Content Body */}
                <article className="container mx-auto px-4 mt-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                        <div className="lg:col-span-8">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:text-primary prose-img:rounded-2xl"
                                dangerouslySetInnerHTML={{ __html: post.content }}
                            />

                            <div className="mt-12 pt-8 border-t flex justify-between items-center">
                                <h3 className="font-bold text-xl">شارك المقال</h3>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="icon" className="rounded-full">
                                        <Share2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="lg:col-span-4 space-y-8">
                            <div className="bg-muted/30 p-6 rounded-2xl border sticky top-24">
                                <h3 className="font-bold text-lg mb-4">مقالات أخرى قد تهمك</h3>
                                <div className="space-y-4">
                                    {blogPosts.filter(p => p.id !== post.id).slice(0, 3).map(related => (
                                        <Link key={related.id} href={`/blog/${related.id}`}>
                                            <a className="flex gap-4 group cursor-pointer">
                                                <img src={related.image} alt={related.title} className="w-20 h-20 rounded-lg object-cover" />
                                                <div>
                                                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-2">
                                                        {related.title}
                                                    </h4>
                                                    <span className="text-xs text-muted-foreground mt-1 block">{related.category}</span>
                                                </div>
                                            </a>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </main>

            <Footer />
        </div>
    );
}
