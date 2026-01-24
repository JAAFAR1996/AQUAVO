/**
 * Social Media Analytics API Routes
 * OAuth handlers and social analytics endpoints
 */

import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import * as facebookService from '../services/social/facebook-service';
import * as instagramService from '../services/social/instagram-service';
import * as tiktokService from '../services/social/tiktok-service';
import * as unifiedAnalytics from '../services/social/unified-analytics';
import type { SocialPlatform } from '../../shared/social-analytics-types';

// Augment express-session types
declare module 'express-session' {
    interface SessionData {
        userId: string;
    }
}

const router = Router();

// Store OAuth states temporarily (in production, use Redis or database)
const oauthStates = new Map<string, { userId: string; platform: SocialPlatform; createdAt: Date }>();

// Clean up expired states every hour
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates) {
        if (now - data.createdAt.getTime() > 10 * 60 * 1000) { // 10 minutes
            oauthStates.delete(state);
        }
    }
}, 60 * 60 * 1000);

/**
 * Middleware to require authentication
 */
function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.session?.userId) {
        return res.status(401).json({
            success: false,
            error: 'يجب تسجيل الدخول',
            code: 'AUTH_REQUIRED',
        });
    }
    next();
}

// ============================================
// OAuth Connection Endpoints
// ============================================

/**
 * GET /api/social-analytics/connect/:platform
 * Initiate OAuth flow for a platform
 */
router.get('/connect/:platform', requireAuth, (req: Request, res: Response) => {
    const platform = req.params.platform as SocialPlatform;

    if (!['facebook', 'instagram', 'tiktok'].includes(platform)) {
        return res.status(400).json({
            success: false,
            error: 'منصة غير صحيحة',
            code: 'INVALID_PLATFORM',
        });
    }

    try {
        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        oauthStates.set(state, {
            userId: req.session!.userId,
            platform,
            createdAt: new Date(),
        });

        let authUrl: string;

        switch (platform) {
            case 'facebook':
                authUrl = facebookService.getAuthorizationUrl(state);
                break;
            case 'instagram':
                authUrl = instagramService.getAuthorizationUrl(state);
                break;
            case 'tiktok':
                authUrl = tiktokService.getAuthorizationUrl(state);
                break;
            default:
                throw new Error('Unsupported platform');
        }

        res.json({
            success: true,
            data: { authUrl },
        });
    } catch (error) {
        console.error(`OAuth init error for ${platform}:`, error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'فشل في بدء عملية الربط',
            code: 'OAUTH_INIT_ERROR',
        });
    }
});

/**
 * GET /api/social-analytics/callback/:platform
 * OAuth callback handler
 */
router.get('/callback/:platform', async (req: Request, res: Response) => {
    const platform = req.params.platform as SocialPlatform;
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
        console.error(`OAuth error for ${platform}:`, error_description || error);
        return res.redirect(`/admin/social-analytics?error=${encodeURIComponent(String(error_description || error))}`);
    }

    // Validate state
    const stateData = oauthStates.get(String(state));
    if (!stateData || stateData.platform !== platform) {
        return res.redirect('/admin/social-analytics?error=invalid_state');
    }

    oauthStates.delete(String(state));

    try {
        let tokenData;
        let accountData: any = {};

        switch (platform) {
            case 'facebook': {
                // Exchange code for token
                tokenData = await facebookService.exchangeCodeForToken(String(code));

                // Get long-lived token
                const longLivedToken = await facebookService.getLongLivedToken(tokenData.accessToken);
                tokenData.accessToken = longLivedToken.accessToken;
                tokenData.expiresIn = longLivedToken.expiresIn;

                // Get managed pages
                const pages = await facebookService.getManagedPages(tokenData.accessToken);
                if (pages.length === 0) {
                    return res.redirect('/admin/social-analytics?error=no_pages');
                }

                // Use the first page (or could prompt user to select)
                const page = pages[0];
                accountData = {
                    pageId: page.id,
                    accountName: page.name,
                    profileImageUrl: page.pictureUrl,
                    accessToken: page.accessToken, // Use page token
                };
                break;
            }

            case 'instagram': {
                tokenData = await instagramService.exchangeCodeForToken(String(code));

                // Get Facebook pages first
                const pages = await facebookService.getManagedPages(tokenData.accessToken);

                // Find Instagram business account linked to a page
                for (const page of pages) {
                    const igAccount = await instagramService.getInstagramBusinessAccount(page.id, page.accessToken);
                    if (igAccount) {
                        accountData = {
                            pageId: page.id,
                            accountId: igAccount.id,
                            accountName: igAccount.name,
                            accountUsername: igAccount.username,
                            profileImageUrl: igAccount.profilePictureUrl,
                            accessToken: page.accessToken,
                        };
                        break;
                    }
                }

                if (!accountData.accountId) {
                    return res.redirect('/admin/social-analytics?error=no_instagram_account');
                }
                break;
            }

            case 'tiktok': {
                tokenData = await tiktokService.exchangeCodeForToken(String(code));

                // Get user info
                const userInfo = await tiktokService.getUserInfo(tokenData.accessToken);
                accountData = {
                    accountId: userInfo.id,
                    accountName: userInfo.displayName,
                    profileImageUrl: userInfo.avatarUrl,
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                };
                break;
            }
        }

        // Save connection
        await unifiedAnalytics.saveConnection(stateData.userId, platform, {
            accessToken: accountData.accessToken || tokenData.accessToken,
            refreshToken: accountData.refreshToken || tokenData.refreshToken,
            tokenExpiresAt: new Date(Date.now() + (tokenData.expiresIn || 0) * 1000),
            pageId: accountData.pageId,
            accountId: accountData.accountId,
            accountName: accountData.accountName,
            accountUsername: accountData.accountUsername,
            profileImageUrl: accountData.profileImageUrl,
        });

        res.redirect('/admin/social-analytics?connected=' + platform);
    } catch (error) {
        console.error(`OAuth callback error for ${platform}:`, error);
        res.redirect(`/admin/social-analytics?error=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`);
    }
});

