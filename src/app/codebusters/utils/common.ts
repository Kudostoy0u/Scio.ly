export const mod26 = (n: number): number => ((n % 26) + 26) % 26;

export const letterToNumber = (letter: string): number => {
    const upperLetter = letter.toUpperCase();
    if (upperLetter === 'Ñ') return 26;
    return upperLetter.charCodeAt(0) - 65;
};

export const numberToLetter = (num: number): string => {
    if (num === 26) return 'Ñ';
    return String.fromCharCode(mod26(num) + 65);
};

export const FALLBACK_WORDS = ['KEYWORD', 'CIPHER', 'SECRET', 'PUZZLE', 'MESSAGE'];

let CUSTOM_WORD_BANK: string[] | null = null;
export const setCustomWordBank = (words: string[]): void => {
    try {
        CUSTOM_WORD_BANK = Array.isArray(words) ? words.map(w => (w || '').toString().toUpperCase()) : null;
    } catch {
        CUSTOM_WORD_BANK = null;
    }
};
export const getCustomWordBank = (): string[] | null => CUSTOM_WORD_BANK;

export const generateRandomKeyword = (): string => {
    const bank = getCustomWordBank();
    const list = bank && bank.length > 0 ? bank : FALLBACK_WORDS;
    return list[Math.floor(Math.random() * list.length)].toUpperCase();
};


