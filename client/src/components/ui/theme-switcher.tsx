import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeOption } from "@/types";

/**
 * AQUAVO supports exactly two visual registers (06_Visual_DNA §1–2):
 *   • Clean Proof  — light, the transactional default
 *   • Dark Authority — dark, for brand-voice and educational content
 * plus "system", which resolves to one of those two.
 *
 * Anything else is unsupported. Earlier builds experimented with novelty themes
 * ("monochrome", "neon-ocean", "pastel"); their CSS still exists on disk but is
 * not imported and is not selectable. A visitor whose localStorage still holds
 * one of those values must not be left in an undefined state, so unknown values
 * migrate to light rather than being cast blindly.
 */
const SUPPORTED_THEMES: readonly ThemeOption[] = ["light", "dark", "system"];

function isSupportedTheme(value: string | null): value is ThemeOption {
  return value !== null && (SUPPORTED_THEMES as readonly string[]).includes(value);
}

/**
 * Read the saved theme, migrating any unsupported/legacy value to light.
 * Rewrites storage on migration so the stale value cannot resurface later.
 */
export function readStoredTheme(): ThemeOption {
  try {
    const saved = localStorage.getItem("theme");
    if (isSupportedTheme(saved)) return saved;
    if (saved !== null) localStorage.setItem("theme", "light");
    return "light";
  } catch {
    return "light";
  }
}

export function ThemeSwitcher() {
  // First-time visitors default to Light; saved preferences still win.
  // Read synchronously so the dropdown label matches the theme the head bootstrap
  // script already applied, with no flicker/mismatch.
  const [theme, setTheme] = useState<ThemeOption>(readStoredTheme);

  useEffect(() => {
    const initialTheme = readStoredTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const applyTheme = (newTheme: ThemeOption) => {
    const root = document.documentElement;
    // Remove both classes first
    root.classList.remove('dark', 'light');

    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light'); // html.light triggers CSS light vars
    }
  };

  const changeTheme = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const getIcon = () => {
    if (theme === 'light') return <Sun className="h-5 w-5" />;
    if (theme === 'dark') return <Moon className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all"
          aria-label="تغيير السمة"
        >
          {getIcon()}
          <span className="sr-only">تغيير السمة</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={() => changeTheme("light")} className="cursor-pointer">
          <Sun className="ml-2 h-4 w-4 text-primary" aria-hidden="true" />
          <span>فاتح</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("dark")} className="cursor-pointer">
          <Moon className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>داكن</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("system")} className="cursor-pointer">
          <Monitor className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>النظام</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
