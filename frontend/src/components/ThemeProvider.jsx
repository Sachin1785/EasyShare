import React, { createContext, useContext, useEffect, useState } from "react";

// Local storage key
const THEME_STORAGE_KEY = "fileshare-theme-preference";

const ThemeContext = createContext({
  isDarkMode: true,
  toggleDarkMode: () => {},
  setTheme: (isDark) => {},
});

export const useTheme = () => useContext(ThemeContext);

// Safely handle localStorage access with try-catch
const getStoredTheme = () => {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return storedTheme ? JSON.parse(storedTheme) : null;
  } catch (error) {
    console.error("Error accessing theme from localStorage:", error);
    return null;
  }
};

const storeTheme = (isDark) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(isDark));
    return true;
  } catch (error) {
    console.error("Error storing theme to localStorage:", error);
    return false;
  }
};

export const ThemeProvider = ({ children }) => {
  // Initialize with a function to avoid unnecessary state updates
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // First check local storage
    const storedTheme = getStoredTheme();
    
    if (storedTheme !== null) {
      return storedTheme;
    }
    
    // Then check system preference
    if (typeof window !== 'undefined') {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return systemPrefersDark;
    }
    
    // Default to dark mode if all else fails
    return true;
  });

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    // Only update based on system if user hasn't explicitly set a preference
    const handleChange = (e) => {
      if (getStoredTheme() === null) {
        setIsDarkMode(e.matches);
      }
    };
    
    // Add listener with compatibility for older browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // For older browsers
      mediaQuery.addListener(handleChange);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        // For older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Update document when theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    
    // Store preference
    storeTheme(isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      storeTheme(newValue);
      return newValue;
    });
  };

  const setTheme = (isDark) => {
    setIsDarkMode(isDark);
    storeTheme(isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 