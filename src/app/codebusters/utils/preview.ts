export function clearPreviewLocalStorage(): void {
  const keys = [
    'codebustersQuotes',
    'codebustersQuoteIndices',
    'codebustersQuoteUUIDs',
    'codebustersShareData',
    'codebustersIsTestSubmitted',
    'codebustersTestScore',
    'codebustersTimeLeft',
    'codebustersRevealedLetters',
    'codebustersHintedLetters',
    'codebustersHintCounts',
    'codebustersQuotesLoadedFromStorage',
  ];
  try {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
    localStorage.setItem('codebustersForceRefresh', 'true');
  } catch {}
}

export function showPreviewToasts(toast: { info: (msg: string, opts?: any) => void }): void {
  try {
    toast.info('Tip: Use the delete icon on a question to replace it.', { autoClose: 6000 });
    setTimeout(() => {
      toast.info('When finished, click “Send Test” at the bottom to assign.', { autoClose: 6000 });
    }, 1200);
  } catch {}
}