/**
 * POST /api/social-analytics/disconnect/:platform
 * Disconnect a platform
 */
router.post('/disconnect/:platform', requireAuth, async (req: Request, res: Response) => {
    const platform = req.params.platform as SocialPlatform;

    try {
        await unifiedAnalytics.disconnectPlatform(req.session!.userId, platform);

        res.json({
            success: true,
            message: 'تم إلغاء الربط بنجاح',
        });
    } catch (error) {
        console.error(`Disconnect error for ${platform}:`, error);
        res.status(500).json({
            success: false,
            error: 'فشل في إلغاء الربط',
            code: 'DISCONNECT_ERROR',
        });
    }
});

// ============================================
// Analytics Endpoints
// ============================================

/**
 * GET /api/social-analytics/connections
 * Get all connected platforms
 */
router.get('/connections', requireAuth, async (req: Request, res: Response) => {
    try {
        const connections = await unifiedAnalytics.getConnectedPlatforms(req.session!.userId);

        res.json({
            success: true,
            data: connections,
        });
    } catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب الاتصالات',
            code: 'GET_CONNECTIONS_ERROR',
        });
    }
});

/**
 * GET /api/social-analytics/insights
 * Get cross-platform analytics
 */
router.get('/insights', requireAuth, async (req: Request, res: Response) => {
    try {
        const analytics = await unifiedAnalytics.fetchCrossPlatformAnalytics(req.session!.userId);

        res.json({
            success: true,
            data: analytics,
        });
    } catch (error) {
        console.error('Get insights error:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب التحليلات',
            code: 'GET_INSIGHTS_ERROR',
        });
    }
});

/**
 * GET /api/social-analytics/best-content
 * Get best performing content
 */
router.get('/best-content', requireAuth, async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    try {
        const content = await unifiedAnalytics.getBestContent(req.session!.userId, Math.min(limit, 50));

        res.json({
            success: true,
            data: content,
        });
    } catch (error) {
        console.error('Get best content error:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب أفضل المحتوى',
            code: 'GET_BEST_CONTENT_ERROR',
        });
    }
});

/**
 * POST /api/social-analytics/refresh
 * Force refresh analytics data (clears cache)
 */
router.post('/refresh', requireAuth, async (req: Request, res: Response) => {
    const { platform } = req.body;

    try {
        if (platform) {
            const connection = await unifiedAnalytics.getConnection(req.session!.userId, platform);
            if (connection) {
                await unifiedAnalytics.clearCache(connection.id);
            }
        }

        // Fetch fresh data
        const analytics = await unifiedAnalytics.fetchCrossPlatformAnalytics(req.session!.userId);

        res.json({
            success: true,
            data: analytics,
            message: 'تم تحديث البيانات',
        });
    } catch (error) {
        console.error('Refresh analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'فشل في تحديث البيانات',
            code: 'REFRESH_ERROR',
        });
    }
});

/**
 * GET /api/social-analytics/insights/:platform
 * Get platform-specific insights
 */
router.get('/insights/:platform', requireAuth, async (req: Request, res: Response) => {
    const platform = req.params.platform as SocialPlatform;

    try {
        const connection = await unifiedAnalytics.getConnection(req.session!.userId, platform);

        if (!connection) {
            return res.status(404).json({
                success: false,
                error: 'الحساب غير مربوط',
                code: 'NOT_CONNECTED',
            });
        }

        let insights;

        switch (platform) {
            case 'facebook':
                if (!connection.pageId) throw new Error('No page ID');
                insights = await facebookService.fetchPageInsights(connection.pageId, connection.accessToken);
                break;
            case 'instagram':
                if (!connection.accountId) throw new Error('No account ID');
                insights = await instagramService.fetchAccountInsights(connection.accountId, connection.accessToken);
                break;
            case 'tiktok':
                insights = await tiktokService.fetchCreatorInsights(connection.accessToken);
                break;
            default:
                throw new Error('Invalid platform');
        }

        res.json({
            success: true,
            data: insights,
        });
    } catch (error) {
        console.error(`Get ${platform} insights error:`, error);
        res.status(500).json({
            success: false,
            error: 'فشل في جلب تحليلات المنصة',
            code: 'GET_PLATFORM_INSIGHTS_ERROR',
        });
    }
});

export default router;
