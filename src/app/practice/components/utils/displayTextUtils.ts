export function getSubtopicDisplayText(subtopics: string[]): string {
  if (subtopics.length === 0) {
    return "All Subtopics";
  }
  if (subtopics.length === 1) {
    return subtopics[0] || "All Subtopics";
  }
  return `${subtopics.length} selected`;
}

export function getDifficultyDisplayText(difficulties: string[]): string {
  if (difficulties.length === 0) {
    return "All Difficulties";
  }
  if (difficulties.length === 1) {
    return difficulties[0] || "All Difficulties";
  }
  return `${difficulties.length} selected`;
}
