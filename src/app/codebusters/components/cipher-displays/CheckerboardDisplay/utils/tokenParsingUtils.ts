const TRIPLE_OR_MORE_SPACES_REGEX = /\s{3,}/;
const WHITESPACE_REGEX = /\s+/;

export function parseTokensFromBlock(block: string): string[] {
	const tokens: string[] = [];
	const trimmed = block.trim();
	const compact = trimmed.replace(/\s+/g, "");
	for (let i = 0; i < compact.length; i += 2) {
		const a = compact[i];
		const b = compact[i + 1];
		if (a !== undefined) {
			tokens.push(b ? a + b : a);
		}
	}
	return tokens;
}

export function parseTokensAndBlocks(text: string): {
	tokens: string[];
	blockEnd: Set<number>;
} {
	const tokens: string[] = [];
	const blockEnd: Set<number> = new Set();
	const blocks = text.trim().split(TRIPLE_OR_MORE_SPACES_REGEX);
	let runningIndex = 0;
	for (let bi = 0; bi < blocks.length; bi++) {
		const block = blocks[bi];
		if (!block) {
			continue;
		}
		const blockTokens = parseTokensFromBlock(block);
		tokens.push(...blockTokens);
		runningIndex += blockTokens.length;
		if (bi < blocks.length - 1 && runningIndex > 0) {
			blockEnd.add(runningIndex - 1);
		}
	}
	return { tokens, blockEnd };
}

export function parseTokensFromText(text: string): string[] {
	const tokensLocal: string[] = [];
	const blocks = text.trim().split(TRIPLE_OR_MORE_SPACES_REGEX);
	for (const block of blocks) {
		const compact = block.replace(WHITESPACE_REGEX, "");
		for (let i = 0; i < compact.length; i += 2) {
			const a = compact[i];
			const b = compact[i + 1];
			if (a !== undefined) {
				tokensLocal.push(b ? a + b : a);
			}
		}
	}
	return tokensLocal;
}
