import { getCustomWordBank, FALLBACK_WORDS } from '../utils/common';

export const encryptPorta = (text: string): { encrypted: string; keyword: string } => {
    const portaKeywords = (getCustomWordBank() && getCustomWordBank()!.length > 0 ? getCustomWordBank()! : FALLBACK_WORDS).map(w => w.toUpperCase());

    const portaTable = {
        'AB': 'NOPQRSTUVWXYZABCDEFGHIJKLM',
        'CD': 'OPQRSTUVWXYZNABCDEFGHIJKLM', 
        'EF': 'PQRSTUVWXYZNOABCDEFGHIJKLM',
        'GH': 'QRSTUVWXYZNOPABCDEFGHIJKLM',
        'IJ': 'RSTUVWXYZNOPQABCDEFGHIJKLM',
        'KL': 'STUVWXYZNOPQRABCDEFGHIJKLM',
        'MN': 'TUVWXYZNOPQRSABCDEFGHIJKLM',
        'OP': 'UVWXYZNOPQRSTABCDEFGHIJKLM',
        'QR': 'VWXYZNOPQRSTUABCDEFGHIJKLM',
        'ST': 'WXYZNOPQRSTUVABCDEFGHIJKLM',
        'UV': 'XYZNOPQRSTUVWABCDEFGHIJKLM',
        'WX': 'YZNOPQRSTUVWXABCDEFGHIJKLM',
        'YZ': 'ZNOPQRSTUVWXYABCDEFGHIJKLM'
    } as const;

    const keyword = portaKeywords[Math.floor(Math.random() * portaKeywords.length)];

    const cleanText = text.toUpperCase().replace(/[^A-Z]/g, '');

    let encrypted = '';
    for (let i = 0; i < cleanText.length; i++) {
        const keywordChar = keyword[i % keyword.length];
        const textChar = cleanText[i];

        const charToPair: { [key: string]: keyof typeof portaTable } = {
            'A': 'AB', 'B': 'AB',
            'C': 'CD', 'D': 'CD',
            'E': 'EF', 'F': 'EF',
            'G': 'GH', 'H': 'GH',
            'I': 'IJ', 'J': 'IJ',
            'K': 'KL', 'L': 'KL',
            'M': 'MN', 'N': 'MN',
            'O': 'OP', 'P': 'OP',
            'Q': 'QR', 'R': 'QR',
            'S': 'ST', 'T': 'ST',
            'U': 'UV', 'V': 'UV',
            'W': 'WX', 'X': 'WX',
            'Y': 'YZ', 'Z': 'YZ'
        };

        const pair = charToPair[keywordChar];
        const portaRow = portaTable[pair];

        const charCode = textChar.charCodeAt(0);
        let cipherChar;
        if (charCode >= 65 && charCode <= 77) {
            const headerRow = 'ABCDEFGHIJKLM';
            const headerIndex = headerRow.indexOf(textChar);
            cipherChar = portaRow[headerIndex];
        } else {
            const keyRowIndex = portaRow.indexOf(textChar);
            const headerRow = 'ABCDEFGHIJKLM';
            cipherChar = headerRow[keyRowIndex];
        }
        encrypted += cipherChar;
    }

    const blockSizes = [3, 3, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6];
    const blockSize = blockSizes[Math.floor(Math.random() * blockSizes.length)];
    encrypted = encrypted.match(new RegExp(`.{1,${blockSize}}`, 'g'))?.join(' ') || encrypted;

    return { encrypted, keyword };
};


