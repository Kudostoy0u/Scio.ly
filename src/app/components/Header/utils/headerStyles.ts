export function computeHeaderOpacity(
	isTestPage: boolean,
	isHomePage: boolean,
	headerOpacity: number,
	scrollOpacity: number,
): number {
	const targetOpacity = 0.95;
	if (isTestPage) {
		return headerOpacity;
	}
	if (isHomePage) {
		return Math.min(scrollOpacity * targetOpacity, targetOpacity);
	}
	return targetOpacity;
}

export function computeBackgroundColor(
	darkMode: boolean,
	opacity: number,
): string {
	if (darkMode) {
		return `rgba(17, 24, 39, ${opacity})`; // gray-900
	}
	return `rgba(255, 255, 255, ${opacity})`;
}

export function computeBorderColor(darkMode: boolean, opacity: number): string {
	if (opacity === 0) {
		return "transparent";
	}
	if (darkMode) {
		return `rgba(31, 41, 55, ${opacity})`; // gray-800
	}
	return `rgba(229, 231, 235, ${opacity})`; // gray-200
}

export function shouldShowBlur(
	isHomePage: boolean,
	isTestPage: boolean,
	opacity: number,
): boolean {
	if (!(isHomePage || isTestPage)) {
		return true;
	}
	return opacity > 0.02 && !isTestPage;
}
