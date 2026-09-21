import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
// Using default English locale for dates
import {
    Calendar,
    Clock,
    Tag,
    ChevronLeft,
    Search,
    BookOpen,
    Lightbulb,
    Settings,
    Leaf,
    Fish,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { BlogArticle } from "@/data/blog-articles";
import { blogCardImage, blogThumbImage } from "@/lib/cloudinary";

// Category icon mapping
const categoryIcons: Record<BlogArticle["category"], React.ReactNode> = {
    "care-guide": <BookOpen className="w-4 h-4" />,
    tips: <Lightbulb className="w-4 h-4" />,
    equipment: <Settings className="w-4 h-4" />,
    plants: <Leaf className="w-4 h-4" />,
    fish: <Fish className="w-4 h-4" />,
};

const categoryLabels: Record<BlogArticle["category"], string> = {
    "care-guide": "دليل العناية",
    tips: "نصائح",
    equipment: "المعدات",
    plants: "النباتات",
    fish: "الأسماك",
};

// Blog Card Component
interface BlogCardProps {
    article: BlogArticle;
    featured?: boolean;
}

export function BlogCard({ article, featured = false }: BlogCardProps) {
    return (
        <Link href={`/blog/${article.slug}`}>
            <Card
                className={cn(
                    "group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer h-full",
                    featured && "md:col-span-2 md:row-span-2"
                )}
            >
                <div
                    className={cn(
                        "relative overflow-hidden",
                        featured ? "aspect-video md:aspect-[16/9]" : "aspect-video"
                    )}
                >
                    <img
                        src={blogCardImage(article.coverImage)}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                    {/* Category Badge */}
                    <Badge
                        className="absolute top-3 right-3 gap-1"
                        variant="secondary"
                    >
                        {categoryIcons[article.category]}
                        {categoryLabels[article.category]}
                    </Badge>

                    {/* Featured Badge */}
                    {article.featured && (
                        <Badge className="absolute top-3 left-3 bg-amber-500">مميز</Badge>
                    )}
                </div>

                <CardContent className="p-4">
                    <h3
                        className={cn(
                            "font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors",
                            featured ? "text-xl md:text-2xl" : "text-lg"
                        )}
                    >
                        {article.title}
                    </h3>

                    <p
                        className={cn(
                            "text-muted-foreground line-clamp-2 mb-3",
                            featured ? "text-base" : "text-sm"
                        )}
                    >
                        {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(article.publishedAt), "d MMM yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {article.readingTime} دقائق
                            </span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-primary group-hover:translate-x-[-4px] transition-transform" />
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

// Blog List Component
interface BlogListProps {
    articles: BlogArticle[];
    showSearch?: boolean;
    showCategories?: boolean;
}

export function BlogList({
    articles,
    showSearch = true,
    showCategories = true,
}: BlogListProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    const filteredArticles = articles.filter((article) => {
        const matchesSearch =
            !searchQuery ||
            article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
            selectedCategory === "all" || article.category === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    const featuredArticles = filteredArticles.filter((a) => a.featured);
    const regularArticles = filteredArticles.filter((a) => !a.featured);

    return (
        <div className="space-y-8">
            {/* Search and Filters */}
            {(showSearch || showCategories) && (
                <div className="flex flex-col md:flex-row gap-4">
                    {showSearch && (
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="ابحث في المقالات..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-10"
                            />
                        </div>
                    )}

                    {showCategories && (
                        <Tabs
                            value={selectedCategory}
                            onValueChange={setSelectedCategory}
                            className="w-full md:w-auto"
                        >
                            <TabsList className="w-full md:w-auto">
                                <TabsTrigger value="all">الكل</TabsTrigger>
                                <TabsTrigger value="care-guide">أدلة العناية</TabsTrigger>
                                <TabsTrigger value="tips">نصائح</TabsTrigger>
                                <TabsTrigger value="equipment">المعدات</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                </div>
            )}

            {/* Featured Articles */}
            {featuredArticles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {featuredArticles.slice(0, 2).map((article) => (
                        <BlogCard key={article.id} article={article} featured />
                    ))}
                </div>
            )}

            {/* Regular Articles */}
            {regularArticles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {regularArticles.map((article) => (
                        <BlogCard key={article.id} article={article} />
                    ))}
                </div>
            )}

            {/* No Results */}
            {filteredArticles.length === 0 && (
                <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">لا توجد مقالات</h3>
                    <p className="text-muted-foreground">
                        جرب البحث بكلمات مختلفة أو اختر فئة أخرى
                    </p>
                </div>
            )}
        </div>
    );
}

// Related Articles Component
interface RelatedArticlesProps {
    articles: BlogArticle[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
    if (articles.length === 0) return null;

    return (
        <Card className="mt-12">
            <CardHeader>
                <h3 className="text-xl font-bold">مقالات ذات صلة</h3>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {articles.map((article) => (
                    <Link key={article.id} href={`/blog/${article.slug}`}>
                        <div className="flex gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                            <img
                                src={blogThumbImage(article.coverImage)}
                                alt={article.title}
                                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                width={80}
                                height={80}
                                loading="lazy"
                                decoding="async"
                            />
                            <div className="min-w-0">
                                <h4 className="font-medium text-sm line-clamp-2 mb-1">
                                    {article.title}
                                </h4>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {article.readingTime} دقائق
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </CardContent>
        </Card>
    );
}

// Article Tags Component
export function ArticleTags({ tags }: { tags: string[] }) {
    return (
        <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
                <Badge key={tag} variant="outline" className="gap-1">
                    <Tag className="w-3 h-3" />
                    {tag}
                </Badge>
            ))}
        </div>
    );
}

// Video Embed Component
export function VideoEmbed({ url, title }: { url: string; title?: string }) {
    return (
        <div className="aspect-video rounded-lg overflow-hidden shadow-lg my-8">
            <iframe
                src={url}
                title={title || "فيديو تعليمي"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
            />
        </div>
    );
}

// Table of Contents Component
interface TOCItem {
    id: string;
    title: string;
    level: number;
}

export function TableOfContents({ items }: { items: TOCItem[] }) {
    return (
        <Card className="sticky top-24">
            <CardHeader className="pb-2">
                <h4 className="font-bold text-sm">محتويات المقال</h4>
            </CardHeader>
            <CardContent>
                <nav className="space-y-1">
                    {items.map((item) => (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            className={cn(
                                "block text-sm text-muted-foreground hover:text-foreground transition-colors",
                                item.level === 2 && "pr-2",
                                item.level === 3 && "pr-4"
                            )}
                        >
                            {item.title}
                        </a>
                    ))}
                </nav>
            </CardContent>
        </Card>
    );
}
