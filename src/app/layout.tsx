import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import NamePromptProvider from "@/app/components/NamePromptProvider";
import ThemeColorMeta from "@/app/components/ThemeColorMeta";
import { ThemeProvider } from "@/app/contexts/ThemeContext";
import { getServerUser } from "@/lib/supabaseServer";
import { TRPCProvider } from "@/lib/trpc/Provider";
import { cookies } from "next/headers";
import { AuthProvider } from "./contexts/AuthContext";
import { Providers } from "./providers";
// import { createsupabaseserverclient } from '@/lib/supabaseserver';

export const metadata: Metadata = {
  title: "Scio.ly",
  description:
    "Scio.ly provides a comprehensive test-taking platform carefully designed and crafted for Science Olympiad students – available to everyone, for free.",

  icons: {
    icon: "https://res.cloudinary.com/djilwi4nh/image/upload/v1760504427/site-logo_lzc8t0.png",
    apple: [
      {
        url: "/AppIcons/Assets.xcassets/AppIcon.appiconset/120.png",
        sizes: "120x120",
        type: "image/png",
      },
      {
        url: "/AppIcons/Assets.xcassets/AppIcon.appiconset/152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        url: "/AppIcons/Assets.xcassets/AppIcon.appiconset/167.png",
        sizes: "167x167",
        type: "image/png",
      },
      {
        url: "/AppIcons/Assets.xcassets/AppIcon.appiconset/180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  keywords: [
    "Science Olympiad",
    "Scioly practice tests",
    "Scioly practice",
    "Scioly tests",
    "Biodiversity",
  ],
  metadataBase: new URL("https://scio.ly"),
  openGraph: {
    siteName: "Scio.ly",
    description:
      "Scio.ly provides a comprehensive, organized platform carefully designed and crafted for Science Olympiad students – available to everyone, for free.",
    type: "website",
    locale: "en_US",
  },
  authors: [
    { name: "Kundan Baliga", url: "https://github.com/Kudostoy0u" },
    { name: "Aiden Xie", url: "https://github.com/thetinfoilhat" },
    { name: "Steven He", url: "https://github.com/the-evens" },
  ],
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: "index, follow",
  },
  appleWebApp: {
    title: "Scio.ly",
    statusBarStyle: "default",
    capable: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,

  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getServerUser();

  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("theme")?.value;
  const initialDarkMode = themeCookie === "dark" ? true : themeCookie === "light" ? false : false;

  const initialDisplayFirstName: string | null = null;
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <meta charSet="utf-8" />
        <link
          rel="icon"
          href="https://res.cloudinary.com/djilwi4nh/image/upload/v1760504427/site-logo_lzc8t0.png"
          sizes="any"
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="${initialDarkMode ? '#020617' : '#ffffff'}" />
        {initialDisplayFirstName ? (
          <meta name="scio-display-name" content={initialDisplayFirstName} />
        ) : null}
      </head>
      <body
        className={"font-sans antialiased overflow-x-hidden"}
        data-scio-display-name={initialDisplayFirstName || undefined}
        suppressHydrationWarning={true}
      >
        {/* AuthProvider centralizes session; no extra seeding here */}
        <ThemeProvider initialDarkMode={initialDarkMode}>
          <AuthProvider initialUser={user}>
            <TRPCProvider>
              <Providers>
                <ThemeColorMeta />
                {children}
                <NamePromptProvider />
              </Providers>
            </TRPCProvider>
          </AuthProvider>
        </ThemeProvider>
        <GoogleAnalytics gaId="G-P9SVV3TY4G" />
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          defer={true}
          data-cf-beacon='{"token": "f5838db0caa649f9a42aeb710f79a241"}'
        />
      </body>
    </html>
  );
}
