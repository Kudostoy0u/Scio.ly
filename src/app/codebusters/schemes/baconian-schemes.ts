export interface BaconianScheme {
  type: string;
  category: string;
  description: string;
  renderType: 'direct' | 'category' | 'set' | 'formatting';
  zero?: string | string[];
  one?: string | string[];
  cssClass?: string;
  cssClassB?: string;
}

export interface SchemesData {
  schemes: {
    traditional: BaconianScheme[];
    emoji: BaconianScheme[];
    symbols: BaconianScheme[];
    formatting: BaconianScheme[];
  };
  probabilities: {
    traditional: number;
    emoji: number;
    symbols: number;
    formatting: number;
  };
}

export const baconianSchemes: SchemesData = {
  schemes: {
    traditional: [
      {
        type: 'A/B',
        category: 'traditional',
        description: 'Traditional A and B representation',
        renderType: 'direct',
        zero: 'A',
        one: 'B'
      },
      {
        type: 'Vowels/Consonants',
        category: 'traditional',
        description: 'Vowels for A, consonants for B',
        renderType: 'category',
        zero: 'AEIOU',
        one: 'BCDFGHJKLMNPQRSTVWXYZ'
      },
      {
        type: 'Odd/Even',
        category: 'traditional',
        description: 'Odd-positioned letters for A, even for B',
        renderType: 'category',
        zero: 'ACEGIKMOQSUWY',
        one: 'BDFHJLNPRTVXZ'
      }
    ],
    emoji: [
      {
        type: 'Happy vs Sad',
        category: 'emoji',
        description: 'Happy emojis for A, sad for B',
        renderType: 'set',
        zero: ['😊', '😄', '😃', '😁', '😆', '😅', '😂', '🤣', '😉', '😋'],
        one: ['😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩']
      },
      {
        type: 'Fire vs Ice',
        category: 'emoji',
        description: 'Fire emojis for A, ice for B',
        renderType: 'set',
        zero: ['🔥', '🌋', '☀️', '⚡', '💥', '🌡️'],
        one: ['❄️', '🧊', '🌨️', '💎', '🔮', '🌊']
      },
      {
        type: 'Day vs Night',
        category: 'emoji',
        description: 'Day emojis for A, night for B',
        renderType: 'set',
        zero: ['☀️', '🌅', '🌞', '🌤️', '🌻', '🐦'],
        one: ['🌙', '⭐', '🌃', '🌌', '🦉', '🦇']
      },
      {
        type: 'Land vs Sea',
        category: 'emoji',
        description: 'Land emojis for A, sea for B',
        renderType: 'set',
        zero: ['🏔️', '🌲', '🦁', '🐻', '🌵', '🏜️'],
        one: ['🌊', '🐋', '🐙', '🦈', '🏝️', '⚓']
      },
      {
        type: 'Tech vs Nature',
        category: 'emoji',
        description: 'Tech emojis for A, nature for B',
        renderType: 'set',
        zero: ['💻', '📱', '🤖', '🚀', '⚡', '🔋'],
        one: ['🌿', '🌸', '🦋', '🌳', '🍃', '🌺']
      },
      {
        type: 'Sweet vs Spicy',
        category: 'emoji',
        description: 'Sweet emojis for A, spicy for B',
        renderType: 'set',
        zero: ['🍰', '🍭', '🍫', '🍪', '🍦', '🍯'],
        one: ['🌶️', '🔥', '💥', '⚡', '🌋', '💣']
      },
      {
        type: 'Fast vs Slow',
        category: 'emoji',
        description: 'Fast emojis for A, slow for B',
        renderType: 'set',
        zero: ['🏃', '🚀', '⚡', '💨', '🏎️', '🦅'],
        one: ['🐌', '🐢', '🦥', '🌱', '⏰', '🕰️']
      },
      {
        type: 'Loud vs Quiet',
        category: 'emoji',
        description: 'Loud emojis for A, quiet for B',
        renderType: 'set',
        zero: ['🔊', '📢', '🎵', '💥', '⚡', '🌋'],
        one: ['🔇', '🤫', '🦋', '🍃', '🌙', '💤']
      },
      {
        type: 'Hot vs Cold',
        category: 'emoji',
        description: 'Hot emojis for A, cold for B',
        renderType: 'set',
        zero: ['🔥', '🌡️', '☀️', '🌋', '💥', '⚡'],
        one: ['❄️', '🧊', '🌨️', '💎', '🔮', '🌊']
      }
    ],
    symbols: [
      {
        type: 'Thick vs Thin',
        category: 'symbols',
        description: 'Thick block for A, thin for B',
        renderType: 'direct',
        zero: '█',
        one: '░'
      },
      {
        type: 'Brackets vs Parentheses',
        category: 'symbols',
        description: 'Square brackets for A, parentheses for B',
        renderType: 'direct',
        zero: '[',
        one: '('
      },
      {
        type: 'Hash vs At',
        category: 'symbols',
        description: 'Hash for A, at symbol for B',
        renderType: 'direct',
        zero: '#',
        one: '@'
      },
      {
        type: 'Plus vs Minus',
        category: 'symbols',
        description: 'Plus for A, minus for B',
        renderType: 'direct',
        zero: '+',
        one: '-'
      },
      {
        type: 'Arrow Up vs Down',
        category: 'symbols',
        description: 'Up arrow for A, down for B',
        renderType: 'direct',
        zero: '↑',
        one: '↓'
      },
      {
        type: 'Star vs Heart',
        category: 'symbols',
        description: 'Star for A, heart for B',
        renderType: 'direct',
        zero: '★',
        one: '♥'
      }
    ],
    formatting: [
      {
        type: 'Underline vs Plain',
        category: 'formatting',
        description: 'Underlined letters for A, plain for B',
        renderType: 'formatting',
        cssClass: 'underline'
      },
      {
        type: 'Bold vs Italic',
        category: 'formatting',
        description: 'Bold letters for A, italic for B',
        renderType: 'formatting',
        cssClass: 'font-bold',
        cssClassB: 'italic'
      },
      {
        type: 'Strikethrough vs Normal',
        category: 'formatting',
        description: 'Strikethrough letters for A, normal for B',
        renderType: 'formatting',
        cssClass: 'line-through'
      },
      {
        type: 'Highlight vs Plain',
        category: 'formatting',
        description: 'Highlighted letters for A, plain for B',
        renderType: 'formatting',
        cssClass: 'bg-yellow-200 dark:bg-yellow-800'
      },
      {
        type: 'Accented vs Plain',
        category: 'formatting',
        description: 'Accented letters for A, plain for B',
        renderType: 'formatting',
        cssClass: 'font-bold underline'
      },
      {
        type: 'Uppercase vs Lowercase',
        category: 'formatting',
        description: 'Uppercase letters for A, lowercase for B',
        renderType: 'formatting',
        cssClass: 'uppercase',
        cssClassB: 'lowercase'
      }
    ]
  },
  probabilities: {
    traditional: 0.6,  // 40% A/B + 20% Vowels/Consonants + Odd/Even
    emoji: 0.15,       // Part of 40% special
    symbols: 0.15,     // Part of 40% special
    formatting: 0.1    // Part of 40% special
  }
};

export function selectRandomScheme(): BaconianScheme {
  const random = Math.random();
  let selectedCategory = 'traditional';
  let cumulativeProb = 0;
  
  for (const [category, prob] of Object.entries(baconianSchemes.probabilities)) {
    cumulativeProb += prob;
    if (random < cumulativeProb) {
      selectedCategory = category;
      break;
    }
  }
  
  const categorySchemes = baconianSchemes.schemes[selectedCategory as keyof typeof baconianSchemes.schemes];
  return categorySchemes[Math.floor(Math.random() * categorySchemes.length)];
}
