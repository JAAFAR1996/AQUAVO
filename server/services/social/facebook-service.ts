/**
 * Facebook Graph API Service
 * Handles Facebook Page Insights and analytics
 */

import type {
    FacebookPageInsights,
    FacebookPost,
    Demographics,
    PostingTimeRecommendation,
    OAuthTokenResponse,
} from '../../../shared/social-analytics-types';

// Facebook Graph API base URL
const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

// Required permissions for page insights
const REQUIRED_PERMISSIONS = [
    'pages_show_list',
    'pages_read_engagement',
    'read_insights',
    'pages_read_user_content',
];

interface FacebookConfig {
    appId: string;
    appSecret: string;
    redirectUri: string;
}

/**
 * Get Facebook OAuth configuration from environment
 */
function getConfig(): FacebookConfig {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = process.env.SOCIAL_OAUTH_CALLBACK_URL || 'http://localhost:5000/api/analytics/callback/facebook';

    if (!appId || !appSecret) {
        throw new Error('Facebook API credentials not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET environment variables.');
    }

    return { appId, appSecret, redirectUri };
}

/**
 * Generate OAuth authorization URL for Facebook
 */
export function getAuthorizationUrl(state: string): string {
    const config = getConfig();
    const scopes = REQUIRED_PERMISSIONS.join(',');

    const params = new URLSearchParams({
        client_id: config.appId,
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
        client_id: config.appId,
        client_secret: config.appSecret,
        redirect_uri: config.redirectUri,
        code,
    });

    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Facebook token exchange failed: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        tokenType: data.token_type || 'bearer',
        expiresIn: data.expires_in || 5184000, // Default 60 days
    };
}

/**
 * Get long-lived page access token
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<OAuthTokenResponse> {
    const config = getConfig();

    const params = new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: config.appId,
        client_secret: config.appSecret,
        fb_exchange_token: shortLivedToken,
    });

    const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get long-lived token: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return {
        accessToken: data.access_token,
        tokenType: 'bearer',
        expiresIn: data.expires_in || 5184000,
    };
}

/**
 * Get user's managed pages
 */
export async function getManagedPages(accessToken: string): Promise<Array<{
    id: string;
    name: string;
    accessToken: string;
    category: string;
    pictureUrl: string;
}>> {
    const response = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,picture&access_token=${accessToken}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to get managed pages: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();

    return data.data.map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category,
        pictureUrl: page.picture?.data?.url || '',
    }));
}

/**
 * Fetch Facebook Page Insights
 */
export async function fetchPageInsights(
    pageId: string,
    pageAccessToken: string,
    since?: Date,
    until?: Date
): Promise<FacebookPageInsights> {
    const sinceTimestamp = since ? Math.floor(since.getTime() / 1000) : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const untilTimestamp = until ? Math.floor(until.getTime() / 1000) : Math.floor(Date.now() / 1000);

    // Fetch page basic info
    const pageInfoResponse = await fetch(
        `${GRAPH_API_BASE}/${pageId}?fields=id,name,fan_count,followers_count&access_token=${pageAccessToken}`
    );
    const pageInfo = await pageInfoResponse.json();

    // Fetch page insights metrics
    const metricsToFetch = [
        'page_views_total',
        'page_engaged_users',
        'page_impressions',
        'page_fan_adds',
        'page_fan_removes',
    ];

    const insightsResponse = await fetch(
        `${GRAPH_API_BASE}/${pageId}/insights?metric=${metricsToFetch.join(',')}&period=day&since=${sinceTimestamp}&until=${untilTimestamp}&access_token=${pageAccessToken}`
    );
    const insightsData = await insightsResponse.json();

    // Parse insights data
    let pageViews = 0;
    let pageEngagement = 0;
    let impressions = 0;
    let fansDelta = 0;

    if (insightsData.data) {
        for (const metric of insightsData.data) {
            const values = metric.values || [];
            const totalValue = values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);

            switch (metric.name) {
                case 'page_views_total':
                    pageViews = totalValue;
                    break;
                case 'page_engaged_users':
                    pageEngagement = totalValue;
                    break;
                case 'page_impressions':
                    impressions = totalValue;
                    break;
                case 'page_fan_adds':
                    fansDelta += totalValue;
                    break;
                case 'page_fan_removes':
                    fansDelta -= totalValue;
                    break;
            }
        }
    }

    // Fetch posts
    const posts = await fetchPagePosts(pageId, pageAccessToken, 25);

    // Fetch demographics
    const demographics = await fetchPageDemographics(pageId, pageAccessToken);

    // Calculate best posting times from post engagement
    const bestPostingTimes = calculateBestPostingTimes(posts);

    return {
        pageId,
        pageName: pageInfo.name || '',
        pageViews,
        pageEngagement,
        pageFans: pageInfo.fan_count || pageInfo.followers_count || 0,
        fansDelta,
        reachTotal: impressions, // Using impressions as reach approximation
        impressions,
        posts,
        demographics,
        bestPostingTimes,
        fetchedAt: new Date(),
    };
}

