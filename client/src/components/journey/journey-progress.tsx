import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { JourneyStepDefinition } from "@/types/journey";

interface JourneyProgressProps {
    steps: JourneyStepDefinition[];
    currentStep: number;
    setCurrentStep: (step: number) => void;
}

export function JourneyProgress({ steps, currentStep, setCurrentStep }: JourneyProgressProps) {
    return (
        <div className="max-w-5xl mx-auto mb-12">
            <div className="relative">
                {/* Background bar */}
                <div className="absolute top-5 right-0 w-full h-1 bg-muted rounded-full" />

                {/* Progress bar - RTL: starts from right */}
                <motion.div
                    className="absolute top-5 right-0 h-1 bg-primary rounded-full origin-right"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                />

                {/* Steps */}
                <div className="relative flex justify-between">
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isCurrent = index === currentStep;
                        const StepIcon = step.icon;

                        return (
                            <div
                                key={step.id}
                                className="flex flex-col items-center"
                            >
                                <motion.button
                                    className={cn(
                                        "w-10 h-10 md:w-12 md:h-12 rounded-full border-4 flex items-center justify-center bg-background transition-all duration-300",
                                        isCompleted ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                                            isCurrent ? "border-primary text-primary shadow-lg shadow-primary/25 scale-110" :
                                                "border-muted text-muted-foreground"
                                    )}
                                    onClick={() => setCurrentStep(index)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                    aria-label={`الخطوة ${index + 1}: ${step.title}`}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
                                    ) : (
                                        <StepIcon className="w-4 h-4 md:w-5 md:h-5" />
                                    )}
                                </motion.button>

                                <div className="mt-2 text-center hidden lg:block min-w-[80px]">
                                    <span className={cn(
                                        "text-xs font-bold block transition-colors",
                                        isCurrent ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {step.title}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
