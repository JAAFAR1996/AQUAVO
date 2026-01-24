/**
 * Unified Social Analytics Service
 * Combines data from all platforms into a unified view
 */

import { db } from '../../db.js';
import { socialConnections, socialAnalyticsCache } from '../../../shared/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import * as facebookService from './facebook-service.js';
import * as instagramService from './instagram-service.js';
import * as tiktokService from './tiktok-service.js';
import type {
    SocialPlatform,
    CrossPlatformAnalytics,
    UnifiedContent,
    AnalyticsRecommendation,
    FacebookPageInsights,
    InstagramInsights,
    TikTokInsights,
} from '../../../shared/social-analytics-types';

// Cache duration in milliseconds
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get all connected platforms for a user
 */
export async function getConnectedPlatforms(userId: string) {
    const connections = await db.query.socialConnections.findMany({
        where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.isActive, true)
        ),
    });

    return connections.map((c) => ({
        platform: c.platform as SocialPlatform,
        accountName: c.accountName,
        accountUsername: c.accountUsername,
        profileImageUrl: c.profileImageUrl,
        lastSyncAt: c.lastSyncAt,
        syncStatus: c.syncStatus,
    }));
}

/**
 * Get connection by platform
 */
export async function getConnection(userId: string, platform: SocialPlatform) {
    return await db.query.socialConnections.findFirst({
        where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.platform, platform),
            eq(socialConnections.isActive, true)
        ),
    });
}

/**
 * Save or update connection
 */
export async function saveConnection(
    userId: string,
    platform: SocialPlatform,
    data: {
        accessToken: string;
        refreshToken?: string;
        tokenExpiresAt?: Date;
        pageId?: string;
        accountId?: string;
        accountName?: string;
        accountUsername?: string;
        profileImageUrl?: string;
        permissions?: string[];
    }
) {
    const existing = await getConnection(userId, platform);

    if (existing) {
        await db
            .update(socialConnections)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(socialConnections.id, existing.id));
        return existing.id;
    } else {
        const [newConnection] = await db
            .insert(socialConnections)
            .values({
                userId,
                platform,
                ...data,
            })
            .returning();
        return newConnection.id;
    }
}

/**
 * Disconnect a platform
 */
export async function disconnectPlatform(userId: string, platform: SocialPlatform) {
    await db
        .update(socialConnections)
        .set({
            isActive: false,
            updatedAt: new Date(),
        })
        .where(
            and(
                eq(socialConnections.userId, userId),
                eq(socialConnections.platform, platform)
            )
        );
}

/**
 * Get cached analytics or fetch fresh data
 */
export async function getAnalytics<T>(
    connectionId: string,
    dataType: string,
    fetchFn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
    // Check cache first
    const cached = await db.query.socialAnalyticsCache.findFirst({
        where: and(
            eq(socialAnalyticsCache.connectionId, connectionId),
            eq(socialAnalyticsCache.dataType, dataType),
            gt(socialAnalyticsCache.expiresAt, new Date())
        ),
    });

    if (cached) {
        return { data: cached.data as T, cached: true };
    }

    // Fetch fresh data
    const freshData = await fetchFn();

    // Save to cache
    await db.insert(socialAnalyticsCache).values({
        connectionId,
        dataType,
        data: freshData as any,
        expiresAt: new Date(Date.now() + CACHE_DURATION),
    });

    return { data: freshData, cached: false };
}

/**
 * Fetch cross-platform analytics
 */
