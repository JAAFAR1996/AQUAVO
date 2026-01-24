/**
 * Instagram Graph API Service
 * Handles Instagram Business/Creator Insights and analytics
 * Note: Instagram API uses the same Meta Graph API infrastructure
 */

import type {
    InstagramInsights,
    InstagramMedia,
    Demographics,
    PostingTimeRecommendation,
    OAuthTokenResponse,
} from '../../../shared/social-analytics-types';

// Instagram Graph API base URL (same as Facebook)
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// Required permissions for Instagram insights
const REQUIRED_PERMISSIONS = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
];

interface InstagramConfig {
    clientId: string; // Same as Facebook App ID
    clientSecret: string; // Same as Facebook App Secret
    redirectUri: string;
}

/**
 * Get Instagram OAuth configuration from environment
 */
function getConfig(): InstagramConfig {
    const clientId = process.env.FACEBOOK_APP_ID; // Instagram uses Facebook App
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.SOCIAL_OAUTH_CALLBACK_URL || 'http://localhost:5000/api/analytics/callback/instagram';

    if (!clientId || !clientSecret) {
        throw new Error('Instagram API credentials not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.');
    }

    return { clientId, clientSecret, redirectUri };
}

/**
 * Generate OAuth authorization URL for Instagram
 * Note: Uses Facebook's OAuth but with Instagram permissions
 */
export function getAuthorizationUrl(state: string): string {
    const config = getConfig();
    const scopes = REQUIRED_PERMISSIONS.join(',');

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        state,
        scope: scopes,
        response_type: 'code',
    });

    return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const config = getConfig();

    const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        code,
    });

    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Instagram token exchange failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        tokenType: data.token_type || 'bearer',
        expiresIn: data.expires_in || 5184000,
    };
}

/**
 * Get Instagram Business Account ID from Facebook Page
 */
