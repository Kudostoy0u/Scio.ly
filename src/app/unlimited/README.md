# Unlimited Directory

This directory contains the unlimited practice system for the Scio.ly platform. Provides unlimited access to practice questions with advanced question management.

## Files

### `page.tsx`
Server component that extracts unlimited practice parameters from cookies and renders the content.

**Example:**
```1:19:src/app/unlimited/page.tsx
import Content from "@/app/unlimited/Content";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Scio.ly | Unlimited",
  description: "Unlimited Science Olympiad practice from tens of thousands of available questions",
};
export default async function Page() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("scio_unlimited_params")?.value;
  let parsed: Record<string, unknown> | undefined;
  try {
    parsed = raw ? JSON.parse(decodeURIComponent(raw)) : undefined;
  } catch {
    // Ignore errors
  }
  return <Content initialRouterData={parsed} />;
}
```

**Important Notes:**
- Reads practice parameters from `scio_unlimited_params` cookie
- Passes parameters to client component
- Sets SEO metadata

### `content.tsx`
Main client component for unlimited practice mode.

**Key Features:**
- Unlimited question access
- Question navigation
- Answer submission
- Progress tracking

## Components

### `components/`
Unlimited practice components including question display and navigation.

## Hooks

### `hooks/`
Custom hooks for unlimited practice state management.

## Utils

### `utils/`
Utility functions for unlimited practice including:
- Question fetching
- ID question building
- Edit payload handling
- Question preparation

## Important Notes

1. **Unlimited Access**: No question limit for practice sessions
2. **Cookie Parameters**: Practice settings stored in cookies
3. **Question Types**: Supports MCQ, FRQ, and ID questions
4. **Progress Tracking**: Tracks practice progress
5. **Theme Support**: Dark/light mode support
