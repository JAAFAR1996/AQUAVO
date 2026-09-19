import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Upload,
  Image,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Fish,
  Droplets,
  Activity,
  Settings,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { i18next } from "@/i18n";

interface AnalysisResult {
  id: string;
  analysisType: string;
  analysis: {
    detected: string[];
    confidence: number;
    suggestions: string[];
    details?: Record<string, any>;
  };
  recommendedProducts: any[];
  processingTimeMs: number;
}

const analysisTypes = [
  {
    value: "fish",
    label: i18next.t("tools:VisualAnalyzer.s1"),
    icon: Fish,
    description: i18next.t("tools:VisualAnalyzer.s2"),
    color: "text-blue-500",
  },
  {
    value: "tank",
    label: i18next.t("tools:VisualAnalyzer.s3"),
    icon: Droplets,
    description: i18next.t("tools:VisualAnalyzer.s4"),
    color: "text-cyan-500",
  },
  {
    value: "problem",
    label: i18next.t("tools:VisualAnalyzer.s5"),
    icon: AlertCircle,
    description: i18next.t("tools:VisualAnalyzer.s6"),
    color: "text-yellow-500",
  },
  {
    value: "health",
    label: i18next.t("tools:VisualAnalyzer.s7"),
    icon: Activity,
    description: i18next.t("tools:VisualAnalyzer.s8"),
    color: "text-red-500",
  },
];

export default function VisualAnalyzer() {
  const { t } = useTranslation("tools");
  const [selectedType, setSelectedType] = useState<string>("fish");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [useUrl, setUseUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analyze by URL mutation
  const analyzeByUrlMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; analysisType: string }) => {
      const response = await fetch("/api/ai-advanced/visual/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("VisualAnalyzer.s9"));
      }

      return response.json();
    },
  });

  // Analyze by upload mutation
  const analyzeByUploadMutation = useMutation({
    mutationFn: async (data: { file: File; analysisType: string }) => {
      const formData = new FormData();
      formData.append("image", data.file);
      formData.append("analysisType", data.analysisType);

      const response = await fetch("/api/ai-advanced/visual/analyze-upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t("VisualAnalyzer.s9"));
      }

      return response.json();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (useUrl && imageUrl) {
      analyzeByUrlMutation.mutate({
        imageUrl,
        analysisType: selectedType,
      });
    } else if (imageFile) {
      analyzeByUploadMutation.mutate({
        file: imageFile,
        analysisType: selectedType,
      });
    }
  };

  const isAnalyzing =
    analyzeByUrlMutation.isPending || analyzeByUploadMutation.isPending;
  const analysisResult =
    analyzeByUrlMutation.data?.data || analyzeByUploadMutation.data?.data;
  const error =
    analyzeByUrlMutation.error || analyzeByUploadMutation.error;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {t("VisualAnalyzer.s10")}
        </h1>
        <p className="text-lg text-gray-600">
          {t("VisualAnalyzer.s11")}
        </p>
      </div>

      {/* Analysis Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {analysisTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedType === type.value
                  ? "border-blue-500 bg-blue-50 shadow-lg"
                  : "border-gray-200 hover:border-gray-300 hover:shadow-md"
              }`}
            >
              <Icon className={`w-8 h-8 ${type.color} mx-auto mb-3`} />
              <h3 className="font-semibold text-gray-900 mb-2">
                {type.label}
              </h3>
              <p className="text-sm text-gray-600">{type.description}</p>
            </button>
          );
        })}
      </div>

      {/* Image Input */}
      <div className="bg-card rounded-xl shadow-md p-8">
        <div className="flex items-center justify-center mb-6">
          <button
            onClick={() => setUseUrl(!useUrl)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {useUrl ? t("VisualAnalyzer.s12") : t("VisualAnalyzer.s13")}
          </button>
        </div>

        {useUrl ? (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              {t("VisualAnalyzer.s14")}
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-96 object-contain rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-96 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-700">
                  {t("VisualAnalyzer.s15")}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {t("VisualAnalyzer.s16")}
                </p>
              </button>
            )}
          </div>
        )}

        <button
          onClick={handleAnalyze}
          disabled={
            isAnalyzing || (!imageFile && !imageUrl)
          }
          className="w-full mt-6 bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("VisualAnalyzer.s17")}
            </>
          ) : (
            <>
              <Settings className="w-5 h-5" />
              {t("VisualAnalyzer.s18")}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                {t("VisualAnalyzer.s9")}
              </h3>
              <p className="text-red-700">
                {error.message || t("VisualAnalyzer.s19")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="bg-card rounded-xl shadow-lg p-8 space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              {t("VisualAnalyzer.s20")}
            </h2>
            <span className="text-sm text-gray-500 mr-auto">
              {analysisResult.processingTimeMs}ms
            </span>
          </div>

          {/* Detected Items */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">
              {t("VisualAnalyzer.s21")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysisResult.analysis.detected.map((item: string, idx: number) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">
              {t("VisualAnalyzer.s22")}
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-600 h-4 rounded-full"
                style={{
                  width: `${analysisResult.analysis.confidence * 100}%`,
                }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {(analysisResult.analysis.confidence * 100).toFixed(0)}%
            </p>
          </div>

          {/* Suggestions */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-3">
              {t("VisualAnalyzer.s23")}
            </h3>
            <ul className="space-y-2">
              {analysisResult.analysis.suggestions.map((suggestion: string, idx: number) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-gray-700"
                >
                  <span className="text-green-600 font-bold">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          {/* Details */}
          {analysisResult.analysis.details && (
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-3">
                {t("VisualAnalyzer.s24")}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-arabic">
                  {JSON.stringify(analysisResult.analysis.details, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Recommended Products */}
          {analysisResult.recommendedProducts && analysisResult.recommendedProducts.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                {t("VisualAnalyzer.s25")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {analysisResult.recommendedProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {product.images?.[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-md mb-3"
                      />
                    )}
                    <h4 className="font-medium text-sm text-gray-900 mb-2">
                      {product.name}
                    </h4>
                    <p className="text-blue-600 font-semibold">
                      {product.price} {t("VisualAnalyzer.s26")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
