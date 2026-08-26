import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { BlogPost } from "@shared/schema";
import { MetaTags, ArticleSchema } from "@/components/seo/meta-tags";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, User, Share2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import DOMPurify from 'isomorphic-dompurify';
import { blogHeroImage } from "@/lib/cloudinary";


export default function BlogPost() {
    const [match, params] = useRoute("/blog/:id");
    const slug = params?.id;

    const { data: post, isLoading, error } = useQuery<BlogPost>({
        queryKey: [`/api/blog/posts/${slug}`],
        enabled: !!slug
    });

    const { data: allPosts } = useQuery<BlogPost[]>({
        queryKey: ["/api/blog/posts"]
    });

    if (isLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!match || !post || error) {
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
        <div className="flex-1 flex flex-col bg-background font-sans">
            <MetaTags
                title={post.title}
                description={post.excerpt || post.title}
                image={post.imageUrl || undefined}
                type="article"
            />
            <ArticleSchema
                title={post.title}
                description={post.excerpt || post.title}
                image={post.imageUrl || "https://www.aquavoiq.com/brand/aquavo-v2-horizontal.png"}
                datePublished={post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date().toISOString()}
                author={post.author || "AQUAVO"}
            />
            <main id="main-content" className="flex-1 pb-20">
                {/* Hero Header */}
                <div className="relative h-[50vh] min-h-[400px]">
                    <div className="absolute inset-0">
                        {/* The article's LCP element: served WebP at hero width,
                            and eager/high-priority because it is above the fold. */}
                        <img
                            src={blogHeroImage(post.imageUrl) || "/brand/aquavo-v2-horizontal.png"}
                            alt={post.title}
                            className="w-full h-full object-cover"
                            loading="eager"
                            decoding="async"
                            fetchPriority="high"
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
                                    <span>
                                        {post.publishedAt
                                            ? new Date(post.publishedAt).toLocaleDateString('ar-IQ', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })
                                            : "تم النشر حديثاً"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    <span>{post.readTime}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-bold">
                                    <span>المشاهدات: {post.viewCount || 0}</span>
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
                                className="prose prose-lg dark:prose-invert max-w-none 
                                prose-headings:font-bold prose-headings:text-primary prose-headings:tracking-tight 
                                prose-p:text-foreground/90 prose-p:leading-relaxed prose-p:text-lg
                                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                                prose-blockquote:border-r-4 prose-blockquote:border-l-0 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:p-6 prose-blockquote:rounded-l-2xl prose-blockquote:text-lg prose-blockquote:font-medium prose-blockquote:italic
                                prose-li:marker:text-primary prose-img:rounded-3xl prose-img:shadow-2xl
                                mb-20"
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(post.content, {
                                        ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'br', 'blockquote', 'code', 'pre', 'img', 'div', 'span', 'section', 'article'],
                                        ALLOWED_ATTR: ['href', 'class', 'src', 'alt', 'title', 'target', 'rel', 'style']
                                    })
                                }}
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
                                    {allPosts && allPosts.filter(p => p.id !== post.id).slice(0, 3).map(related => (
                                        <Link key={related.id} href={`/blog/${related.slug}`}>
                                            <a className="flex gap-4 group cursor-pointer">
                                                <img src={related.imageUrl || "/brand/aquavo-v2-icon.svg"} alt={related.title} className="w-20 h-20 rounded-lg object-cover" />
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
        </div>
    );
}