export async function fetchCrossPlatformAnalytics(
    userId: string
): Promise<CrossPlatformAnalytics> {
    const connections = await db.query.socialConnections.findMany({
        where: and(
            eq(socialConnections.userId, userId),
            eq(socialConnections.isActive, true)
        ),
    });

    let totalFollowers = 0;
    let followersDelta = 0;
    let totalReach = 0;
    let totalEngagement = 0;
    const allContent: UnifiedContent[] = [];
    const platformBreakdown: CrossPlatformAnalytics['platformBreakdown'] = {};

    for (const connection of connections) {
        try {
            switch (connection.platform) {
                case 'facebook': {
                    if (!connection.pageId) continue;
                    const { data } = await getAnalytics<FacebookPageInsights>(
                        connection.id,
                        'insights',
                        () => facebookService.fetchPageInsights(connection.pageId!, connection.accessToken)
                    );
                    platformBreakdown.facebook = data;
                    totalFollowers += data.pageFans;
                    followersDelta += data.fansDelta;
                    totalReach += data.reachTotal;
                    totalEngagement += data.pageEngagement;

                    // Convert to unified content
                    for (const post of data.posts.slice(0, 10)) {
                        allContent.push({
                            id: post.id,
                            platform: 'facebook',
                            type: post.type,
                            title: post.message?.substring(0, 100),
                            description: post.message,
                            thumbnailUrl: post.fullPictureUrl,
                            permalinkUrl: post.permalinkUrl,
                            createdAt: post.createdTime,
                            metrics: {
                                views: post.insights.reach,
                                likes: post.insights.reactions,
                                comments: post.insights.comments,
                                shares: post.insights.shares,
                                engagementRate: post.insights.reach > 0
                                    ? (post.insights.engagement / post.insights.reach) * 100
                                    : 0,
                            },
                            performance: 'average',
                        });
                    }
                    break;
                }
                case 'instagram': {
                    if (!connection.accountId) continue;
                    const { data } = await getAnalytics<InstagramInsights>(
                        connection.id,
                        'insights',
                        () => instagramService.fetchAccountInsights(connection.accountId!, connection.accessToken)
                    );
                    platformBreakdown.instagram = data;
                    totalFollowers += data.followersCount;
                    followersDelta += data.followersDelta;
                    totalReach += data.reach;
                    totalEngagement += data.media.reduce((sum, m) => sum + m.insights.engagement, 0);

                    // Convert to unified content
                    for (const media of data.media.slice(0, 10)) {
                        allContent.push({
                            id: media.id,
                            platform: 'instagram',
                            type: media.mediaType === 'REELS' ? 'reel' : media.mediaType.toLowerCase() as any,
                            title: media.caption?.substring(0, 100),
                            description: media.caption,
                            thumbnailUrl: media.thumbnailUrl || media.mediaUrl,
                            permalinkUrl: media.permalinkUrl,
                            createdAt: media.timestamp,
                            metrics: {
                                views: media.insights.views,
                                likes: media.insights.likes,
                                comments: media.insights.comments,
                                shares: media.insights.shares,
                                saves: media.insights.saves,
                                engagementRate: media.insights.reach > 0
                                    ? (media.insights.engagement / media.insights.reach) * 100
                                    : 0,
                            },
                            performance: 'average',
                        });
                    }
                    break;
                }
                case 'tiktok': {
                    const { data } = await getAnalytics<TikTokInsights>(
                        connection.id,
                        'insights',
                        () => tiktokService.fetchCreatorInsights(connection.accessToken)
                    );
                    platformBreakdown.tiktok = data;
                    totalFollowers += data.followersCount;
                    followersDelta += data.followersDelta;
                    totalEngagement += data.videos.reduce(
                        (sum, v) => sum + v.insights.likes + v.insights.comments + v.insights.shares,
                        0
                    );
                    totalReach += data.videos.reduce((sum, v) => sum + v.insights.views, 0);

                    // Convert to unified content
                    for (const video of data.videos.slice(0, 10)) {
                        allContent.push({
                            id: video.id,
                            platform: 'tiktok',
                            type: 'video',
                            title: video.title,
                            description: video.description,
                            thumbnailUrl: video.coverImageUrl,
                            permalinkUrl: video.shareUrl,
                            createdAt: video.createTime,
                            metrics: {
                                views: video.insights.views,
                                likes: video.insights.likes,
                                comments: video.insights.comments,
                                shares: video.insights.shares,
                                engagementRate: video.insights.views > 0
                                    ? ((video.insights.likes + video.insights.comments + video.insights.shares) / video.insights.views) * 100
                                    : 0,
                            },
                            performance: 'average',
                        });
                    }
                    break;
                }
            }

            // Update sync status
            await db
                .update(socialConnections)
                .set({
                    lastSyncAt: new Date(),
                    syncStatus: 'success',
                    syncError: null,
                })
                .where(eq(socialConnections.id, connection.id));
        } catch (error) {
            console.error(`Failed to fetch ${connection.platform} analytics:`, error);
            await db
                .update(socialConnections)
                .set({
                    syncStatus: 'failed',
                    syncError: error instanceof Error ? error.message : 'Unknown error',
                })
                .where(eq(socialConnections.id, connection.id));
        }
    }

    // Sort content by engagement and classify performance
    allContent.sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate);

    const avgEngagementRate = allContent.length > 0
        ? allContent.reduce((sum, c) => sum + c.metrics.engagementRate, 0) / allContent.length
        : 0;

    // Classify performance
    for (const content of allContent) {
        if (content.metrics.engagementRate > avgEngagementRate * 1.5) {
            content.performance = 'top';
        } else if (content.metrics.engagementRate > avgEngagementRate) {
            content.performance = 'above_average';
        } else if (content.metrics.engagementRate > avgEngagementRate * 0.5) {
            content.performance = 'average';
        } else {
            content.performance = 'below_average';
        }
    }

    // Generate recommendations
    const recommendations = generateRecommendations(platformBreakdown, allContent);

    return {
        totalFollowers,
        followersDelta,
        totalReach,
        totalEngagement,
        avgEngagementRate,
        topContent: allContent.slice(0, 10),
        platformBreakdown,
        recommendations,
        lastUpdated: new Date(),
    };
}

