export interface CipherVideo {
  title: string;
  url: string;
  description?: string;
}

export interface CipherVideoData {
  [cipherType: string]: CipherVideo[];
}

export const cipherVideos: CipherVideoData = {
  'Misc. Aristocrat': [
    {
      title: 'Misc. Aristocrat Basics',
      url: 'https://www.youtube.com/watch?v=example1',
      description: 'Introduction to Misc. Aristocrat ciphers'
    },
    {
      title: 'Misc. Aristocrat Advanced',
      url: 'https://www.youtube.com/watch?v=example2',
      description: 'Advanced solving techniques for Misc. Aristocrat'
    }
  ],
  'K1 Aristocrat': [
    {
      title: 'K1 Aristocrat Basics',
      url: 'https://www.youtube.com/watch?v=KLDnnigj1Xs',
      description: 'Introduction to K1 Aristocrat ciphers'
    },
    {
      title: 'K1 Aristocrat Intermediate',
      url: 'https://www.youtube.com/watch?v=1LVBCOOsYAA',
      description: 'Intermediate solving techniques'
    },
    {
      title: 'K1 Aristocrat Advanced',
      url: 'https://www.youtube.com/watch?v=4Ur_sGJJjzE',
      description: 'Advanced solving strategies'
    }
  ],
  'K2 Aristocrat': [
    {
      title: 'K2 Aristocrat Basics',
      url: 'https://www.youtube.com/watch?v=KLDnnigj1Xs',
      description: 'Introduction to K2 Aristocrat ciphers'
    },
    {
      title: 'K2 Aristocrat Intermediate',
      url: 'https://www.youtube.com/watch?v=3iNsLoijl60',
      description: 'Intermediate solving techniques'
    },
    {
      title: 'K2 Aristocrat Advanced',
      url: 'https://www.youtube.com/watch?v=GtwgZqNdRvA',
      description: 'Advanced solving strategies'
    }
  ],
  'K3 Aristocrat': [
    {
      title: 'K3 Aristocrat Basics',
      url: 'https://www.youtube.com/watch?v=KLDnnigj1Xs',
      description: 'Introduction to K3 Aristocrat ciphers'
    },
    {
      title: 'K3 Aristocrat Advanced',
      url: 'https://www.youtube.com/watch?v=BMMns0PHz70',
      description: 'Advanced solving techniques for K3 Aristocrat'
    }
  ],
  'Hill 2x2': [
    {
      title: 'Hill 2x2 Cipher',
      url: 'https://www.youtube.com/watch?v=AyiVMC-rJd8',
      description: 'Complete guide to Hill 2x2 cipher'
    }
  ],
  'Hill 3x3': [
    {
      title: 'Hill 3x3 Cipher',
      url: 'https://www.youtube.com/watch?v=JK3ur6W4rvw',
      description: 'Complete guide to Hill 3x3 cipher'
    }
  ],
  'K1 Patristocrat': [
    {
      title: 'K1 Patristocrat Cipher',
      url: 'https://www.youtube.com/watch?v=WRhiaHFBZLw',
      description: 'Complete guide to K1 Patristocrat cipher'
    }
  ],
  'K2 Patristocrat': [
    {
      title: 'K2 Patristocrat Cipher',
      url: 'https://www.youtube.com/watch?v=bdFbWE0vO74',
      description: 'Complete guide to K2 Patristocrat cipher'
    }
  ],
  'K3 Patristocrat': [
    {
      title: 'K3 Patristocrat Cipher',
      url: 'https://www.youtube.com/watch?v=WRhiaHFBZLw',
      description: 'Complete guide to K3 Patristocrat cipher'
    }
  ],
  'Misc. Patristocrat': [
    {
      title: 'Misc. Patristocrat Cipher',
      url: 'https://www.youtube.com/watch?v=WRhiaHFBZLw',
      description: 'Complete guide to Misc. Patristocrat cipher'
    }
  ],
  'Baconian': [
    {
      title: 'Baconian Cipher Basics',
      url: 'https://www.youtube.com/watch?v=wIDJ-OVFwv0',
      description: 'Introduction to Baconian cipher'
    },
    {
      title: 'Baconian Cipher Advanced',
      url: 'https://www.youtube.com/watch?v=vv17Jbf2zb8',
      description: 'Advanced Baconian cipher techniques'
    }
  ],
  'Xenocrypt': [
    {
      title: 'Xenocrypt Cipher',
      url: 'https://www.youtube.com/watch?v=ldB6VFT-PzI',
      description: 'Complete guide to Xenocrypt cipher'
    }
  ],
  'Fractionated Morse': [
    {
      title: 'Fractionated Morse Cipher',
      url: 'https://www.youtube.com/watch?v=qFyVq02M7xA',
      description: 'Complete guide to Fractionated Morse cipher'
    }
  ],
  'Porta': [
    {
      title: 'Porta Cipher',
      url: 'https://www.youtube.com/watch?v=J045Xg5-QPI',
      description: 'Complete guide to Porta cipher'
    }
  ],
  'Nihilist': [
    {
      title: 'Nihilist Cipher',
      url: 'https://www.youtube.com/watch?v=T-ooq2J_a5I',
      description: 'Complete guide to Nihilist cipher'
    }
  ],
  'Checkerboard': [
    {
      title: 'Checkerboard Cipher',
      url: 'https://www.youtube.com/watch?v=1ORq7Pb0-q8',
      description: 'Complete guide to Checkerboard cipher'
    }
  ],
  'Columnar Transposition': [
    {
      title: 'Columnar Transposition Cipher',
      url: 'https://www.youtube.com/watch?v=I1uDv3mBp2U',
      description: 'Complete guide to Columnar Transposition cipher'
    }
  ],
  'Atbash': [
    {
      title: 'Atbash Cipher',
      url: 'https://www.youtube.com/watch?v=dr5Y5uaacps',
      description: 'Complete guide to Atbash cipher'
    }
  ],
  'Affine': [
    {
      title: 'Affine Cipher',
      url: 'https://www.youtube.com/watch?v=S5QZ1AywBCY',
      description: 'Complete guide to Affine cipher'
    }
  ],
  'Caesar': [
    {
      title: 'Caesar Cipher',
      url: 'https://www.youtube.com/watch?v=UMvP7URrXiU',
      description: 'Complete guide to Caesar cipher'
    }
  ]
};

export const getVideosForCipher = (cipherType: string): CipherVideo[] => {
  return cipherVideos[cipherType] || [];
};
