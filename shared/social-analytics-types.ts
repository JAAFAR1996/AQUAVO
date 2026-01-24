/**
 * Social Media Analytics Types
 * Types for Facebook, Instagram, and TikTok analytics
 */

// ============================================
// Common Types
// ============================================

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok';

export interface SocialConnection {
  id: number;
  userId: number;
  platform: SocialPlatform;
  accessToken: string; // encrypted
  refreshToken?: string;
  expiresAt?: Date;
  pageId?: string;
  accountName?: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Demographics {
  ageGender: Record<string, number>;
  countries: Record<string, number>;
  cities: Record<string, number>;
}

export interface PostingTimeRecommendation {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23
  engagementScore: number;
}

// ============================================
// Facebook Types
// ============================================

export interface FacebookPageInsights {
  pageId: string;
  pageName: string;
  pageViews: number;
  pageEngagement: number;
  pageFans: number;
  fansDelta: number; // change from last period
  reachTotal: number;
  impressions: number;
  posts: FacebookPost[];
  demographics: Demographics;
  bestPostingTimes: PostingTimeRecommendation[];
  fetchedAt: Date;
}

export interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  fullPictureUrl?: string;
  permalinkUrl: string;
  createdTime: Date;
  type: 'video' | 'photo' | 'link' | 'status';
  insights: {
    reach: number;
    engagement: number;
    shares: number;
    comments: number;
    reactions: number;
    videoViews?: number;
    videoAvgWatchTime?: number;
  };
}

// ============================================
// Instagram Types
// ============================================

export interface InstagramInsights {
  accountId: string;
  username: string;
  followersCount: number;
  followersDelta: number;
  profileViews: number;
  reach: number;
  impressions: number;
  websiteClicks: number;
  media: InstagramMedia[];
  demographics: Demographics;
  bestPostingTimes: PostingTimeRecommendation[];
  fetchedAt: Date;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalinkUrl: string;
  timestamp: Date;
  insights: {
    views: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    reach: number;
    engagement: number;
    reelsPlaysCount?: number;
    reelsSkipRate?: number;
  };
}

// ============================================
// TikTok Types
// ============================================

export interface TikTokInsights {
  accountId: string;
  displayName: string;
  followersCount: number;
  followersDelta: number;
  profileViews: number;
  likesTotal: number;
  videos: TikTokVideo[];
  demographics: {
    ageGroups: Record<string, number>;
    gender: Record<string, number>;
    countries: Record<string, number>;
  };
  bestPostingTimes: PostingTimeRecommendation[];
  fetchedAt: Date;
}

export interface TikTokVideo {
  id: string;
  title?: string;
  description?: string;
  coverImageUrl?: string;
  shareUrl: string;
  createTime: Date;
  duration: number; // seconds
  insights: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    avgWatchTime: number;
    completionRate: number;
    reachTotal: number;
  };
}

// ============================================
// Unified Analytics Types
// ============================================

export interface UnifiedContent {
  id: string;
  platform: SocialPlatform;
  type: 'video' | 'photo' | 'carousel' | 'reel' | 'story' | 'link';
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  permalinkUrl: string;
  createdAt: Date;
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

export interface CrossPlatformAnalytics {
  totalFollowers: number;
  followersDelta: number;
  totalReach: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topContent: UnifiedContent[];
  platformBreakdown: {
    facebook?: FacebookPageInsights;
    instagram?: InstagramInsights;
    tiktok?: TikTokInsights;
  };
  recommendations: AnalyticsRecommendation[];
  lastUpdated: Date;
}

export interface AnalyticsRecommendation {
  type: 'posting_time' | 'content_type' | 'hashtag' | 'engagement' | 'growth';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface ConnectPlatformRequest {
  platform: SocialPlatform;
  authCode: string;
  redirectUri: string;
}

export interface ConnectPlatformResponse {
  success: boolean;
  connection?: SocialConnection;
  error?: string;
}

export interface FetchInsightsRequest {
  platform: SocialPlatform;
  dateRange?: {
    since: Date;
    until: Date;
  };
  metrics?: string[];
}

export interface FetchInsightsResponse<T> {
  success: boolean;
  data?: T;
  cached?: boolean;
  error?: string;
}

// ============================================
// OAuth Types
// ============================================

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}
