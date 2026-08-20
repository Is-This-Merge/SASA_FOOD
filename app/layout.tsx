import ServiceWorkerRegister from "../components/ServiceWorkerRegister";
import MealCacheInitializer from "../components/MealCacheInitializer";
import { AuthProvider } from "../components/AuthProvider";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SASA FOOD",
    template: "%s | SASA FOOD",
  },
  description: "SASA 급식표와 식단 리뷰를 확인하는 서비스",
  applicationName: "SASA FOOD",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var saved=localStorage.getItem('theme');var theme=saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(e){}})()` }} />
      </head>
      <body>
        <AuthProvider>
          <ServiceWorkerRegister />
          <MealCacheInitializer />
          {children}
        </AuthProvider>
        <footer className="app-footer">© 2026 SASA 11th MJ CHOI & SC RYU. All rights reserved.</footer>
      </body>
    </html>
  );
}
