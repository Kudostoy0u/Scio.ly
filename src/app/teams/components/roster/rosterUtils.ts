// Division groups data
export const DIVISION_B_GROUPS = [
  { label: 'Conflict Block 1', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'], colorKey: 'blue' },
  { label: 'Conflict Block 2', events: ['Entomology', 'Experimental Design', 'Solar System'], colorKey: 'green' },
  { label: 'Conflict Block 3', events: ['Machines', 'Meteorology', 'Metric Mastery'], colorKey: 'yellow' },
  { label: 'Conflict Block 4', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'], colorKey: 'purple' },
  { label: 'Conflict Block 5', events: ['Heredity', 'Potions & Poisons', 'Rocks and Minerals'], colorKey: 'pink' },
  { label: 'Conflict Block 6', events: ['Anatomy & Physiology', 'Crime Busters', 'Write It Do It'], colorKey: 'indigo' },
  { label: 'Conflict Block 7', events: ['Boomilever', 'Helicopter', 'Hovercraft', 'Mission Possible', 'Scrambler'], colorKey: 'orange' },
];

export const DIVISION_C_GROUPS = [
  { label: 'Conflict Block 1', events: ['Anatomy & Physiology', 'Engineering CAD', 'Forensics'], colorKey: 'blue' },
  { label: 'Conflict Block 2', events: ['Codebusters', 'Disease Detectives', 'Remote Sensing'], colorKey: 'green' },
  { label: 'Conflict Block 3', events: ['Astronomy', 'Entomology', 'Experimental Design'], colorKey: 'yellow' },
  { label: 'Conflict Block 4', events: ['Chemistry Lab', 'Machines'], colorKey: 'purple' },
  { label: 'Conflict Block 5', events: ['Circuit Lab', 'Dynamic Planet', 'Water Quality'], colorKey: 'pink' },
  { label: 'Conflict Block 6', events: ['Designer Genes', 'Materials Science', 'Rocks and Minerals'], colorKey: 'indigo' },
  { label: 'Conflict Block 7', events: ['Boomilever', 'Bungee Drop', 'Electric Vehicle', 'Helicopter', 'Hovercraft', 'Robot Tour'], colorKey: 'orange' },
];

export interface ConflictBlock {
  label: string;
  events: string[];
  colorKey: string;
}

export interface Conflict {
  person: string;
  events: string[];
  conflictBlock: string;
  conflictBlockNumber: number;
}

export interface Team {
  id: string;
  school: string;
  division: 'B' | 'C';
  slug: string;
}

export interface Subteam {
  id: string;
  name: string;
  team_id: string;
  description: string;
  created_at: string;
}

export function getGroupColors(darkMode: boolean, colorKey: string) {
  const colorMap = {
    blue: {
      bg: darkMode ? 'bg-blue-950/30' : 'bg-blue-50/80',
      border: darkMode ? 'border-blue-500/60' : 'border-blue-400/80',
      text: darkMode ? 'text-blue-100' : 'text-blue-900'
    },
    green: {
      bg: darkMode ? 'bg-green-950/30' : 'bg-green-50/80',
      border: darkMode ? 'border-green-500/60' : 'border-green-400/80',
      text: darkMode ? 'text-green-100' : 'text-green-900'
    },
    yellow: {
      bg: darkMode ? 'bg-yellow-950/30' : 'bg-yellow-50/80',
      border: darkMode ? 'border-yellow-500/60' : 'border-yellow-400/80',
      text: darkMode ? 'text-yellow-100' : 'text-yellow-900'
    },
    purple: {
      bg: darkMode ? 'bg-purple-950/30' : 'bg-purple-50/80',
      border: darkMode ? 'border-purple-500/60' : 'border-purple-400/80',
      text: darkMode ? 'text-purple-100' : 'text-purple-900'
    },
    pink: {
      bg: darkMode ? 'bg-pink-950/30' : 'bg-pink-50/80',
      border: darkMode ? 'border-pink-500/60' : 'border-pink-400/80',
      text: darkMode ? 'text-pink-100' : 'text-pink-900'
    },
    indigo: {
      bg: darkMode ? 'bg-indigo-950/30' : 'bg-indigo-50/80',
      border: darkMode ? 'border-indigo-500/60' : 'border-indigo-400/80',
      text: darkMode ? 'text-indigo-100' : 'text-indigo-900'
    },
    orange: {
      bg: darkMode ? 'bg-orange-950/30' : 'bg-orange-50/80',
      border: darkMode ? 'border-orange-500/60' : 'border-orange-400/80',
      text: darkMode ? 'text-orange-100' : 'text-orange-900'
    }
  } as const;
  return colorMap[(colorKey as keyof typeof colorMap)] || colorMap.blue;
}

export function detectConflicts(rosterData: Record<string, string[]>, groups: ConflictBlock[]): Conflict[] {
  const conflicts: Conflict[] = [];
  
  const conflictBlocks: Record<string, number> = {};
  let nextConflictBlock = 1;

  // Check each conflict block for conflicts
  groups.forEach(group => {
    const groupEvents = group.events;
    const personToEvents: Record<string, string[]> = {};
    
    // Collect all people assigned to events in this conflict block
    groupEvents.forEach(eventName => {
      const eventRoster = rosterData[eventName] || [];
      eventRoster.forEach(person => {
        if (person.trim()) {
          if (!personToEvents[person]) {
            personToEvents[person] = [];
          }
          personToEvents[person].push(eventName);
        }
      });
    });
    
    // Find conflicts (people assigned to multiple events in the same conflict block)
    Object.entries(personToEvents).forEach(([person, events]) => {
      if (events.length > 1) {
        const conflictKey = `${person}-${group.label}`;
        if (!conflictBlocks[conflictKey]) {
          conflictBlocks[conflictKey] = nextConflictBlock++;
        }
        
        conflicts.push({
          person,
          events,
          conflictBlock: group.label,
          conflictBlockNumber: conflictBlocks[conflictKey]
        });
      }
    });
  });
  
  return conflicts;
}

export function getEventMaxSlots(eventName: string): number {
  return eventName.toLowerCase().includes('codebusters') || 
         eventName.toLowerCase().includes('experimental design') ? 3 : 2;
}

export function shouldShowAssignOption(
  isCaptain: boolean, 
  colorKey: string, 
  eventName: string, 
  isRemoved: boolean
): boolean {
  return isCaptain && 
         colorKey !== 'orange' && 
         eventName !== 'Engineering CAD' && 
         eventName !== 'Experimental Design' &&
         !isRemoved;
}