/**
 * Generate recommendations based on analytics data
 */
function generateRecommendations(
    platformBreakdown: CrossPlatformAnalytics['platformBreakdown'],
    allContent: UnifiedContent[]
): AnalyticsRecommendation[] {
    const recommendations: AnalyticsRecommendation[] = [];

    // Analyze best posting times
    const allBestTimes: { dayOfWeek: number; hour: number; platform: string }[] = [];

    if (platformBreakdown.facebook?.bestPostingTimes) {
        for (const time of platformBreakdown.facebook.bestPostingTimes.slice(0, 3)) {
            allBestTimes.push({ ...time, platform: 'Facebook' });
        }
    }
    if (platformBreakdown.instagram?.bestPostingTimes) {
        for (const time of platformBreakdown.instagram.bestPostingTimes.slice(0, 3)) {
            allBestTimes.push({ ...time, platform: 'Instagram' });
        }
    }
    if (platformBreakdown.tiktok?.bestPostingTimes) {
        for (const time of platformBreakdown.tiktok.bestPostingTimes.slice(0, 3)) {
            allBestTimes.push({ ...time, platform: 'TikTok' });
        }
    }

    if (allBestTimes.length > 0) {
        const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const topTime = allBestTimes[0];

        recommendations.push({
            type: 'posting_time',
            priority: 'high',
            title: 'أفضل وقت للنشر',
            description: `أفضل وقت للنشر هو يوم ${dayNames[topTime.dayOfWeek]} الساعة ${topTime.hour}:00`,
            actionItems: [
                `جدول منشوراتك في هذا الوقت`,
                `استخدم أدوات الجدولة التلقائية`,
            ],
        });
    }

    // Analyze content performance
    const topContent = allContent.filter((c) => c.performance === 'top');
    if (topContent.length > 0) {
        const topPlatforms = [...new Set(topContent.map((c) => c.platform))];

        recommendations.push({
            type: 'content_type',
            priority: 'medium',
            title: 'المحتوى الأفضل أداءً',
            description: `أفضل محتواك يأتي من: ${topPlatforms.join(', ')}`,
            actionItems: [
                `ركز على هذا النوع من المحتوى`,
                `حلل ما يميز هذه المنشورات`,
            ],
        });
    }

    // Engagement recommendation
    const avgEngagement = allContent.length > 0
        ? allContent.reduce((sum, c) => sum + c.metrics.engagementRate, 0) / allContent.length
        : 0;

    if (avgEngagement < 3) {
        recommendations.push({
            type: 'engagement',
            priority: 'high',
            title: 'تحسين التفاعل',
            description: 'معدل التفاعل منخفض نسبياً. جرب هذه النصائح:',
            actionItems: [
                'اطرح أسئلة في منشوراتك',
                'استخدم القصص التفاعلية',
                'رد على التعليقات بسرعة',
                'استخدم هاشتاقات مناسبة',
            ],
        });
    }

    return recommendations;
}

/**
 * Get best performing content across all platforms
 */
export async function getBestContent(
    userId: string,
    limit: number = 10
): Promise<UnifiedContent[]> {
    const analytics = await fetchCrossPlatformAnalytics(userId);
    return analytics.topContent.slice(0, limit);
}

/**
 * Clear cache for a connection
 */
export async function clearCache(connectionId: string) {
    await db
        .delete(socialAnalyticsCache)
        .where(eq(socialAnalyticsCache.connectionId, connectionId));
}
