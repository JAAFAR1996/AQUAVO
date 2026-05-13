import { useViewerCount } from "@/hooks/use-viewer-count";

interface ViewerCountProps {
  productId: string;
}

export function ViewerCount({ productId }: ViewerCountProps) {
  const count = useViewerCount(productId);

  if (count === null) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
      <span className="text-xs text-amber-400/80">
        {count} شخص يشوف هذا المنتج الان
      </span>
    </div>
  );
}
