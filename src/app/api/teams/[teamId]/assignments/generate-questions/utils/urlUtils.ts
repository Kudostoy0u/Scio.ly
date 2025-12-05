const URL_REGEX = /^https?:\/\//i;

export function buildAbsoluteUrl<T extends string | undefined>(
	src?: T,
	origin?: string,
): T {
	if (!src) {
		return undefined as T;
	}
	try {
		if (URL_REGEX.test(src)) {
			return src as T;
		}
		if (origin && src.startsWith("/")) {
			return `${origin}${src}` as T;
		}
		return src as T;
	} catch {
		return src as T;
	}
}
