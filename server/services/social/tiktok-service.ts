/**
 * TikTok API Service
 * Handles TikTok Creator/Business analytics
 */

import type {
    TikTokInsights,
    TikTokVideo,
    PostingTimeRecommendation,
    OAuthTokenResponse,
} from '../../../shared/social-analytics-types';

// TikTok API base URLs
const TIKTOK_AUTH_BASE = 'https://www.tiktok.com/v2/auth/authorize';
const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';

// Required scopes for TikTok analytics
const REQUIRED_SCOPES = [
    'user.info.basic',
    'user.info.profile',
    'user.info.stats',
    'video.list',
];

interface TikTokConfig {
    clientKey: string;
    clientSecret: string;
    redirectUri: string;
}

/**
 * Get TikTok OAuth configuration from environment
 */
function getConfig(): TikTokConfig {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const baseCallback = process.env.SOCIAL_OAUTH_CALLBACK_URL || 'http://localhost:5000/api/social-analytics/callback';
    const redirectUri = `${baseCallback}/tiktok`;

    if (!clientKey || !clientSecret) {
        throw new Error('TikTok API credentials not configured. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET environment variables.');
    }

    return { clientKey, clientSecret, redirectUri };
}

/**
 * Generate OAuth authorization URL for TikTok
 */
export function getAuthorizationUrl(state: string): string {
    const config = getConfig();
    const scopes = REQUIRED_SCOPES.join(',');

    const params = new URLSearchParams({
        client_key: config.clientKey,
        redirect_uri: config.redirectUri,
        state,
        scope: scopes,
        response_type: 'code',
    });

    return `${TIKTOK_AUTH_BASE}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const config = getConfig();

    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_key: config.clientKey,
            client_secret: config.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: config.redirectUri,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`TikTok token exchange failed: ${error.error_description || error.error || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in || 86400, // Default 24 hours
    };
}

/**
 * Refresh access token
 */
export async function refreshToken(refreshTokenValue: string): Promise<OAuthTokenResponse> {
    const config = getConfig();

    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_key: config.clientKey,
            client_secret: config.clientSecret,
            refresh_token: refreshTokenValue,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`TikTok token refresh failed: ${error.error_description || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: 'Bearer',
        expiresIn: data.expires_in || 86400,
    };
}

/**
 * Get user info
 */
export async function getUserInfo(accessToken: string): Promise<{
    id: string;
    displayName: string;
    avatarUrl: string;
    followerCount: number;
    followingCount: number;
    likesCount: number;
    videoCount: number;
}> {
    const response = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get TikTok user info: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const user = data.data?.user || {};

    return {
        id: user.open_id || user.union_id || '',
        displayName: user.display_name || '',
        avatarUrl: user.avatar_url || '',
        followerCount: user.follower_count || 0,
        followingCount: user.following_count || 0,
        likesCount: user.likes_count || 0,
        videoCount: user.video_count || 0,
    };
}

/**
 * Fetch TikTok Creator Insights
 */
export async function fetchCreatorInsights(
    accessToken: string,
    since?: Date,
    until?: Date
): Promise<TikTokInsights> {
    // Get user info first
    const userInfo = await getUserInfo(accessToken);

    // Fetch videos with metrics
    const videos = await fetchUserVideos(accessToken, 25);

    // Calculate total likes from videos
    const totalLikes = videos.reduce((sum, v) => sum + v.insights.likes, 0);

    // Calculate demographics (TikTok has limited API access for this)
    const demographics = await fetchAudienceDemographics(accessToken);

    // Calculate best posting times
    const bestPostingTimes = calculateBestPostingTimes(videos);

    return {
        accountId: userInfo.id,
        displayName: userInfo.displayName,
        followersCount: userInfo.followerCount,
        followersDelta: 0, // Would need historical data
        profileViews: 0, // Limited in API
        likesTotal: userInfo.likesCount || totalLikes,
        videos,
        demographics,
        bestPostingTimes,
        fetchedAt: new Date(),
    };
}

/**
 * Fetch user videos with insights
 */
async function fetchUserVideos(
    accessToken: string,
    maxCount: number = 25
): Promise<TikTokVideo[]> {
    const videos: TikTokVideo[] = [];

    try {
        const response = await fetch(`${TIKTOK_API_BASE}/video/list/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                max_count: maxCount,
                fields: [
                    'id',
                    'title',
                    'create_time',
                    'cover_image_url',
                    'share_url',
                    'duration',
                    'view_count',
                    'like_count',
                    'comment_count',
                    'share_count',
                ],
            }),
        });

        if (!response.ok) {
            console.error('Failed to fetch TikTok videos');
            return videos;
        }

        const data = await response.json();

        for (const video of data.data?.videos || []) {
            videos.push({
                id: video.id,
                title: video.title,
                description: video.title, // TikTok uses title as description
                coverImageUrl: video.cover_image_url,
                shareUrl: video.share_url,
                createTime: new Date(video.create_time * 1000),
                duration: video.duration || 0,
                insights: {
                    views: video.view_count || 0,
                    likes: video.like_count || 0,
                    comments: video.comment_count || 0,
                    shares: video.share_count || 0,
                    avgWatchTime: 0, // Would need separate analytics API
                    completionRate: 0,
                    reachTotal: video.view_count || 0,
                },
            });
        }
    } catch (error) {
        console.error('Error fetching TikTok videos:', error);
    }

    return videos;
}

/**
 * Fetch audience demographics
 * Note: TikTok API has limited demographic data access
 */
async function fetchAudienceDemographics(
    accessToken: string
): Promise<{
    ageGroups: Record<string, number>;
    gender: Record<string, number>;
    countries: Record<string, number>;
}> {
    // TikTok's public API has limited demographic access
    // This would require Creator Marketplace API or higher tier access
    return {
        ageGroups: {},
        gender: {},
        countries: {},
    };
}

/**
 * Calculate best posting times based on video performance
 */
function calculateBestPostingTimes(videos: TikTokVideo[]): PostingTimeRecommendation[] {
    const hourlyEngagement: Record<string, { total: number; count: number }> = {};

    for (const video of videos) {
        const date = new Date(video.createTime);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const key = `${dayOfWeek}-${hour}`;

        if (!hourlyEngagement[key]) {
            hourlyEngagement[key] = { total: 0, count: 0 };
        }

        const engagement = video.insights.likes + video.insights.comments + video.insights.shares;
        hourlyEngagement[key].total += engagement;
        hourlyEngagement[key].count += 1;
    }

    const recommendations: PostingTimeRecommendation[] = [];

    for (const [key, data] of Object.entries(hourlyEngagement)) {
        const [dayOfWeek, hour] = key.split('-').map(Number);
        const avgEngagement = data.total / data.count;

        recommendations.push({
            dayOfWeek,
            hour,
            engagementScore: avgEngagement,
        });
    }

    return recommendations.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 10);
}

/**
 * Validate access token
 */
export async function validateToken(accessToken: string): Promise<boolean> {
    try {
        await getUserInfo(accessToken);
        return true;
    } catch {
        return false;
    }
}
