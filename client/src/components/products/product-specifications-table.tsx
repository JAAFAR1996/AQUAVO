import {
    Ruler,
    Scale,
    Package,
    Layers,
    Droplets,
    Thermometer,
    Zap,
    Shield,
    Clock,
    Box,
    Waves,
    Fish,
    Leaf,
    Settings,
    CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Specification {
    label: string;
    value: string;
    icon?: string;
}

interface ProductSpecificationsTableProps {
    specifications: Specification[] | Record<string, any>;
    category?: string;
    className?: string;
}

// Icon mapping based on specification type
const iconMap: Record<string, React.ElementType> = {
    الحجم: Ruler,
    الوزن: Scale,
    المادة: Package,
    العمق: Layers,
    السعة: Droplets,
    الحرارة: Thermometer,
    الطاقة: Zap,
    الضمان: Shield,
    "العمر الافتراضي": Clock,
    الأبعاد: Box,
    التدفق: Waves,
    التوافق: Fish,
    "صديق للبيئة": Leaf,
    الإعدادات: Settings,
    // English alternatives
    size: Ruler,
    weight: Scale,
    material: Package,
    depth: Layers,
    capacity: Droplets,
    temperature: Thermometer,
    power: Zap,
    warranty: Shield,
    lifespan: Clock,
    dimensions: Box,
    flow: Waves,
    compatibility: Fish,
    eco: Leaf,
    settings: Settings,
};

// Get appropriate icon for a specification
function getIcon(label: string): React.ElementType {
    const lowerLabel = label.toLowerCase();

    for (const [key, icon] of Object.entries(iconMap)) {
        if (lowerLabel.includes(key.toLowerCase())) {
            return icon;
        }
    }

    return CheckCircle2; // Default icon
}

// Convert various spec formats to unified format
function normalizeSpecifications(specs: Specification[] | Record<string, any>): Specification[] {
    if (Array.isArray(specs)) {
        return specs;
    }

    // Keys to exclude from technical specifications (shown elsewhere)
    const excludeKeys = ['benefits', 'difficulty', 'ecoFriendly', 'videoUrl', 'explodedViewParts', 'brand'];

    // Convert object to array, filtering out excluded keys and arrays
    return Object.entries(specs)
        .filter(([key, value]) => {
            // Internal product presentation metadata, such as 3D model paths.
            if (key.startsWith('__')) return false;
            // Exclude specific keys
            if (excludeKeys.includes(key)) return false;
            // Exclude arrays (they're usually benefits or parts)
            if (Array.isArray(value)) return false;
            // Exclude empty/null values
            if (value === null || value === undefined || value === '') return false;
            return true;
        })
        .map(([key, value]) => ({
            label: key,
            value: typeof value === 'boolean'
                ? (value ? 'نعم ✓' : 'لا ✗')
                : typeof value === 'object'
                    ? JSON.stringify(value)
                    : String(value),
        }));
}

export function ProductSpecificationsTable({
    specifications,
    category,
    className,
}: ProductSpecificationsTableProps) {
    const specs = normalizeSpecifications(specifications);

    if (specs.length === 0) {
        return null;
    }

    return (
        <Card className={cn("overflow-hidden", className)} dir="rtl">
            <CardHeader className="bg-gradient-to-br from-primary/5 to-transparent pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-primary" aria-hidden="true" />
                    <span>المواصفات التقنية</span>
                    {category && (
                        <Badge variant="secondary" className="mr-2 text-xs">
                            {category}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                {/* Key/value specs — a description list, not decorative rows,
                    so screen readers announce each spec as a term/value pair. */}
                <dl className="divide-y m-0">
                    {specs.map((spec) => {
                        const IconComponent = getIcon(spec.label);

                        return (
                            <div
                                key={spec.label}
                                className={cn(
                                    "flex items-center justify-between p-4 transition-colors"
                                )}
                            >
                                <dt className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <IconComponent className="w-4 h-4 text-primary" aria-hidden="true" />
                                    </div>
                                    <span className="font-medium text-sm text-muted-foreground">
                                        {spec.label}
                                    </span>
                                </dt>
                                <dd className="font-semibold text-sm text-right max-w-[50%] m-0">
                                    {spec.value}
                                </dd>
                            </div>
                        );
                    })}
                </dl>
            </CardContent>
        </Card>
    );
}

// Compact version for sidebar or quick view
export function ProductSpecificationsCompact({
    specifications,
    maxItems = 4,
    className,
}: ProductSpecificationsTableProps & { maxItems?: number }) {
    const specs = normalizeSpecifications(specifications).slice(0, maxItems);

    if (specs.length === 0) {
        return null;
    }

    return (
        <dl className={cn("grid grid-cols-2 gap-3 m-0", className)}>
            {specs.map((spec) => {
                const IconComponent = getIcon(spec.label);

                return (
                    <div
                        key={spec.label}
                        className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg"
                    >
                        <IconComponent className="w-4 h-4 text-primary flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0">
                            <dt className="text-[10px] text-muted-foreground truncate">
                                {spec.label}
                            </dt>
                            <dd className="text-xs font-semibold truncate m-0">
                                {spec.value}
                            </dd>
                        </div>
                    </div>
                );
            })}
        </dl>
    );
}
