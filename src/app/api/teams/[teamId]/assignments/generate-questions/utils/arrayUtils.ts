export function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = shuffled[i];
		if (temp !== undefined && shuffled[j] !== undefined) {
			shuffled[i] = shuffled[j];
			shuffled[j] = temp;
		}
	}
	return shuffled;
}

export function calculateEventDistribution(
	totalQuestions: number,
	numEvents: number,
): number[] {
	const basePerEvent = Math.floor(totalQuestions / numEvents);
	const remainder = totalQuestions % numEvents;
	const distribution = new Array(numEvents).fill(basePerEvent);

	// Distribute remainder to first few events
	for (let i = 0; i < remainder; i++) {
		distribution[i]++;
	}

	return distribution;
}
