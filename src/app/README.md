# App Directory

This directory contains the main Next.js 15 App Router application structure for Scio.ly. It follows Next.js conventions with route-based file organization, API routes, and component architecture.

## Core Application Files

### `layout.tsx`
Root layout component for the entire application. Sets up global providers, metadata, and authentication.

**Key Features:**
- Metadata configuration for SEO (title, description, icons, Open Graph, Twitter cards)
- Theme provider setup (`ThemeProvider`)
- Authentication context (`AuthProvider`)
- Google Analytics integration (`@next/third-parties/google`)
- PWA manifest and icons configuration
- TRPC provider setup
- Name prompt provider for user onboarding

**Example:**
```1:13:src/app/layout.tsx
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type React from "react";
import "./globals.css";
import NamePromptProvider from "@/app/components/NamePromptProvider";
import ThemeColorMeta from "@/app/components/ThemeColorMeta";
import { ThemeProvider } from "@/app/contexts/themeContext";
import { getServerUser } from "@/lib/supabaseServer";
import { TRPCProvider } from "@/lib/trpc/provider";
import { cookies } from "next/headers";
import { AuthProvider } from "./contexts/authContext";
import { Providers } from "./providers";
```

**Important Notes:**
- Server component that wraps all pages
- Fetches server-side user data for authentication
- Configures PWA icons for iOS and Android
- Sets up global CSS and theme support

### `page.tsx`
Homepage route handler. Renders the main landing page.

**Example:**
```1:43:src/app/page.tsx
import type { Metadata } from "next";
import HomeClient from "./components/home/HomeClient";

// Static generation with aggressive caching
export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours - main page rarely changes
export const fetchCache = "force-cache";

// Optimized metadata for better caching
export const metadata: Metadata = {
  title: "Scio.ly - Science Olympiad Practice Platform",
  description:
    "The ultimate Science Olympiad practice platform with comprehensive study materials, practice tests, and team collaboration tools.",
  // ... more metadata
};

export default function HomePage() {
  return <HomeClient />;
}
```

**Important Notes:**
- Uses static generation with 24-hour revalidation
- Aggressive caching for performance
- SEO-optimized metadata
- Delegates rendering to `HomeClient` component

### `providers.tsx`
Client-side providers wrapper. Sets up toast notifications and service worker registration.

**Example:**
```11:63:src/app/providers.tsx
export function Providers({ children }: { children: ReactNode }) {
  const { darkMode } = useTheme();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true);
    const isOfflinePage = window.location.pathname === "/offline/";

    if (!(isStandalone || isOfflinePage)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // ignore
      }
    };

    const id = setTimeout(register, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      {children}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={true}
        draggable={true}
        pauseOnHover={true}
        theme={darkMode ? "dark" : "light"}
      />
    </>
  );
}
```

**Important Notes:**
- Registers service worker only for PWA (standalone mode) or offline page
- Theme-aware toast notifications
- Client component that wraps app content

### `globals.css`
Global CSS styles and Tailwind imports. Contains base styling, custom CSS variables, and responsive design utilities.

## Page Routes

### `/about/`
About page for the platform. See [about/README.md](./about/README.md) for details.

**Files:**
- `page.tsx` - Server component wrapper
- `about-client-page.tsx` - Main client component
- `components/` - Section components (Story, Methodology, Philosophy, etc.)

### `/admin/`
Administrative interface for managing question edits and blacklists. See [admin/README.md](./admin/README.md) for details.

**Files:**
- `page.tsx` - Admin dashboard with edit/blacklist management
- `PasswordAuth.tsx` - Password authentication component

### `/analytics/`
User analytics and performance tracking with ELO rating system visualization.

**Key Features:**
- ELO rating charts and graphs
- Performance metrics visualization
- Data processing utilities
- Comparison tools

### `/bookmarks/`
User bookmarked questions management interface.

**Files:**
- `page.tsx` - Bookmarks page
- `Content.tsx` - Bookmarks content component

### `/codebusters/`
Codebusters event practice platform with cipher encryption/decryption tools.

**Key Features:**
- Multiple cipher types (Caesar, Vigenère, Bacon, etc.)
- Interactive cipher practice
- Video tutorials integration
- Cipher sharing functionality

### `/contact/`
Contact form and support page.

**Files:**
- `page.tsx` - Contact page
- `clientPage.tsx` - Client-side contact form

### `/dashboard/`
User dashboard with performance metrics and analytics.