export async function getInstagramBusinessAccount(
    pageId: string,
    pageAccessToken: string
): Promise<{ id: string; username: string; name: string; profilePictureUrl: string } | null> {
    const response = await fetch(
        `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
        return null;
    }

    const data = await response.json();
    const igAccount = data.instagram_business_account;

    if (!igAccount) {
        return null;
    }

    return {
        id: igAccount.id,
        username: igAccount.username,
        name: igAccount.name || igAccount.username,
        profilePictureUrl: igAccount.profile_picture_url || '',
    };
}

/**
 * Fetch Instagram Account Insights
 */
export async function fetchAccountInsights(
    igAccountId: string,
    accessToken: string,
    since?: Date,
    until?: Date
): Promise<InstagramInsights> {
    // Fetch account basic info
    const accountResponse = await fetch(
        `${GRAPH_API_BASE}/${igAccountId}?fields=id,username,name,followers_count,follows_count,media_count,profile_picture_url&access_token=${accessToken}`
    );
    const accountInfo = await accountResponse.json();

    // Fetch account insights (last 30 days by default)
    const sinceTimestamp = since ? Math.floor(since.getTime() / 1000) : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const untilTimestamp = until ? Math.floor(until.getTime() / 1000) : Math.floor(Date.now() / 1000);

    // New metrics for 2025 (views replaces impressions)
    const metricsToFetch = [
        'reach',
        'profile_views',
        'views', // New in 2025
        'website_clicks',
    ];

    const insightsResponse = await fetch(
        `${GRAPH_API_BASE}/${igAccountId}/insights?metric=${metricsToFetch.join(',')}&period=day&since=${sinceTimestamp}&until=${untilTimestamp}&access_token=${accessToken}`
    );

    let reach = 0;
    let profileViews = 0;
    let impressions = 0;
    let websiteClicks = 0;

    if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json();

        for (const metric of insightsData.data || []) {
            const totalValue = (metric.values || []).reduce((sum: number, v: any) => sum + (v.value || 0), 0);

            switch (metric.name) {
                case 'reach':
                    reach = totalValue;
                    break;
                case 'profile_views':
                    profileViews = totalValue;
                    break;
                case 'views':
                    impressions = totalValue;
                    break;
                case 'website_clicks':
                    websiteClicks = totalValue;
                    break;
            }
        }
    }

    // Fetch follower demographics (requires 100+ followers)
    const demographics = await fetchAccountDemographics(igAccountId, accessToken);

    // Fetch media (posts, reels, stories)
    const media = await fetchAccountMedia(igAccountId, accessToken, 25);

    // Calculate best posting times
    const bestPostingTimes = calculateBestPostingTimes(media);

    // Calculate followers delta (approximate from daily data)
    const followersDelta = 0; // Would need historical data comparison

    return {
        accountId: igAccountId,
        username: accountInfo.username || '',
        followersCount: accountInfo.followers_count || 0,
        followersDelta,
        profileViews,
        reach,
        impressions,
        websiteClicks,
        media,
        demographics,
        bestPostingTimes,
        fetchedAt: new Date(),
    };
}

/**
 * Fetch Instagram account media with insights
 */
async function fetchAccountMedia(
    igAccountId: string,
    accessToken: string,
    limit: number = 25
): Promise<InstagramMedia[]> {
    const response = await fetch(
        `${GRAPH_API_BASE}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,insights.metric(views,likes,comments,saved,shares,reach,engagement)&limit=${limit}&access_token=${accessToken}`
    );

    if (!response.ok) {
        console.error('Failed to fetch Instagram media');
        return [];
    }

    const data = await response.json();

    return (data.data || []).map((media: any) => {
        const insights = media.insights?.data || [];

        let views = 0;
        let likes = 0;
        let comments = 0;
        let saves = 0;
        let shares = 0;
        let reach = 0;
        let engagement = 0;

        for (const insight of insights) {
            const value = insight.values?.[0]?.value || 0;
            switch (insight.name) {
                case 'views':
                    views = value;
                    break;
                case 'likes':
                    likes = value;
                    break;
                case 'comments':
                    comments = value;
                    break;
                case 'saved':
                    saves = value;
                    break;
                case 'shares':
                    shares = value;
                    break;
                case 'reach':
                    reach = value;
                    break;
                case 'engagement':
                    engagement = value;
                    break;
            }
        }

        return {
            id: media.id,
            caption: media.caption,
            mediaType: media.media_type,
            mediaUrl: media.media_url,
            thumbnailUrl: media.thumbnail_url,
            permalinkUrl: media.permalink,
            timestamp: new Date(media.timestamp),
            insights: {
                views,
                likes,
                comments,
                saves,
                shares,
                reach,
                engagement: engagement || (likes + comments + saves + shares),
            },
        };
    });
}

/**
 * Fetch Instagram audience demographics
 * Note: Requires 100+ followers
 */
async function fetchAccountDemographics(
    igAccountId: string,
    accessToken: string
): Promise<Demographics> {
    const demographics: Demographics = {
        ageGender: {},
        countries: {},
        cities: {},
    };

    try {
        const response = await fetch(
            `${GRAPH_API_BASE}/${igAccountId}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=age,gender,country,city&access_token=${accessToken}`
        );

        if (!response.ok) {
            return demographics;
        }

        const data = await response.json();

        for (const metric of data.data || []) {
            const breakdown = metric.total_value?.breakdowns?.[0];
            if (!breakdown) continue;

            const results = breakdown.results || [];

            for (const result of results) {
                const dimensionValues = result.dimension_values || [];
                const value = result.value || 0;

                if (dimensionValues.includes('age') || dimensionValues.includes('gender')) {
                    const key = dimensionValues.join('_');
                    demographics.ageGender[key] = value;
                } else if (breakdown.dimension_keys?.includes('country')) {
                    demographics.countries[dimensionValues[0]] = value;
                } else if (breakdown.dimension_keys?.includes('city')) {
                    demographics.cities[dimensionValues[0]] = value;
                }
            }
        }
    } catch (error) {
        console.error('Failed to fetch Instagram demographics:', error);
    }

    return demographics;
}

/**
 * Calculate best posting times based on media engagement
 */
function calculateBestPostingTimes(media: InstagramMedia[]): PostingTimeRecommendation[] {
    const hourlyEngagement: Record<string, { total: number; count: number }> = {};

    for (const item of media) {
        const date = new Date(item.timestamp);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const key = `${dayOfWeek}-${hour}`;

        if (!hourlyEngagement[key]) {
            hourlyEngagement[key] = { total: 0, count: 0 };
        }

        hourlyEngagement[key].total += item.insights.engagement;
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
        const response = await fetch(
            `${GRAPH_API_BASE}/debug_token?input_token=${accessToken}&access_token=${accessToken}`
        );

        if (!response.ok) return false;

        const data = await response.json();
        return data.data?.is_valid === true;
    } catch {
        return false;
    }
}
