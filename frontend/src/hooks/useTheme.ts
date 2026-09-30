import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggleTheme: () => void
  setTheme: (dark: boolean) => void
}

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false
  const saved = localStorage.getItem('theme')
  if (saved) return saved === 'dark'
  return document.documentElement.classList.contains('dark')
}

export const useTheme = create<ThemeState>((set) => ({
  isDark: getInitialTheme(),
  toggleTheme: () => {
    set((state) => {
      const next = !state.isDark
      const root = document.documentElement
      if (next) {
        root.classList.add('dark')
        root.style.colorScheme = 'dark'
        localStorage.setItem('theme', 'dark')
      } else {
        root.classList.remove('dark')
        root.style.colorScheme = 'light'
        localStorage.setItem('theme', 'light')
      }
      return { isDark: next }
    })
  },
  setTheme: (dark: boolean) => {
    const root = document.documentElement
    if (dark) {
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      root.style.colorScheme = 'light'
      localStorage.setItem('theme', 'light')
    }
    set({ isDark: dark })
  },
}))