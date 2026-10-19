import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-card hover:bg-accent transition-all duration-300 border border-border dark:border-primary/20 dark:hover:border-primary/50 dark:shadow-[0_0_10px_rgba(212,175,55,0.1)] dark:hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-foreground transition-transform hover:rotate-12" />
      ) : (
        <Sun className="w-5 h-5 text-primary transition-transform hover:rotate-90" />
      )}
    </button>
  );
}