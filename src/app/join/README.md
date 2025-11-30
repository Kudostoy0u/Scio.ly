# Join Directory

This directory contains the join/onboarding system for the Scio.ly platform. Provides user onboarding functionality for new users to join the platform.

## Files

### `page.tsx`
Server component that renders the join page with metadata.

**Example:**
```1:12:src/app/join/page.tsx
import type { Metadata } from "next";
import JoinClientPage from "./joinClientPage";

export const metadata: Metadata = {
  title: "Scio.ly | Join Our Team",
  description: "Join our team and help make Science Olympiad practice accessible to everyone.",
};

export default function JoinPage() {
  return <JoinClientPage />;
}
```

**Important Notes:**
- Sets SEO metadata for the join page
- Delegates rendering to client component

### `joinClientPage.tsx`
Client-side join page component.

**Key Features:**
- User registration/onboarding interface
- Form handling
- Navigation to main platform after joining

**Important Notes:**
- Client component for interactive onboarding
- Integrates with authentication system
- Theme-aware design

## Important Notes

1. **Onboarding Flow**: Guides new users through platform setup
2. **Authentication**: Integrates with Supabase authentication
3. **SEO**: Optimized metadata for search engines
4. **Theme Support**: Dark/light mode support
