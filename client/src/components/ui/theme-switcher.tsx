import { useEffect, useState } from "react";
import { Moon, Sun, Zap, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeOption } from "@/types";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeOption>("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as ThemeOption | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
      if (savedTheme === 'dark' || savedTheme === 'neon-ocean') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const changeTheme = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    
    // Handle Tailwind's dark mode class
    if (newTheme === 'dark' || newTheme === 'neon-ocean') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
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
          <Palette className="h-5 w-5" />
          <span className="sr-only">تغيير السمة</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={() => changeTheme("light")} className="cursor-pointer">
          <Sun className="ml-2 h-4 w-4 text-yellow-500" />
          <span>فاتح</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("dark")} className="cursor-pointer">
          <Moon className="ml-2 h-4 w-4 text-slate-400" />
          <span>داكن</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("neon-ocean")} className="cursor-pointer">
          <Zap className="ml-2 h-4 w-4 text-cyan-400" />
          <span>محيط نيون</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("pastel")} className="cursor-pointer">
          <Palette className="ml-2 h-4 w-4 text-pink-400" />
          <span>باستيل</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => changeTheme("monochrome")} className="cursor-pointer">
          <div className="ml-2 h-4 w-4 rounded-full border border-current bg-zinc-500" />
          <span>أحادي اللون</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
