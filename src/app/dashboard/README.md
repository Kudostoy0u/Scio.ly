# Dashboard Directory

This directory contains the main user dashboard system for the Scio.ly platform. The dashboard provides comprehensive user analytics, performance tracking, and personalized content management.

## Files

### `page.tsx`
Server component that renders the dashboard page with metadata.

**Example:**
```1:13:src/app/dashboard/page.tsx
import Content from "@/app/dashboard/dashboardContent";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Scio.ly | Dashboard",
  description: "Track your Scioly test-taking performance across several statistics",
};
export default function Page() {
  return <Content />;
}
```

**Important Notes:**
- Uses static generation for performance
- Sets SEO metadata for the dashboard page

### `dashboardContent.tsx`
Simple wrapper component that renders the main dashboard component.

**Example:**
```1:5:src/app/dashboard/dashboardContent.tsx
import DashboardMain from "./components/DashboardMain";

export default function DashboardContent() {
  return <DashboardMain />;
}
```

### `types.ts`
TypeScript type definitions for dashboard components and data structures.

**Key Types:**
- `ContactFormData` - Contact form submission data
- `DailyData` - Daily activity metrics
- `WeeklyData` - Weekly activity and accuracy
- `HistoricalMetrics` - Historical performance data
- `Metrics` - Current performance metrics
- `WelcomeMessageProps` - Welcome message component props
- `NumberAnimationProps` - Animated number display props
- `AnimatedAccuracyProps` - Animated accuracy display props

**Example:**
```12:21:src/app/dashboard/types.ts
export interface ContactFormData {
  /** Contact person's name */
  name: string;
  /** Contact person's email */
  email: string;
  /** Contact topic/subject */
  topic: string;
  /** Contact message */
  message: string;
}
```

## Components

### `components/DashboardMain.tsx`
Main dashboard interface component. Orchestrates all dashboard sections and manages state.

**Key Features:**
- Displays welcome message with user greeting
- Shows performance metrics (accuracy, questions answered)
- Displays weekly questions chart
- Shows favorite test configurations
- Action buttons for quick navigation
- Hylas banner display
- Contact modal integration

**Example:**
```36:50:src/app/dashboard/components/DashboardMain.tsx
function DashboardContent({ initialUser }: { initialUser?: User | null }) {
  const controller = useDashboardController(initialUser);
  const {
    router,
    darkMode,
    setDarkMode,
    metrics,
    historyData,
    greetingName,
    isLoading,
    contactModalOpen,
    setContactModalOpen,
    handleContact,
    correctView,
    setCorrectView,
    // ... more state
  } = controller;
```

**Important Notes:**
- Uses `useDashboardData` hook for data fetching
- Manages view modes: daily, weekly, all-time
- Integrates with banner context for Hylas banner
- Theme-aware (dark/light mode)

### `components/WelcomeMessage.tsx`
Personalized welcome message component with user greeting.

**Props:**
- `darkMode: boolean` - Theme mode
- `currentUser: User | null` - Authenticated user
- `setDarkMode: (value: boolean) => void` - Theme toggle function
- `greetingName?: string` - Optional greeting name
- `isLoading?: boolean` - Loading state

**Important Notes:**
- Displays personalized greeting based on user name
- Includes theme toggle button
- Shows loading state when data is fetching

### `components/MetricsCard.tsx`
Performance metrics display card showing user statistics.

**Key Features:**
- Displays total questions attempted
- Shows accuracy percentage
- Displays correct answers count
- Animated number displays
- Theme-aware styling

**Important Notes:**
- Uses `NumberAnimation` component for animated numbers
- Responsive design for mobile and desktop

### `components/AnimatedAccuracy.tsx`
Animated accuracy percentage display component.

**Props:**
- `value: number` - Accuracy percentage (0-100)
- `darkMode: boolean` - Theme mode
- `className?: string` - Optional CSS classes

**Important Notes:**
- Smooth animation when value changes
- Color-coded based on accuracy level
- Uses Framer Motion for animations

### `components/NumberAnimation.tsx`
Animated number display component for smooth number transitions.

**Props:**
- `value: number` - Number to display
- `className: string` - CSS classes for styling

**Important Notes:**
- Animates number changes smoothly
- Used throughout dashboard for metrics

### `components/QuestionsThisWeekChart.tsx`
Weekly questions chart showing daily question activity.

**Key Features:**
- Displays questions answered per day for the week
- Bar chart visualization
- Shows weekly accuracy
- Theme-aware styling

**Important Notes:**
- Uses chart library for visualization
- Aggregates daily data into weekly view

### `components/FavoriteConfigsCard.tsx`
Favorite test configurations card for quick access to saved test settings.

**Key Features:**
- Lists favorite test configurations
- Quick navigation to favorite tests
- Add/remove favorites
- Displays event name and settings

**Important Notes:**
- Integrates with favorites utilities
- Stores favorites in localStorage

### `components/ActionButtons.tsx`
Quick action buttons for dashboard navigation.

**Key Features:**
- Navigation to practice mode
- Navigation to test mode
- Navigation to unlimited practice
- Other quick actions

**Important Notes:**
- Provides shortcuts to common actions
- Theme-aware button styling

### `components/HylasBanner.tsx`
Hylas mascot banner component for promotional content.

**Key Features:**
- Displays promotional banner
- Dismissible banner
- Theme-aware styling

**Important Notes:**
- Managed by banner context
- Can be hidden by user

## Hooks

### `hooks/useDashboardData.ts`
Dashboard data management hook. Fetches and manages dashboard data including metrics, history, and user progress.

**Returns:**
- `metrics: DailyMetrics` - Daily metrics and statistics
- `historyData: Record<string, HistoryRecord>` - Historical data records
- `greetingName: string` - User's greeting name
- `isLoading: boolean` - Loading state
- `error: string | null` - Error message
- `refreshData: () => Promise<void>` - Refresh function
- `updateMetrics: (updates) => Promise<void>` - Update metrics function

**Example:**
```48:150:src/app/dashboard/hooks/useDashboardData.ts
/**
 * Dashboard data management hook
 * Manages user dashboard data including metrics, history, and progress tracking
 */
export function useDashboardData(initialUser?: User | null): UseDashboardDataReturn {
  const [metrics, setMetrics] = useState<DailyMetrics>(getInitialMetrics());
  const [historyData, setHistoryData] = useState<Record<string, HistoryRecord>>({});
  const [greetingName, setGreetingName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... implementation
}
```

**Important Notes:**
- Syncs data from server using `syncDashboardData`
- Manages local state for performance
- Handles loading and error states
- Updates metrics when user completes tests

## Contexts

### `contexts/bannerContext.tsx`
Banner management context for Hylas banner display.

**Features:**
- Banner visibility state
- Banner content management
- Banner dismissal handling

**Example:**
```typescript
export const BannerProvider = ({ children }: { children: ReactNode }) => {
  // Banner state management
};

export const useBannerContext = () => {
  // Banner context hook
};
```

**Important Notes:**
- Manages banner visibility across dashboard
- Persists banner state in localStorage
- Provides banner control functions

## Important Notes

1. **Data Synchronization**: Dashboard data syncs with server on load and after test completion
2. **Local Storage**: Uses localStorage for caching dashboard state
3. **Performance**: Optimized with lazy loading and data caching
4. **Theme Support**: All components support dark/light mode
5. **Responsive Design**: Mobile and desktop optimized layouts
6. **Error Handling**: Graceful error handling with user-friendly messages
7. **Loading States**: Loading indicators during data fetching
