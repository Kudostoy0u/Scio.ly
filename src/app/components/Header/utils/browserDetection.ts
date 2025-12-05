// Top-level regex patterns for performance
const IOS_DEVICE_REGEX = /iphone|ipad|ipod/;
const CHROMIUM_BRAND_REGEX =
	/Chromium|Google Chrome|Microsoft Edge|Opera|OPR|Brave|Vivaldi|YaBrowser|Samsung Internet/i;
const EDGE_REGEX = /edg\//;
const OPERA_REGEX = /opr\//;
const FIREFOX_UA_REGEX = /firefox|fxios/;
const SAMSUNG_REGEX = /samsungbrowser/;
const CHROME_LIKE_UA_REGEX = /chrome|crios|crmo/;
const SAFARI_REGEX = /safari/;
const NON_SAFARI_BROWSER_REGEX =
	/chrome|crios|crmo|edg|opr|firefox|fxios|brave|electron/;

// Helper function to detect iOS device
export function detectIosDevice(ua: string): boolean {
	const maxTouchPoints = (navigator as Navigator & { maxTouchPoints?: number })
		.maxTouchPoints;
	return (
		IOS_DEVICE_REGEX.test(ua) ||
		((navigator as Navigator & { platform?: string; maxTouchPoints?: number })
			.platform === "MacIntel" &&
			maxTouchPoints !== undefined &&
			maxTouchPoints > 1)
	);
}

// Helper function to detect browser types
export function detectBrowserTypes(ua: string) {
	const uaData = (
		navigator as Navigator & {
			userAgentData?: { brands?: Array<{ brand: string }> };
		}
	).userAgentData;

	const isIosDevice = detectIosDevice(ua);
	const isChromiumBrand = !!uaData?.brands?.some((b: { brand: string }) =>
		CHROMIUM_BRAND_REGEX.test(b.brand),
	);
	const isEdge = EDGE_REGEX.test(ua);
	const isOpera = OPERA_REGEX.test(ua);
	const isFirefoxUa = FIREFOX_UA_REGEX.test(ua);
	const isSamsung = SAMSUNG_REGEX.test(ua);
	const isChromeLikeUa =
		CHROME_LIKE_UA_REGEX.test(ua) && !isEdge && !isOpera && !isFirefoxUa;
	const chromiumDetected =
		isChromiumBrand || isChromeLikeUa || isEdge || isOpera || isSamsung;
	const isSafariEngine =
		SAFARI_REGEX.test(ua) && !NON_SAFARI_BROWSER_REGEX.test(ua);

	return {
		isSafari: Boolean(isSafariEngine || isIosDevice),
		isChromium: chromiumDetected && !isIosDevice,
		isFirefox: isFirefoxUa,
		isStandalone:
			window.matchMedia?.("(display-mode: standalone)").matches ||
			Boolean((navigator as Navigator & { standalone?: boolean }).standalone),
	};
}

// Helper function to check if click is on toggle button
export function isClickOnToggleButton(
	target: HTMLElement,
	selector: string,
): boolean {
	return target.closest(selector) !== null;
}
