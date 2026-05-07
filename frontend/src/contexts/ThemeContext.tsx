import React, { createContext, useContext, useState, ReactNode, useMemo } from 'react';

const dark = {
  bg: '#0B1A2C', bgDeep: '#081525', card: '#142B44', cardAlt: '#1A344F',
  border: '#1F3A58', accent: '#1FA7BF', accentSoft: '#2A8FA8', accentMuted: '#1A6B7E',
  text: '#FFFFFF', textDim: '#9CB4C8', textMuted: '#6A8299',
};

const light = {
  bg: '#F4F8FB', bgDeep: '#FFFFFF', card: '#FFFFFF', cardAlt: '#EDF3F8',
  border: '#D8E2EB', accent: '#1FA7BF', accentSoft: '#2A8FA8', accentMuted: '#73B6C5',
  text: '#0B1A2C', textDim: '#4A6178', textMuted: '#7E92A6',
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

type Mode = 'dark' | 'light';
type Ctx = { mode: Mode; colors: typeof dark; toggle: () => void; setMode: (m: Mode) => void };

const ThemeContext = createContext<Ctx | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('dark');
  const value = useMemo<Ctx>(() => ({
    mode,
    colors: mode === 'dark' ? dark : light,
    toggle: () => setMode(m => (m === 'dark' ? 'light' : 'dark')),
    setMode,
  }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}

// Static dark tokens for non-component code
export const colors = dark;
