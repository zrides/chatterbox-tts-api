'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from './theme-provider';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    const resolvedTheme = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    const nextTheme = resolvedTheme !== 'dark' ? 'dark' : 'light';
    setTheme(nextTheme);
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 duration-300 shadow-sm hover:shadow-md cursor-pointer"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 duration-300 text-gray-800 dark:text-gray-300" />
      <Moon className="absolute inset-2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 duration-300 text-gray-800 dark:text-gray-300" />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}

export default ThemeToggle