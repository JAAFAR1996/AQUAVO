import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, EquipmentPart } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { thumbImage } from "@/lib/cloudinary";

interface ExplodedProductViewProps {
    product: Product;
}

export function ExplodedProductView({ product }: ExplodedProductViewProps) {
    const [selectedPart, setSelectedPart] = useState<EquipmentPart | null>(null);

    if (!product.explodedViewParts || product.explodedViewParts.length === 0) {
        return null;
    }

    return (
        <div className="relative w-full aspect-square md:aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden border border-white/10 shadow-2xl group">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />

            {/* Main Image (Centered) */}
            <div className="absolute inset-0 flex items-center justify-center p-8">
                <motion.img
                    src={product.image}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-500"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 0.5 }}
                />
            </div>

            {/* Hotspots */}
            {product.explodedViewParts.map((part) => (
                <motion.button
                    key={part.id}
                    className={cn(
                        "absolute w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-colors z-20",
                        selectedPart?.id === part.id
                            ? "bg-primary border-primary text-black"
                            : "bg-white/10 border-white/30 text-white hover:bg-primary/80 hover:border-primary"
                    )}
                    style={{
                        left: `${part.x}%`,
                        top: `${part.y}%`
                    }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedPart(selectedPart?.id === part.id ? null : part)}
                >
                    {selectedPart?.id === part.id ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}

                    {/* Pulse Effect */}
                    {selectedPart?.id !== part.id && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-primary/50 opacity-75" />
                    )}
                </motion.button>
            ))}

            {/* Selected Part Details (Floating Card) */}
            <AnimatePresence>
                {selectedPart && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl z-30"
                    >
                        <div className="flex gap-4">
                            <div className="w-16 h-16 bg-white/10 rounded-xl overflow-hidden flex-shrink-0">
                                {/* Fallback to product image if part image fails or is generic */}
                                <img
                                    src={thumbImage(selectedPart.imageUrl || product.image)}
                                    alt={selectedPart.name}
                                    className="w-full h-full object-contain p-1"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => (e.currentTarget.src = product.image || "")}
                                />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-white mb-1">{selectedPart.name}</h4>
                                <p className="text-sm text-gray-300 leading-tight">{selectedPart.description}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Title Badge */}
            <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Exploded View</span>
            </div>
        </div>
    );
}
