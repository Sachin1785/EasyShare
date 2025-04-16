import React from "react";
import { Moon, Sun, Share2 } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useTheme } from "../ThemeProvider";

const Header = () => {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <header className="border-b py-4">
      <div className="container flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Share2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">FileShare</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className={cn(
            "rounded-full transition-colors",
            isDarkMode 
              ? "bg-primary/10 hover:bg-primary/20" 
              : "bg-secondary hover:bg-secondary/80"
          )}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>
    </header>
  );
};

export default Header; 