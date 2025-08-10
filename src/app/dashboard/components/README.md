# 1-Click-Practice Feature

## Overview

The 1-Click-Practice feature allows users to save their favorite test configurations and access them directly from the dashboard with a single click.

## How It Works

### 1. Saving Configurations

- Go to the Practice page
- Configure your test settings (event, division, time limit, question count, difficulty, etc.)
- Click the heart button (❤️) next to "Test Configuration"
- Enter a name for your configuration when prompted
- The configuration is automatically saved to localStorage

### 2. Accessing Favorites

- Saved configurations appear as mini tiles on the dashboard
- Each tile shows:
  - Configuration name
  - Event
  - Division
  - Time limit
  - Question count
  - Difficulty level
- Click "Start Practice" to immediately begin with those settings

### 3. Managing Favorites

- Remove configurations by clicking the trash icon on each tile
- Toggle favorites on/off by clicking the heart button again
- All changes are automatically saved to localStorage

## Features

### Mini Tiles

- **Responsive Grid**: Automatically adjusts from 1 column on mobile to 3 columns on large screens
- **Hover Effects**: Subtle animations and color changes on hover
- **Compact Design**: Shows all essential information in a small space
- **Smart Layout**: If no favorites exist, shows a helpful empty state with instructions

### Data Persistence

- All favorites are stored in browser cookies (more persistent than localStorage)
- Survives browser restarts, page refreshes, and browser sessions
- Cookies expire after 1 year for long-term persistence
- Automatic error handling for corrupted data
- Fallback warnings if cookies are disabled

### One-Click Access

- Clicking "Start Practice" navigates to the practice page
- All settings are automatically pre-filled
- URL parameters are cleaned up after loading
- Seamless user experience

## Technical Implementation

### Components

- `FavoriteConfigs.tsx`: Main dashboard component for displaying favorites
- `TestConfiguration.tsx`: Enhanced with heart button for saving configurations
- `cookies.ts`: Utility functions for cookie management

### Cookie Management

- **Cookie Name**: `favoriteConfigs`
- **Expiration**: 1 year from creation
- **Security**: Uses `SameSite=Strict` for security
- **Encoding**: URL-encoded to handle special characters
- **Validation**: Automatic error handling and fallback mechanisms

### Data Flow

1. User configures test settings
2. Clicks heart button to save
3. Configuration stored in browser cookies
4. Dashboard reads from cookies and displays tiles
5. Clicking tile navigates to practice with pre-filled settings

### Storage Format

```typescript
interface FavoriteConfig {
  id: string;
  name: string;
  event: string;
  division: string;
  time: number;
  number: number;
  difficulty: string;
  settings: Settings; // Full settings object
}
```

## Usage Tips

1. **Naming**: Use descriptive names for your configurations (e.g., "Biology B Division - 20 Questions")
2. **Organization**: Create different configurations for different study sessions
3. **Quick Access**: Keep your most-used configurations as favorites for instant access
4. **Cleanup**: Remove unused configurations to keep your dashboard organized

## Future Enhancements

- Cloud synchronization across devices
- Configuration sharing between users
- Advanced filtering and search
- Configuration categories and tags
- Import/export functionality