/**
 * Fetch page posts with insights
 */
async function fetchPagePosts(
    pageId: string,
    pageAccessToken: string,
    limit: number = 25
): Promise<FacebookPost[]> {
    const response = await fetch(
        `${GRAPH_API_BASE}/${pageId}/posts?fields=id,message,story,full_picture,permalink_url,created_time,type,insights.metric(post_impressions,post_engaged_users,post_clicks,post_reactions_by_type_total)&limit=${limit}&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
        console.error('Failed to fetch page posts');
        return [];
    }

    const data = await response.json();

    return (data.data || []).map((post: any) => {
        const insights = post.insights?.data || [];

        let reach = 0;
        let engagement = 0;
        let reactions = 0;

        for (const insight of insights) {
            const value = insight.values?.[0]?.value || 0;
            switch (insight.name) {
                case 'post_impressions':
                    reach = value;
                    break;
                case 'post_engaged_users':
                    engagement = value;
                    break;
                case 'post_reactions_by_type_total':
                    reactions = Object.values(value as Record<string, number>).reduce((a, b) => a + b, 0);
                    break;
            }
        }

        return {
            id: post.id,
            message: post.message,
            story: post.story,
            fullPictureUrl: post.full_picture,
            permalinkUrl: post.permalink_url,
            createdTime: new Date(post.created_time),
            type: post.type || 'status',
            insights: {
                reach,
                engagement,
                shares: 0, // Would need separate API call
                comments: 0,
                reactions,
            },
        };
    });
}

/**
 * Fetch page audience demographics
 */
async function fetchPageDemographics(
    pageId: string,
    pageAccessToken: string
): Promise<Demographics> {
    const response = await fetch(
        `${GRAPH_API_BASE}/${pageId}/insights?metric=page_fans_gender_age,page_fans_country,page_fans_city&period=lifetime&access_token=${pageAccessToken}`
    );

    const demographics: Demographics = {
        ageGender: {},
        countries: {},
        cities: {},
    };

    if (!response.ok) {
        return demographics;
    }

    const data = await response.json();

    for (const metric of data.data || []) {
        const value = metric.values?.[0]?.value || {};

        switch (metric.name) {
            case 'page_fans_gender_age':
                demographics.ageGender = value;
                break;
            case 'page_fans_country':
                demographics.countries = value;
                break;
            case 'page_fans_city':
                demographics.cities = value;
                break;
        }
    }

    return demographics;
}

/**
 * Calculate best posting times based on post engagement
 */
function calculateBestPostingTimes(posts: FacebookPost[]): PostingTimeRecommendation[] {
    const hourlyEngagement: Record<string, { total: number; count: number }> = {};

    for (const post of posts) {
        const date = new Date(post.createdTime);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const key = `${dayOfWeek}-${hour}`;

        if (!hourlyEngagement[key]) {
            hourlyEngagement[key] = { total: 0, count: 0 };
        }

        hourlyEngagement[key].total += post.insights.engagement;
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

    // Sort by engagement score descending
    return recommendations.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, 10);
}

/**
 * Validate and refresh token if needed
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

// --- Auto Responder APIs ---

export async function fetchFacebookComments(postId: string, pageAccessToken: string) {
    let allComments: any[] = [];
    let nextUrl: string | null = `${GRAPH_API_BASE}/${postId}/comments?fields=id,message,from,created_time&limit=100&access_token=${pageAccessToken}`;
    
    while (nextUrl) {
        const response = await fetch(nextUrl);
        if (!response.ok) {
            console.error('Failed to fetch FB comments:', await response.text());
            break;
        }
        const data = await response.json();
        if (data.data) {
            allComments = allComments.concat(data.data.map((c: any) => ({
                id: c.id,
                text: c.message,
                username: c.from?.name || 'unknown',
                timestamp: c.created_time
            })));
        }
        nextUrl = data.paging?.next || null;
    }
    return allComments;
}

export async function replyToFacebookComment(commentId: string, message: string, pageAccessToken: string) {
    const response = await fetch(`${GRAPH_API_BASE}/${commentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: pageAccessToken })
    });
    if (!response.ok) {
        throw new Error('Failed to post public reply: ' + await response.text());
    }
    return response.json();
}

export async function sendFacebookPrivateReply(commentId: string, message: string, pageAccessToken: string) {
    const response = await fetch(`${GRAPH_API_BASE}/${commentId}/private_replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, access_token: pageAccessToken })
    });
    if (!response.ok) {
        throw new Error('Failed to send private reply: ' + await response.text());
    }
    return response.json();
}

