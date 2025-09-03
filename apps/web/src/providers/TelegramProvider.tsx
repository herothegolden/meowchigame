import React, { createContext, useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";

type Ctx = {
  initData: string | null;
  userId: number | null;
  themeParams: typeof WebApp.themeParams | null;
};
export const TelegramCtx = createContext<Ctx>({ initData: null, userId: null, themeParams: null });

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
      WebApp.enableClosingConfirmation();
      setReady(true);
    } catch {}
  }, []);

  const value = useMemo(() => {
    const initData = WebApp.initData || null;
    const userId = WebApp.initDataUnsafe?.user?.id ?? null;
    const themeParams = WebApp.themeParams ?? null;
    // Apply theme to CSS variables if provided
    if (themeParams) {
      const root = document.documentElement;
      if (themeParams.bg_color) root.style.setProperty("--bg", themeParams.bg_color);
      if (themeParams.text_color) root.style.setProperty("--text", themeParams.text_color);
    }
    return { initData, userId, themeParams };
  }, [ready]);

  return <TelegramCtx.Provider value={value}>{children}</TelegramCtx.Provider>;
};
