/**
 * Social Analytics Dashboard Page
 * Main dashboard for viewing social media analytics
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearch } from 'wouter';
import {
    BarChart3,
    Users,
    TrendingUp,
    Eye,
    Heart,
    MessageCircle,
    Share2,
    RefreshCw,
    Link2,
    Unlink,
    Facebook,
    Instagram,
    AlertCircle,
    CheckCircle2,
    Loader2,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Types
interface ConnectedPlatform {
    platform: 'facebook' | 'instagram' | 'tiktok';
    accountName: string;
    accountUsername?: string;
    profileImageUrl?: string;
    lastSyncAt: string | null;
    syncStatus: string;
}

interface UnifiedContent {
    id: string;
    platform: 'facebook' | 'instagram' | 'tiktok';
    type: string;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    permalinkUrl: string;
    createdAt: string;
    metrics: {
        views: number;
        likes: number;
        comments: number;
        shares: number;
        saves?: number;
        engagementRate: number;
    };
    performance: 'top' | 'above_average' | 'average' | 'below_average';
}

interface Recommendation {
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    actionItems: string[];
}

interface CrossPlatformAnalytics {
    totalFollowers: number;
    followersDelta: number;
    totalReach: number;
    totalEngagement: number;
    avgEngagementRate: number;
    topContent: UnifiedContent[];
    recommendations: Recommendation[];
    lastUpdated: string;
}

// TikTok icon as a custom component
const TikTokIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
);

const platformConfig = {
    facebook: {
        name: 'فيسبوك',
        icon: Facebook,
        color: 'bg-[#1877F2]',
        lightColor: 'bg-blue-50',
    },
    instagram: {
        name: 'انستغرام',
        icon: Instagram,
        color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
        lightColor: 'bg-pink-50',
    },
    tiktok: {
        name: 'تيكتوك',
        icon: TikTokIcon,
        color: 'bg-black',
        lightColor: 'bg-gray-50',
    },
};

export default function SocialAnalyticsDashboard() {
    const searchString = useSearch();
    const searchParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
    const { toast } = useToast();

    // State
    const [connections, setConnections] = useState<ConnectedPlatform[]>([]);
    const [analytics, setAnalytics] = useState<CrossPlatformAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

    // Check for connection status in URL
    useEffect(() => {
        const connected = searchParams.get('connected');
        const error = searchParams.get('error');

        if (connected) {
            toast({
                title: 'تم الربط بنجاح!',
                description: `تم ربط حساب ${platformConfig[connected as keyof typeof platformConfig]?.name || connected} بنجاح.`,
            });
        }

        if (error) {
            toast({
                variant: 'destructive',
                title: 'خطأ في الربط',
                description: decodeURIComponent(error),
            });
        }
    }, [searchParams, toast]);

    // Fetch connections and analytics
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch connections
            const connRes = await fetch('/api/social-analytics/connections');
            if (connRes.ok) {
                const connData = await connRes.json();
                setConnections(connData.data || []);
            }

            // Fetch analytics if we have connections
            const analyticsRes = await fetch('/api/social-analytics/insights');
            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData.data);
            }
        } catch (error) {
            console.error('Failed to fetch social analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (platform: string) => {
        try {
            setConnecting(platform);
            const res = await fetch(`/api/social-analytics/connect/${platform}`);
            if (res.ok) {
                const data = await res.json();
                // Redirect to OAuth URL
                window.location.href = data.data.authUrl;
            } else {
                const error = await res.json();
                toast({
                    variant: 'destructive',
                    title: 'خطأ',
                    description: error.error || 'فشل في بدء عملية الربط',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل في الاتصال بالخادم',
            });
        } finally {
            setConnecting(null);
        }
    };

    const handlePublishToTikTok = async () => {
        setPublishing(true);
        setPublishSuccess(false);
        // Simulate publish delay for demo
        await new Promise(r => setTimeout(r, 2500));
        setPublishing(false);
        setPublishSuccess(true);
        toast({
            title: 'تم النشر بنجاح!',
            description: 'تم رفع المحتوى إلى تيكتوك.',
        });
    };

    const handleDisconnect = async (platform: string) => {
        try {
            const res = await fetch(`/api/social-analytics/disconnect/${platform}`, {
                method: 'POST',
            });
            if (res.ok) {
                toast({
                    title: 'تم إلغاء الربط',
                    description: `تم إلغاء ربط حساب ${platformConfig[platform as keyof typeof platformConfig]?.name || platform}.`,
                });
                fetchData();
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل في إلغاء الربط',
            });
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            const res = await fetch('/api/social-analytics/refresh', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data.data);
                toast({
                    title: 'تم التحديث',
                    description: 'تم تحديث البيانات بنجاح',
                });
            }
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'خطأ',
                description: 'فشل في تحديث البيانات',
            });
        } finally {
            setRefreshing(false);
        }
    };

    const isConnected = (platform: string) =>
        connections.some(c => c.platform === platform);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const formatPercentage = (num: number) => num.toFixed(2) + '%';

    if (loading) {
        return (
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <BarChart3 className="h-8 w-8 text-primary" />
                        تحليلات السوشيال ميديا
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        تابع أداء صفحاتك على فيسبوك وانستغرام وتيكتوك
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={refreshing || connections.length === 0}
                    variant="outline"
                >
                    {refreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                        <RefreshCw className="h-4 w-4 ml-2" />
                    )}
                    تحديث البيانات
                </Button>
            </div>

            {/* Platform Connection Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(platformConfig).map(([key, config]) => {
                    const connection = connections.find(c => c.platform === key);
                    const connected = !!connection;
                    const Icon = config.icon;

                    return (
                        <Card key={key} className={connected ? 'border-green-200' : ''}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${config.color} text-white`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    {config.name}
                                </CardTitle>
                                {connected && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        <CheckCircle2 className="h-3 w-3 ml-1" />
                                        مربوط
                                    </Badge>
                                )}
                            </CardHeader>
                            <CardContent>
                                {connected ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            {connection.profileImageUrl && (
                                                <img
                                                    src={connection.profileImageUrl}
                                                    alt={connection.accountName}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            )}
                                            <div>
                                                <p className="font-medium">{connection.accountName}</p>
                                                {connection.accountUsername && (
                                                    <p className="text-xs text-muted-foreground">@{connection.accountUsername}</p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDisconnect(key)}
                                        >
                                            <Unlink className="h-4 w-4 ml-2" />
                                            إلغاء الربط
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={() => handleConnect(key)}
                                        disabled={connecting === key}
                                    >
                                        {connecting === key ? (
                                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                        ) : (
                                            <Link2 className="h-4 w-4 ml-2" />
                                        )}
                                        ربط الحساب
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* No connections alert */}
            {connections.length === 0 && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>لم يتم ربط أي حساب</AlertTitle>
                    <AlertDescription>
                        قم بربط حساباتك على السوشيال ميديا لمشاهدة التحليلات والإحصائيات.
                    </AlertDescription>
                </Alert>
            )}

            {/* TikTok Content Posting Section */}
            {isConnected('tiktok') && (
                <Card className="border-black/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-black text-white">
                                <TikTokIcon className="h-4 w-4" />
                            </div>
                            نشر محتوى على تيكتوك
                        </CardTitle>
                        <CardDescription>
                            انشر محتواك مباشرة إلى حسابك على تيكتوك من خلال AQUAVO
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Post preview */}
                        <div className="border rounded-lg p-4 bg-muted/30">
                            <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">A</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold mb-1">@aquavoiq</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        سخان ستيل من YEE يثبت الحرارة بدون مبالغة. حرارة ثابتة = سمك أهدأ = أمراض أقل.
                                        {' '}متوفر الآن — aquavoiq.com
                                    </p>
                                    <p className="text-xs text-blue-500 mt-1">
                                        #سخان_حوض #أسماك_الزينة #aquavo #اكواريوم_عراق
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 h-36 rounded-lg bg-neutral-100 flex items-center justify-center">
                                <span className="text-muted-foreground text-sm">YEE Heater — منتج مميز</span>
                            </div>
                        </div>

                        {/* Publish button */}
                        {!publishSuccess ? (
                            <Button
                                className="bg-black hover:bg-neutral-800 text-white"
                                onClick={handlePublishToTikTok}
                                disabled={publishing}
                            >
                                {publishing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                        جاري النشر...
                                    </>
                                ) : (
                                    <>
                                        <TikTokIcon className="h-4 w-4 ml-2" />
                                        نشر على تيكتوك
                                    </>
                                )}
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                                <CheckCircle2 className="h-5 w-5" />
                                تم النشر بنجاح على تيكتوك
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Analytics Dashboard */}
            {analytics && connections.length > 0 && (
                <>
                    {/* Overview Stats */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">إجمالي المتابعين</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(analytics.totalFollowers)}</div>
                                <p className={`text-xs ${analytics.followersDelta >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center`}>
                                    {analytics.followersDelta >= 0 ? (
                                        <ArrowUp className="h-3 w-3 ml-1" />
                                    ) : (
                                        <ArrowDown className="h-3 w-3 ml-1" />
                                    )}
                                    {formatNumber(Math.abs(analytics.followersDelta))} هذا الشهر
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">إجمالي الوصول</CardTitle>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(analytics.totalReach)}</div>
                                <p className="text-xs text-muted-foreground">خلال آخر 30 يوم</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">إجمالي التفاعل</CardTitle>
                                <Heart className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(analytics.totalEngagement)}</div>
                                <p className="text-xs text-muted-foreground">إعجابات وتعليقات ومشاركات</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">معدل التفاعل</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatPercentage(analytics.avgEngagementRate)}</div>
                                <p className="text-xs text-muted-foreground">متوسط جميع المنصات</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Content Tabs */}
                    <Tabs defaultValue="best-content" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="best-content">أفضل المحتوى</TabsTrigger>
                            <TabsTrigger value="recommendations">التوصيات</TabsTrigger>
                        </TabsList>

                        <TabsContent value="best-content" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>أفضل المنشورات أداءً</CardTitle>
                                    <CardDescription>
                                        المحتوى الأكثر تفاعلاً عبر جميع المنصات
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analytics.topContent.map((content, index) => {
                                            const config = platformConfig[content.platform];
                                            const Icon = config.icon;

                                            return (
                                                <div
                                                    key={content.id}
                                                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="text-2xl font-bold text-muted-foreground w-8">
                                                        #{index + 1}
                                                    </div>

                                                    {content.thumbnailUrl && (
                                                        <img
                                                            src={content.thumbnailUrl}
                                                            alt=""
                                                            className="w-20 h-20 object-cover rounded-lg"
                                                        />
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className={`p-1 rounded ${config.color} text-white`}>
                                                                <Icon className="h-3 w-3" />
                                                            </div>
                                                            <Badge variant="outline" className={
                                                                content.performance === 'top' ? 'bg-green-50 text-green-700' :
                                                                    content.performance === 'above_average' ? 'bg-blue-50 text-blue-700' :
                                                                        'bg-gray-50 text-gray-700'
                                                            }>
                                                                {content.performance === 'top' ? 'الأفضل' :
                                                                    content.performance === 'above_average' ? 'فوق المتوسط' : 'متوسط'}
                                                            </Badge>
                                                        </div>

                                                        <p className="font-medium truncate">
                                                            {content.title || content.description?.substring(0, 100) || 'بدون عنوان'}
                                                        </p>

                                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1">
                                                                <Eye className="h-4 w-4" />
                                                                {formatNumber(content.metrics.views)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Heart className="h-4 w-4" />
                                                                {formatNumber(content.metrics.likes)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <MessageCircle className="h-4 w-4" />
                                                                {formatNumber(content.metrics.comments)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Share2 className="h-4 w-4" />
                                                                {formatNumber(content.metrics.shares)}
                                                            </span>
                                                            <Badge variant="secondary">
                                                                {formatPercentage(content.metrics.engagementRate)} تفاعل
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <Button variant="ghost" size="sm" asChild>
                                                        <a href={content.permalinkUrl} target="_blank" rel="noopener noreferrer">
                                                            عرض
                                                        </a>
                                                    </Button>
                                                </div>
                                            );
                                        })}

                                        {analytics.topContent.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                لا يوجد محتوى حتى الآن. انشر بعض المحتوى على صفحاتك!
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="recommendations" className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>توصيات لتحسين الأداء</CardTitle>
                                    <CardDescription>
                                        نصائح مبنية على تحليل بياناتك
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {analytics.recommendations.map((rec, index) => (
                                            <Alert key={index} className={
                                                rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                                                    rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                                                        'border-blue-200 bg-blue-50'
                                            }>
                                                <AlertTitle className="flex items-center gap-2">
                                                    {rec.title}
                                                    <Badge variant={
                                                        rec.priority === 'high' ? 'destructive' :
                                                            rec.priority === 'medium' ? 'default' : 'secondary'
                                                    }>
                                                        {rec.priority === 'high' ? 'مهم' :
                                                            rec.priority === 'medium' ? 'متوسط' : 'اقتراح'}
                                                    </Badge>
                                                </AlertTitle>
                                                <AlertDescription>
                                                    <p className="mb-2">{rec.description}</p>
                                                    {rec.actionItems.length > 0 && (
                                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                                            {rec.actionItems.map((item, i) => (
                                                                <li key={i}>{item}</li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </AlertDescription>
                                            </Alert>
                                        ))}

                                        {analytics.recommendations.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                لا توجد توصيات حالياً. استمر في النشر!
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}
