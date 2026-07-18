import { useQuery } from "@tanstack/react-query";
import { Smile, Meh, Frown, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SentimentData {
  averageScore: number;
  totalMessages: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trend: "improving" | "stable" | "declining";
  recentEmotions?: Array<{ emotion: string; count: number }>;
}

interface SentimentIndicatorProps {
  userId?: string;
  days?: number;
  compact?: boolean;
}

export default function SentimentIndicator({
  userId,
  days = 30,
  compact = false,
}: SentimentIndicatorProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["sentiment-average", userId, days],
    queryFn: async () => {
      if (!userId) return null;

      const response = await fetch(
        `/api/ai-advanced/sentiment/average/${userId}?days=${days}`
      );

      if (!response.ok) {
        throw new Error("فشل جلب بيانات المشاعر");
      }

      const result = await response.json();
      return result.data as SentimentData;
    },
    enabled: !!userId,
  });

  if (!userId || isLoading || !data) {
    return null;
  }

  const getSentimentIcon = (score: number) => {
    if (score > 0.2) return <Smile className="w-5 h-5 text-green-600" />;
    if (score < -0.2) return <Frown className="w-5 h-5 text-red-600" />;
    return <Meh className="w-5 h-5 text-yellow-600" />;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving")
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === "declining")
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.5) return "ممتاز جداً";
    if (score > 0.2) return "جيد";
    if (score > -0.2) return "محايد";
    if (score > -0.5) return "سلبي قليلاً";
    return "يحتاج دعم";
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.2) return "bg-green-100 text-green-800 border-green-300";
    if (score < -0.2) return "bg-red-100 text-red-800 border-red-300";
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getSentimentIcon(data.averageScore)}
        <span className="text-sm text-gray-600">
          {getSentimentLabel(data.averageScore)}
        </span>
        {getTrendIcon(data.trend)}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          تحليل المشاعر
        </h3>
        <div
          className={`px-3 py-1 rounded-full border ${getSentimentColor(data.averageScore)}`}
        >
          <div className="flex items-center gap-2">
            {getSentimentIcon(data.averageScore)}
            <span className="font-medium text-sm">
              {getSentimentLabel(data.averageScore)}
            </span>
          </div>
        </div>
      </div>

      {/* Score Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">درجة المشاعر</span>
          <span className="font-semibold">
            {(data.averageScore * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              data.averageScore > 0.2
                ? "bg-green-600"
                : data.averageScore < -0.2
                  ? "bg-red-600"
                  : "bg-yellow-600"
            }`}
            style={{
              width: `${Math.max(0, Math.min(100, ((data.averageScore + 1) / 2) * 100))}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>سلبي</span>
          <span>محايد</span>
          <span>إيجابي</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {data.sentimentBreakdown.positive}
          </div>
          <div className="text-xs text-gray-600 mt-1">إيجابية</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {data.sentimentBreakdown.neutral}
          </div>
          <div className="text-xs text-gray-600 mt-1">محايدة</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">
            {data.sentimentBreakdown.negative}
          </div>
          <div className="text-xs text-gray-600 mt-1">سلبية</div>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
        {getTrendIcon(data.trend)}
        <span className="text-sm text-gray-700">
          {data.trend === "improving"
            ? "📈 الاتجاه في تحسن"
            : data.trend === "declining"
              ? "📉 الاتجاه في تراجع"
              : "➡️ الاتجاه مستقر"}
        </span>
      </div>

      {/* Recent Emotions */}
      {data.recentEmotions && data.recentEmotions.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            المشاعر الأخيرة
          </h4>
          <div className="flex flex-wrap gap-2">
            {data.recentEmotions.map((emotion, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
              >
                {emotion.emotion} ({emotion.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Total Messages */}
      <div className="text-center text-xs text-gray-500 pt-2">
        بناءً على {data.totalMessages} رسالة خلال {days} يوم الماضية
      </div>
    </div>
  );
}
