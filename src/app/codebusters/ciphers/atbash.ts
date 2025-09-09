import { letterToNumber } from '../utils/common';

export const encryptAtbash = (text: string): { encrypted: string } => {
    const atbashMap = 'ZYXWVUTSRQPONMLKJIHGFEDCBA';
    const encrypted = text.toUpperCase().replace(/[A-Z]/g, char => 
        atbashMap[letterToNumber(char)] || char
    );
    return { encrypted };
};


