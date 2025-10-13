import { getEventCapabilities } from '@/lib/utils/eventConfig';
import { EVENTS_2026 } from '@/lib/constants/events2026';
import { Question, RosterMember } from './assignmentTypes';

// Event name mapping for special cases (same as backend)
const eventNameMapping: Record<string, string> = {
  'Dynamic Planet': 'Dynamic Planet - Oceanography',
  'Water Quality': 'Water Quality - Freshwater',
  'Materials Science': 'Materials Science - Nanomaterials'
};

// Handle Anatomy & Physiology distribution
const anatomyEvents = [
  'Anatomy - Endocrine',
  'Anatomy - Nervous',
  'Anatomy - Sense Organs'
];

// Get the mapped event name for subtopic fetching
const getMappedEventName = (eventName: string): string => {
  if (eventNameMapping[eventName]) {
    return eventNameMapping[eventName];
  }
  return eventName;
};

export const getAvailableEvents = (): string[] => {
  return EVENTS_2026.map(event => event.name);
};

export const getEventSubtopics = async (eventName: string): Promise<string[]> => {
  try {
    // Get the mapped event name for subtopic fetching
    const mappedEventName = getMappedEventName(eventName);
    
    // For Anatomy & Physiology, combine subtopics from all three events
    if (eventName === 'Anatomy & Physiology') {
      const allSubtopics: string[] = [];
      
      for (const anatomyEvent of anatomyEvents) {
        try {
          // Try API first
          const response = await fetch(`/api/meta/subtopics?event=${encodeURIComponent(anatomyEvent)}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
              allSubtopics.push(...data.data.filter(subtopic => subtopic && subtopic !== 'unknown'));
              continue;
            }
          }
          
          // Fallback to static data
          const staticResponse = await fetch('/subtopics.json');
          if (staticResponse.ok) {
            const staticData = await staticResponse.json();
            const subtopics = staticData[anatomyEvent];
            if (Array.isArray(subtopics)) {
              allSubtopics.push(...subtopics.filter(subtopic => subtopic && subtopic !== 'unknown'));
            }
          }
        } catch (error) {
          console.error(`Error fetching subtopics for ${anatomyEvent}:`, error);
        }
      }
      
      // Remove duplicates and return
      return [...new Set(allSubtopics)];
    }
    
    // For other events, use the mapped event name
    // First try to fetch from the API
    const response = await fetch(`/api/meta/subtopics?event=${encodeURIComponent(mappedEventName)}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        return data.data.filter(subtopic => subtopic && subtopic !== 'unknown');
      }
    }
    
    // Fallback to static data from subtopics.json
    const staticResponse = await fetch('/subtopics.json');
    if (staticResponse.ok) {
      const staticData = await staticResponse.json();
      const subtopics = staticData[mappedEventName];
      if (Array.isArray(subtopics)) {
        return subtopics.filter(subtopic => subtopic && subtopic !== 'unknown');
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching subtopics:', error);
    return [];
  }
};

export const getEventCapabilitiesForEvent = (eventName: string) => {
  return getEventCapabilities(eventName);
};

export const generateQuestions = async (
  eventName: string,
  questionCount: number,
  questionType: 'mcq' | 'both' | 'frq',
  selectedSubtopics: string[],
  idPercentage: number,
  pureIdOnly: boolean,
  teamId: string
): Promise<Question[]> => {
  const capabilities = getEventCapabilitiesForEvent(eventName);
  
  // Convert raw ID question count to percentage
  const idPercentageValue = questionCount > 0 ? Math.round((idPercentage / questionCount) * 100) : 0;

  const requestBody = {
    event_name: eventName,
    question_count: questionCount,
    question_types: questionType === 'both' ? ['multiple_choice', 'free_response'] : [questionType === 'mcq' ? 'multiple_choice' : 'free_response'],
    subtopics: selectedSubtopics,
    id_percentage: idPercentageValue,
    pure_id_only: pureIdOnly,
    supports_picture_questions: capabilities.supportsPictureQuestions,
    supports_identification_only: capabilities.supportsIdentificationOnly
  };

  const response = await fetch(`/api/teams/${teamId}/assignments/generate-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error('Failed to generate questions');
  }

  const data = await response.json();
  return data.questions || [];
};

export const fetchRosterMembers = async (teamId: string, subteamId?: string): Promise<RosterMember[]> => {
  // Fetch both roster data and team members data
  const rosterUrl = subteamId 
    ? `/api/teams/${teamId}/roster?subteamId=${subteamId}`
    : `/api/teams/${teamId}/roster`;
  
  const membersUrl = subteamId 
    ? `/api/teams/${teamId}/members?subteamId=${subteamId}`
    : `/api/teams/${teamId}/members`;

  const [rosterResponse, membersResponse] = await Promise.all([
    fetch(rosterUrl),
    fetch(membersUrl)
  ]);
  
  if (!rosterResponse.ok) {
    throw new Error('Failed to fetch roster data');
  }
  
  if (!membersResponse.ok) {
    throw new Error('Failed to fetch team members');
  }

  const rosterData = await rosterResponse.json();
  const membersData = await membersResponse.json();
  
  const roster = rosterData.roster || {};
  const members = membersData.members || [];
  
  // Create a map of roster entries with their linking status
  const rosterEntries = new Map<string, { isLinked: boolean, userId?: string, userEmail?: string, username?: string }>();
  
  // Process roster data to find linked entries
  Object.values(roster).forEach((students: unknown) => {
    if (Array.isArray(students)) {
      students.forEach(student => {
        if (typeof student === 'string' && student.trim()) {
          const studentName = student.trim();
          if (!rosterEntries.has(studentName)) {
            rosterEntries.set(studentName, { isLinked: false });
          }
        }
      });
    }
  });
  
  // Check which roster entries are linked to team members
  members.forEach((member: any) => {
    const memberName = member.name;
    if (rosterEntries.has(memberName)) {
      const entry = rosterEntries.get(memberName)!;
      entry.isLinked = true;
      entry.userId = member.id;
      entry.userEmail = member.email;
      entry.username = member.username; // Use the actual username from the API
    }
  });
  
  // Create final roster members list
  const rosterMembers: RosterMember[] = [];
  
  // Add all roster entries
  rosterEntries.forEach((entry, studentName) => {
    rosterMembers.push({
      student_name: studentName,
      isLinked: entry.isLinked,
      user_id: entry.userId,
      subteam_id: subteamId,
      userEmail: entry.userEmail,
      username: entry.username
    });
  });
  
  // Add team members who are not in the roster yet
  members.forEach((member: any) => {
    const memberName = member.name;
    if (!rosterEntries.has(memberName)) {
      rosterMembers.push({
        student_name: memberName,
        isLinked: true, // Team members are always "linked" since they have accounts
        user_id: member.id,
        subteam_id: subteamId,
        userEmail: member.email,
        username: member.username // Use the actual username from the API
      });
    }
  });
  
  return rosterMembers;
};

export const createAssignment = async (
  teamId: string,
  subteamId: string | undefined,
  assignmentData: {
    title: string;
    description: string;
    assignment_type: string;
    due_date: string;
    points: number;
    time_limit_minutes: number;
    event_name: string;
    questions: Question[];
    roster_members: string[];
    codebusters_params?: {
      questionCount: number;
      cipherTypes: string[];
      division: 'B' | 'C' | 'any';
      charLengthMin: number;
      charLengthMax: number;
    };
  }
) => {
  // Check if this is a Codebusters assignment
  if (assignmentData.event_name === 'Codebusters') {
    return createCodebustersAssignment(teamId, subteamId, assignmentData);
  }

  const url = subteamId 
    ? `/api/teams/${teamId}/subteams/${subteamId}/assignments`
    : `/api/teams/${teamId}/assignments`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignmentData),
  });

  if (!response.ok) {
    throw new Error('Failed to create assignment');
  }

  return await response.json();
};

export const createCodebustersAssignment = async (
  teamId: string,
  subteamId: string | undefined,
  assignmentData: {
    title: string;
    description: string;
    assignment_type: string;
    due_date: string;
    points: number;
    time_limit_minutes: number;
    event_name: string;
    questions: Question[];
    roster_members: string[];
    codebusters_params?: {
      questionCount: number;
      cipherTypes: string[];
      division: 'B' | 'C' | 'any';
      charLengthMin: number;
      charLengthMax: number;
    };
  }
) => {
  const url = subteamId 
    ? `/api/teams/${teamId}/subteams/${subteamId}/assignments/codebusters`
    : `/api/teams/${teamId}/assignments/codebusters`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assignmentData),
  });

  if (!response.ok) {
    throw new Error('Failed to create Codebusters assignment');
  }

  return await response.json();
};

export const validateAssignmentDetails = (details: {
  title: string;
  eventName: string;
}): string | null => {
  if (!details.title.trim()) {
    return 'Title is required to proceed';
  }
  if (!details.eventName.trim()) {
    return 'Event selection is required to proceed';
  }
  return null;
};

export const validateQuestionGeneration = (settings: {
  questionCount: number;
  questionType: string;
}): string | null => {
  if (settings.questionCount < 1 || settings.questionCount > 50) {
    return 'Question count must be between 1 and 50';
  }
  return null;
};

export const validateRosterSelection = (selectedRoster: string[]): string | null => {
  if (selectedRoster.length === 0) {
    return 'Please select at least one roster member';
  }
  return null;
};
