"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { DEFAULT_LOCALE, LOCALES, translate, type Locale, type TranslationKey } from "@/lib/i18n"

interface LocaleContextValue {
  locale: Locale
  dir: "rtl" | "ltr"
  setLocale: (l: Locale) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const STORAGE_KEY = "jarvis.locale"

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null
      if (stored && (stored === "ar" || stored === "en")) {
        setLocaleState(stored)
      }
    } catch {
      // ignore
    }
  }, [])

  // Reflect locale on the <html> element so RTL/font cascading works
  useEffect(() => {
    const meta = LOCALES.find((l) => l.code === locale)
    const dir = meta?.dir ?? "ltr"
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale
      document.documentElement.dir = dir
    }
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      window.localStorage.setItem(STORAGE_KEY, l)
    } catch {
      // ignore
    }
  }, [])

  const value = useMemo<LocaleContextValue>(() => {
    const meta = LOCALES.find((l) => l.code === locale)
    return {
      locale,
      dir: meta?.dir ?? "ltr",
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
    }
  }, [locale, setLocale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    // Safe fallback if a consumer renders outside the provider during static analysis
    return {
      locale: DEFAULT_LOCALE as Locale,
      dir: "rtl" as const,
      setLocale: () => {},
      t: (key: TranslationKey, vars?: Record<string, string | number>) => translate(DEFAULT_LOCALE, key, vars),
    }
  }
  return ctx
}