**Key Features:**
- User performance metrics
- Recent activity tracking
- Progress visualization
- Quick access to features

**Files:**
- `page.tsx` - Dashboard page
- `dashboardContent.tsx` - Dashboard content wrapper
- `components/` - Dashboard-specific components
- `hooks/useDashboardData.ts` - Dashboard data fetching hook

### `/docs/`
Documentation system for Science Olympiad events.

**Key Features:**
- Event-specific documentation
- API documentation
- Markdown content rendering
- Navigation system

### `/join/`
User registration and onboarding flow.

**Files:**
- `page.tsx` - Join page
- `joinClientPage.tsx` - Client-side registration form

### `/leaderboard/`
Team and individual leaderboards.

**Key Features:**
- Team rankings
- Individual performance tracking
- Competition tracking
- Dynamic routes: `[code]/` for specific leaderboards

### `/legal/`
Legal pages (Privacy Policy, Terms of Service).

**Subdirectories:**
- `privacy/` - Privacy policy page
- `terms/` - Terms of service page

### `/offline/`
Offline functionality page for PWA.

**Features:**
- PWA offline capabilities
- Service worker integration

### `/plagiarism/`
Plagiarism detection and reporting system.

**Key Features:**
- Content similarity detection
- Reporting interface
- Moderation tools

### `/practice/`
Practice mode interface for question practice sessions.

**Key Features:**
- Question practice sessions
- Difficulty selection
- Progress tracking

### `/profile/`
User profile management page.

**Features:**
- User settings
- Preferences
- Account management

### `/reports/`
Reporting system for issues and feedback.

**Key Features:**
- Issue reporting
- Content moderation
- Feedback collection

### `/teams/`
Team management and collaboration system.

**Key Features:**
- Team creation and management
- Member invitations
- Team assignments
- Collaboration tools
- Dynamic routes: `[slug]/` for team pages

**Subdirectories:**
- `assign/` - Team assignment interface
- `invites/` - Team invitation management
- `components/` - Team-specific components

### `/test/`
Test taking interface for timed test sessions.

**Key Features:**
- Timed test sessions
- Question navigation
- Answer submission
- Results processing

### `/unlimited/`
Unlimited practice mode for endless practice sessions.

**Key Features:**
- Endless practice sessions
- Custom difficulty selection
- Progress tracking

## API Routes (`/api/`)

All API routes are located in the `/api/` subdirectory. See [api/README.md](./api/README.md) for detailed documentation.

**Key API Routes:**
- `/admin/` - Administrative endpoints
- `/assignments/` - Assignment management
- `/blacklists/` - Content blacklisting
- `/codebusters/` - Codebusters-specific API
- `/contact/` - Contact form processing
- `/gemini/` - AI integration with Google Gemini
- `/questions/` - Question management
- `/teams/` - Team management API
- And many more...

## Components (`/components/`)

Shared components used across the application.

**Key Components:**
- `Header.tsx` - Main navigation header
- `AuthButton.tsx` - Authentication button
- `BookmarkManager.tsx` - Bookmark management
- `ContactModal.tsx` - Contact form modal
- `EditQuestionModal.tsx` - Question editing interface
- `ShareModal.tsx` - Content sharing modal
- `home/` - Homepage-specific components

## Contexts (`/contexts/`)

React context providers for global state management.

**Contexts:**
- `authContext.tsx` - Authentication state
- `themeContext.tsx` - Theme (dark/light mode) state
- `NotificationsContext.tsx` - Notification state

## Utilities (`/utils/`)

Utility functions and helpers specific to the app.

**Key Utilities:**
- `bookmarks.ts` - Bookmark management
- `db.ts` - Database utilities (IndexedDB for offline)
- `geminiService.ts` - AI service integration
- `leaderboardUtils.ts` - Leaderboard utilities
- `questionUtils.ts` - Question processing
- `shareCodeUtils.ts` - Share code generation
- `storage.ts` - Local storage utilities
- `testParams.ts` - Test parameter utilities

See [utils/README.md](./utils/README.md) for detailed documentation.

## Important Notes

1. **Next.js 15 App Router**: Uses the latest App Router conventions with server and client components
2. **Static Generation**: Many pages use static generation for performance
3. **PWA Support**: Service worker registration for offline functionality
4. **Theme Support**: Dark/light mode throughout the application
5. **Authentication**: Supabase-based authentication with server-side user fetching
6. **Type Safety**: Full TypeScript support with strict type checking
