# Teams Data Loading System

## Overview

This directory contains a centralized data loading system for Elo ratings that uses state-based JSON files for improved performance and scalability.

## Current Structure

### Data Files
- `public/statesB/` - Division B state-based files
- `public/statesC/` - Division C state-based files

### State-Based Structure

### Directory Structure
```
public/
├── statesB/
│   ├── meta.json          # Metadata mappings for Division B
│   ├── CA.json            # California teams data
│   ├── IL.json            # Illinois teams data
│   ├── NY.json            # New York teams data
│   └── ...                # Other state files
└── statesC/
    ├── meta.json          # Metadata mappings for Division C
    ├── CA.json            # California teams data
    ├── IL.json            # Illinois teams data
    ├── NY.json            # New York teams data
    └── ...                # Other state files
```

### Metadata Format (meta.json)
```json
{
  "teams": {
    "0": "School Name Varsity",
    "1": "School Name JV",
    "2": "Another School Varsity"
  },
  "events": {
    "0": "Anatomy and Physiology",
    "1": "Codebusters",
    "2": "Crime Busters"
  },
  "tournaments": {
    "0": "Tournament Name 1",
    "1": "Tournament Name 2"
  },
  "states": {
    "CA": "California",
    "IL": "Illinois",
    "NY": "New York"
  },
  "tournamentTimeline": {
    "2025": [
      {
        "date": "2025-01-15",
        "tournamentId": 0,
        "tournamentName": "Tournament Name 1",
        "link": "https://www.duosmium.org/results/...",
        "season": "2025"
      }
    ]
  }
}
```

### State Data Format (CA.json)
```json
{
  "School Name Varsity": {
    "seasons": {
      "2025": {
        "events": {
          "__OVERALL__": {
            "rating": 2052.38,
            "history": [...]
          }
        }
      }
    },
    "meta": {
      "games": 26830,
      "events": 28
    }
  }
}
```

## Implementation Details

### Data Loading System (`utils/dataLoader.ts`)

The centralized data loader provides:

1. **State-Based Loading**: Loads from individual state JSON files
2. **Metadata Integration**: Uses meta.json for efficient data mapping
3. **Caching**: 5-minute cache for performance optimization
4. **Error Handling**: Comprehensive error handling and retry logic
5. **Progressive Loading**: Loads state data individually for better performance

### Custom Hook (`hooks/useEloData.ts`)

Provides a React hook for managing data loading state:
- Loading state management
- Error handling
- Refetch functionality
- Automatic dependency tracking

### Usage Example

```typescript
import { useEloData } from './hooks/useEloData';

function MyComponent() {
  const { data, loading, error, refetch } = useEloData({ 
    division: 'c',
    states: ['CA', 'IL'] // Future: load specific states
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return <div>Data loaded: {data ? 'Yes' : 'No'}</div>;
}
```

## Benefits

### Performance
- **Reduced Initial Load**: Only load data for states being viewed
- **Faster Page Loads**: Smaller individual files
- **Better Caching**: Browser can cache individual state files

### Scalability
- **Easier Updates**: Update individual state files instead of entire dataset
- **Reduced Memory Usage**: Load only needed data
- **Better CDN Performance**: Smaller files cache better

### Development
- **Easier Testing**: Test with individual state files
- **Incremental Migration**: Migrate states one at a time
- **Better Debugging**: Isolate issues to specific states

## Implementation Status

### Phase 1: Preparation ✅
- ✅ Centralized data loading system
- ✅ Caching infrastructure
- ✅ Error handling
- ✅ Documentation

### Phase 2: Data Generation ✅
- ✅ Updated `script.js` to generate state-based files
- ✅ Created metadata files
- ✅ Validated data integrity

### Phase 3: Implementation ✅
- ✅ Updated data loader to use state-based files
- ✅ Implemented progressive loading
- ✅ Removed legacy format dependencies

### Phase 4: Optimization (Future)
- Add state selection UI
- Implement data compression
- Optimize cache strategies

## Script.js Implementation

The `script.js` file has been updated to:

1. **Generate State-Based Files**: Split data by state ✅
2. **Create Metadata Files**: Generate meta.json for each division ✅
3. **Precalculate Tournament Timeline**: Generate tournament timeline data ✅
4. **Add Validation**: Ensure data integrity across files ✅

### Script.js Implementation

```javascript
// Generate state-based files
function generateStateFiles(eloData, division, metadata) {
  const statesDir = path.join(OUTPUT_DIR, `states${division}`);
  
  // Create states directory if it doesn't exist
  if (!fs.existsSync(statesDir)) {
    fs.mkdirSync(statesDir, { recursive: true });
  }
  
  // Precalculate tournament timeline data
  const tournamentTimeline = precalculateTournamentTimeline(eloData, metadata);
  
  // Create metadata file
  const metadataFile = {
    teams: metadata.teamIds,
    events: metadata.eventIds,
    tournaments: metadata.tournamentIds,
    states: {},
    tournamentTimeline: tournamentTimeline
  };
  
  // Generate state files
  for (const stateCode in eloData) {
    const stateData = eloData[stateCode];
    const stateFile = path.join(statesDir, `${stateCode}.json`);
    
    // Write state data
    fs.writeFileSync(stateFile, JSON.stringify(stateData));
    
    // Add state info to metadata
    metadataFile.states[stateCode] = getStateName(stateCode);
  }
  
  // Write metadata file
  const metaFile = path.join(statesDir, 'meta.json');
  fs.writeFileSync(metaFile, JSON.stringify(metadataFile, null, 2));
}
```

## Notes

- The system uses only state-based files for optimal performance
- All data is loaded from individual state files with metadata
- Progressive loading reduces initial page load times
- Individual state files can be cached more efficiently by browsers and CDNs
- Tournament timeline data is precalculated for efficient chart rendering
