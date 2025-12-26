const DUOSMIUM_BASE_URL = "https://www.duosmium.org/results/";

export const normalizeDuosmiumLink = (link?: string): string => {
	if (!link) {
		return "";
	}

	if (link.startsWith("http://") || link.startsWith("https://")) {
		return link;
	}

	return `${DUOSMIUM_BASE_URL}${link.replace(/^\/+/, "")}`;
};
