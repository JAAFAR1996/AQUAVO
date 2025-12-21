import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface DualRangeSliderProps
    extends Omit<React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>, 'value' | 'onValueChange'> {
    min: number;
    max: number;
    step?: number;
    value: [number, number];
    onValueChange: (value: [number, number]) => void;
    formatValue?: (value: number) => string;
    label?: string;
    showValues?: boolean;
    className?: string;
}

/**
 * Beautiful Dual Range Slider with gradient track and animated thumbs
 * Designed for RTL support and modern UI aesthetics
 */
const DualRangeSlider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    DualRangeSliderProps
>(({
    className,
    min,
    max,
    step = 1,
    value,
    onValueChange,
    formatValue = (v) => v.toLocaleString(),
    showValues = true,
    ...props
}, ref) => {
    // Calculate percentage for gradient
    const minPercent = ((value[0] - min) / (max - min)) * 100;
    const maxPercent = ((value[1] - min) / (max - min)) * 100;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Slider */}
            <div className="relative pt-2 pb-2">
                <SliderPrimitive.Root
                    ref={ref}
                    className="relative flex w-full touch-none select-none items-center cursor-pointer h-6"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onValueChange={(v) => onValueChange(v as [number, number])}
                    {...props}
                >
                    {/* Track Background with gradient */}
                    <SliderPrimitive.Track
                        className="relative h-2.5 w-full grow overflow-hidden rounded-full"
                        style={{
                            background: `linear-gradient(to left, 
                hsl(var(--muted)) 0%, 
                hsl(var(--muted)) ${100 - maxPercent}%, 
                hsl(var(--primary)) ${100 - maxPercent}%, 
                hsl(var(--primary)) ${100 - minPercent}%, 
                hsl(var(--muted)) ${100 - minPercent}%, 
                hsl(var(--muted)) 100%
              )`
                        }}
                    >
                        <SliderPrimitive.Range
                            className="absolute h-full transition-all duration-150"
                            style={{
                                background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))'
                            }}
                        />
                    </SliderPrimitive.Track>

                    {/* Min Thumb */}
                    <SliderPrimitive.Thumb
                        className={cn(
                            "block h-6 w-6 rounded-full shadow-lg transition-all duration-200",
                            "bg-gradient-to-br from-primary to-accent",
                            "border-2 border-white dark:border-background",
                            "hover:scale-110 hover:shadow-xl hover:shadow-primary/30",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                            "active:scale-105 active:shadow-lg",
                            "cursor-grab active:cursor-grabbing",
                            "disabled:pointer-events-none disabled:opacity-50"
                        )}
                    />

                    {/* Max Thumb */}
                    <SliderPrimitive.Thumb
                        className={cn(
                            "block h-6 w-6 rounded-full shadow-lg transition-all duration-200",
                            "bg-gradient-to-br from-primary to-accent",
                            "border-2 border-white dark:border-background",
                            "hover:scale-110 hover:shadow-xl hover:shadow-primary/30",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
                            "active:scale-105 active:shadow-lg",
                            "cursor-grab active:cursor-grabbing",
                            "disabled:pointer-events-none disabled:opacity-50"
                        )}
                    />
                </SliderPrimitive.Root>
            </div>

            {/* Value Display */}
            {showValues && (
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-xs text-muted-foreground">من</span>
                        <span className="font-semibold text-primary">{formatValue(value[0])}</span>
                    </div>
                    <div className="flex-1 border-t border-dashed border-muted-foreground/30 mx-3" />
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-xs text-muted-foreground">إلى</span>
                        <span className="font-semibold text-primary">{formatValue(value[1])}</span>
                    </div>
                </div>
            )}
        </div>
    );
});

DualRangeSlider.displayName = "DualRangeSlider";

export { DualRangeSlider };
export type { DualRangeSliderProps };
