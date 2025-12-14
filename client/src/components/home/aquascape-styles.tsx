
import { useState } from "react";
import { aquascapeStyles } from "@/lib/aquascape-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Leaf, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AquascapeStyles() {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % aquascapeStyles.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + aquascapeStyles.length) % aquascapeStyles.length);
    };

    const currentStyle = aquascapeStyles[currentIndex];

    return (
        <section className="py-20 bg-muted/30 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                <div className="absolute top-10 left-10 w-64 h-64 bg-primary rounded-full blur-[100px]" />
                <div className="absolute bottom-10 right-10 w-64 h-64 bg-accent rounded-full blur-[100px]" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-12">
                    <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/50 text-primary">
                        دليلك للتصميم
                    </Badge>
                    <h2 className="text-4xl md:text-5xl font-extrabold mb-4 font-heading text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                        أفكار وتصاميم الأحواض
                    </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        اكتشف أنماط الأكواسكيب العالمية واختر التصميم الذي يناسب ذوقك ومساحتك
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
                    {/* Image Side */}
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity" />
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStyle.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3] border-4 border-white dark:border-white/10"
                            >
                                <img
                                    src={currentStyle.imageUrl}
                                    alt={currentStyle.title}
                                    className="w-full h-full object-cover transform transition-transform duration-700 hover:scale-105"
                                />

                                {/* Navigation Overlay */}
                                <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                        onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                                    >
                                        <ArrowRight className="h-6 w-6" />
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                        onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                                    >
                                        <ArrowLeft className="h-6 w-6" />
                                    </Button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Content Side */}
                    <div className="space-y-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStyle.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.4 }}
                                className="space-y-6"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-3xl font-bold text-foreground">{currentStyle.title}</h3>
                                        <Badge className={
                                            currentStyle.difficulty === 'مبتدئ' ? 'bg-green-500' :
                                                currentStyle.difficulty === 'متوسط' ? 'bg-yellow-500' : 'bg-red-500'
                                        }>
                                            {currentStyle.difficulty}
                                        </Badge>
                                    </div>
                                    <div className="h-1 w-20 bg-primary rounded-full" />
                                </div>

                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {currentStyle.description}
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {currentStyle.features.map((feature, idx) => (
                                        <Card key={idx} className="bg-card/50 border-primary/20">
                                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                                <Leaf className="h-6 w-6 text-primary mb-1" />
                                                <span className="text-sm font-semibold">{feature}</span>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <Button onClick={nextSlide} className="w-full sm:w-auto min-w-[150px]">
                                        التالي
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                    </Button>

                                    <div className="flex-1 flex justify-center items-center gap-2">
                                        {aquascapeStyles.map((_, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCurrentIndex(idx)}
                                                className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === currentIndex ? "bg-primary w-8" : "bg-muted-foreground/30 hover:bg-primary/50"
                                                    }`}
                                                aria-label={`Go to slide ${idx + 1}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
}
