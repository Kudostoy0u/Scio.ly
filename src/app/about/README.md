# About Directory

This directory contains the about page that provides information about Scio.ly, its mission, methodology, and team.

## Files

### `page.tsx`
Server component wrapper that renders the client-side about page.

**Example:**
```1:5:src/app/about/page.tsx
import AboutClientPage from "./about-client-page";

export default function AboutPage() {
  return <AboutClientPage />;
}
```

**Important Notes:**
- Simple server component wrapper for Next.js App Router
- Delegates all rendering to the client component

### `about-client-page.tsx`
Main client-side about page component. Orchestrates all about page sections.

**Key Features:**
- Theme-aware dark/light mode support
- Scrollbar styling based on theme
- Header integration
- Composes multiple section components

**Example:**
```13:72:src/app/about/about-client-page.tsx
export default function AboutClientPage() {
  const { darkMode } = useTheme();
  const [mounted] = useState(() => {
    if (typeof window !== "undefined") {
      return true;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark-scrollbar", darkMode);
    document.documentElement.classList.toggle("light-scrollbar", !darkMode);
  }, [darkMode]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className={`fixed inset-0 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`} />
      <Header />
      <main className="relative z-10 pt-36 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        {/* Sections */}
      </main>
    </div>
  );
}
```

**Important Notes:**
- Uses `mounted` state to prevent hydration mismatches
- Applies theme-based scrollbar styling
- Fixed background with relative content overlay
- Responsive padding and max-width constraints

## Components

### `components/AboutSection.tsx`
Wrapper component that provides consistent styling for about page sections.

**Props:**
- `darkMode: boolean` - Theme mode
- `children: React.ReactNode` - Section content
- `className?: string` - Additional CSS classes

**Example:**
```3:17:src/app/about/components/AboutSection.tsx
interface AboutSectionProps {
  darkMode: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AboutSection({ darkMode, children, className = "" }: AboutSectionProps) {
  return (
    <section
      className={`mb-16 p-6 rounded-xl max-w-4xl mx-auto ${darkMode ? "bg-gray-800/50 backdrop-blur-sm" : "bg-white/90 shadow-lg backdrop-blur-sm"} ${className}`}
    >
      {children}
    </section>
  );
}
```

**Important Notes:**
- Provides backdrop blur and theme-aware background
- Consistent spacing and max-width across sections

### `components/StorySection.tsx`
Displays the story of Scio.ly founders and features the Hylas mascot image.

**Features:**
- Two-column layout (responsive)
- Hover effect on mascot image
- Founder introduction text

**Example:**
```7:47:src/app/about/components/StorySection.tsx
export function StorySection({ darkMode }: StorySectionProps) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-8">
      <div className="md:w-1/2">
        <h2 className={`text-3xl font-bold mb-6 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Our Story
        </h2>
        <div className={`${darkMode ? "text-gray-300" : "text-gray-700"} space-y-4`}>
          <p>
            Hey! We&apos;re Aiden and Kundan. We experienced firsthand the challenge of finding
            high-quality, centralized practice materials for Science Olympiad. After spent countless
            hours searching for past tests, we decided to build the platform we wished we had: a
            comprehensive, accessible, and user-friendly test-taking platform that would empower
            students to excel.
          </p>
        </div>
      </div>
      <div className="md:w-1/2 flex justify-center items-center">
        <div className="relative group cursor-pointer overflow-hidden rounded-2xl">
          <Image
            src="/about/hylas.png"
            alt="Hylas the Cat - Our mascot"
            width={320}
            height={320}
            className="w-80 h-80 object-cover transition-transform duration-300 group-hover:scale-110"
            style={{ objectPosition: "center 80%" }}
          />
          {/* Hover overlay */}
        </div>
      </div>
    </div>
  );
}
```

**Important Notes:**
- Uses Next.js Image component for optimization
- Hover effect reveals mascot name overlay
- Responsive layout stacks on mobile

### `components/MethodologySection.tsx`
Explains how Scio.ly processes and serves questions using AI and technology.

**Features:**
- Four-step methodology cards
- Technology stack visualization
- Icon-based cards for tools used

**Example:**
```8:84:src/app/about/components/MethodologySection.tsx
export function MethodologySection({ darkMode }: MethodologySectionProps) {
  return (
    <>
      <h2 className={`text-3xl font-bold mb-6 text-center ${darkMode ? "text-white" : "text-gray-900"}`}>
        Our Methodology
      </h2>
      <div className="max-w-4xl mx-auto">
        <p className={`text-center text-lg mb-8 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
          We sourced thousands of previous Science Olympiad tournament archives from associates in
          test trading. Then, we ran PDF and .docx files through processing and the latest Gemini
          2.5 models to extract questions and get answers, which are served through a custom API.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MethodologyCard
            darkMode={darkMode}
            icon="/about/file.svg"
            alt="PDF Files"
            width={50}
            height={50}
            title="PDF Processing"
            description="Extract questions from tournament archives"
            className="filter invert"
          />
          {/* More cards */}
        </div>
      </div>
    </>
  );
}
```

**Important Notes:**
- Uses `MethodologyCard` and `MethodologyCardWithIcons` components
- Responsive grid layout (1 col mobile, 2 tablet, 4 desktop)
- Shows technology stack: PDF processing, Gemini AI, PostgreSQL, Vercel, Next.js

### `components/PhilosophySection.tsx`
Displays the philosophy and values behind Scio.ly.

**Features:**
- Mission statement
- Core values
- Theme-aware styling

### `components/AcknowledgmentsSection.tsx`
Shows acknowledgments and credits.

**Features:**
- Credits to contributors
- Technology acknowledgments
- Theme-aware styling

### `components/ContactSection.tsx`
Provides contact information and ways to reach the team.

**Features:**
- Contact form link
- Social media links
- Email information
- Theme-aware styling

### `components/MethodologyCard.tsx`
Card component for displaying a single methodology step with an icon.

**Props:**
- `darkMode: boolean`
- `icon: string` - Icon image path
- `alt: string` - Alt text
- `width: number` - Icon width
- `height: number` - Icon height
- `title: string` - Card title
- `description: string` - Card description
- `className?: string` - Additional CSS classes

### `components/MethodologyCardWithIcons.tsx`
Card component for displaying a methodology step with multiple icons.

**Props:**
- `darkMode: boolean`
- `icons: Array<{ src: string, alt: string, width: number, height: number }>` - Array of icon objects
- `title: string` - Card title
- `description: string` - Card description

**Important Notes:**
- Used for steps that involve multiple technologies (e.g., Processing & Storage, Deployment & Frontend)

## Important Notes

1. **Theme Support**: All components support dark/light mode via `darkMode` prop from theme context
2. **Responsive Design**: All sections use responsive Tailwind classes for mobile/tablet/desktop
3. **Image Optimization**: Uses Next.js Image component for optimized image loading
4. **Hydration Safety**: Client page uses mounted state to prevent hydration mismatches
5. **Accessibility**: Proper semantic HTML and alt text for images
6. **Performance**: Lazy loading and optimized images for fast page load
