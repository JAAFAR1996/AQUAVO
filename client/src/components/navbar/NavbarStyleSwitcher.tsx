import { useState } from 'react';
import { Settings2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavbarPreferences, NAVBAR_STYLES, type NavbarStyle } from '@/hooks/use-navbar-preferences';
import { cn } from '@/lib/utils';

interface NavbarStyleSwitcherProps {
    className?: string;
}

/**
 * Dropdown component for switching between 6 navbar styles
 * Saves user preference to localStorage
 */
export function NavbarStyleSwitcher({ className }: NavbarStyleSwitcherProps) {
    const { style, setStyle } = useNavbarPreferences();
    const [isOpen, setIsOpen] = useState(false);

    const currentStyle = NAVBAR_STYLES.find(s => s.value === style);

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'relative group transition-all duration-300',
                        'hover:bg-primary/10 hover:scale-105',
                        className
                    )}
                    aria-label="تغيير نمط شريط التنقل"
                >
                    <Settings2
                        className={cn(
                            'h-5 w-5 transition-transform duration-500',
                            isOpen && 'rotate-90'
                        )}
                    />
                    {/* Indicator dot showing current style */}
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className={cn(
                    'w-56 backdrop-blur-xl',
                    'bg-background/95 border-border/50',
                    'shadow-xl shadow-black/10'
                )}
            >
                <DropdownMenuLabel className="flex items-center gap-2 text-primary">
                    <Settings2 className="h-4 w-4" />
                    <span>نمط الشريط</span>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {NAVBAR_STYLES.map((styleOption) => (
                    <DropdownMenuItem
                        key={styleOption.value}
                        onClick={() => setStyle(styleOption.value)}
                        className={cn(
                            'flex items-center justify-between cursor-pointer',
                            'transition-all duration-200',
                            style === styleOption.value && 'bg-primary/10 text-primary'
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-lg">{styleOption.icon}</span>
                            <div className="flex flex-col">
                                <span className="font-medium">{styleOption.labelAr}</span>
                                <span className="text-xs text-muted-foreground">
                                    {styleOption.label}
                                </span>
                            </div>
                        </div>

                        {style === styleOption.value && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}

                <DropdownMenuSeparator />

                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                    النمط الحالي: <span className="text-primary font-medium">{currentStyle?.labelAr}</span>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default NavbarStyleSwitcher;
