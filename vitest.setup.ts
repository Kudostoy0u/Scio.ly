import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { setupTestEnvironment } from "@/test-utils/index.tsx";
import type React from "react";

// Setup test environment
setupTestEnvironment();

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: vi.fn(),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: vi.fn(),
}));

// Mock framer-motion
vi.mock("framer-motion", () => {
  const AnimatePresenceComponent = ({ children }: { children?: React.ReactNode }) =>
    children as unknown;
  return {
    motion: new Proxy(
      {},
      {
        get: (_target, prop) => {
          const Component = ({
            children,
            ...props
          }: { children?: React.ReactNode; [key: string]: unknown }) => {
            // Return the component as a regular div/element
            const elementType = prop as string;
            return require("react").createElement(elementType, props, children);
          };
          return Component;
        },
      }
    ),
    get AnimatePresence() {
      return AnimatePresenceComponent;
    },
    useAnimation: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      set: vi.fn(),
    }),
    useMotionValue: (value: unknown) => ({ get: () => value, set: vi.fn() }),
    useTransform: (value: unknown) => value,
  };
});

// Mock lucide-react icons
vi.mock("lucide-react", () => {
  const icons = [
    "Home",
    "Calendar",
    "Archive",
    "Settings",
    "Users",
    "Plus",
    "MoreVertical",
    "UserPlus",
    "LogOut",
    "Bell",
    "X",
    "ChevronLeft",
    "ChevronRight",
    "ChevronDown",
    "Search",
    "Filter",
    "SortAsc",
    "SortDesc",
    "Edit",
    "Trash",
    "Check",
    "AlertCircle",
    "Info",
    "ExternalLink",
    "Download",
    "Upload",
    "File",
    "Folder",
    "Image",
    "Video",
    "Music",
    "Mail",
    "Phone",
    "MapPin",
    "Clock",
    "Star",
    "Heart",
    "ThumbsUp",
    "ThumbsDown",
    "Share",
    "Share2",
    "Copy",
    "Link",
    "Lock",
    "Unlock",
    "Eye",
    "EyeOff",
    "Shield",
    "Key",
    "User",
    "UserCheck",
    "UserX",
    "UserMinus",
    "UserCircle",
    "UserSquare",
    "Crown",
    "Award",
    "Trophy",
    "Medal",
    "Target",
    "Zap",
    "Flame",
    "Sparkles",
    "Rocket",
    "School",
    "ClockArrowDown",
    "ClockFading",
    "Menu",
    "Send",
    "Repeat",
    "MessageSquare",
    "ClipboardList",
    "RotateCcw",
    "AlertTriangle",
    "Link2Off",
    "ArrowUpCircle",
    "CheckCircle",
    "BarChart3",
    "Trash2",
    "FileText",
    "ChevronUp",
    "MessageCircle",
    "Paperclip",
    "Trophy",
    "Key",
    "Share2",
  ];

  const mocks: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const icon of icons) {
    mocks[icon] = vi.fn();
  }

  return mocks;
});

// Mock environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.PGSSLROOTCERT = Buffer.from("test-cert").toString("base64");
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
process.env.NODE_ENV = "test";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mock Date
const mockDate = new Date("2024-01-01T00:00:00Z");
vi.setSystemTime(mockDate);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
