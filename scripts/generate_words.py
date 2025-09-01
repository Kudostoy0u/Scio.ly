#!/usr/bin/env python3
import csv, json, os, re
from typing import List, Tuple

SRC = os.path.join(os.path.dirname(__file__), '..', 'unigram_freq.csv')
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'words.json')

PROFANITY = [
    # simple list; matched as substrings case-insensitive (may be aggressive)
    'fuck','shit','bitch','ass','cum','cunt','piss','dick','cock','pussy','whore','slut','fag','nigger','retard','slag','wank','jizz','twat','bollock','arse','spastic','rape','rapist','anus','jerkoff','handjob','blowjob','boob','boobs','tits','titties','nipples',
    # expanded adult/sexual terms
    'sex','sexy','penis','vagina','vag','labia','clitoris','clit','phallus','ejaculate','ejaculation','sperm','semen','masturbate','masturbation','orgasm','erotic','porno','porn','pornography','hardcore','softcore','x-rated','xxx',
    'upskirt','hentai','nsfw','fetish','bdsm','bondage','dominatrix','dominance','submissive','stripper','escort','cameltoe','lingerie','panties','thong','milf','anal','oral','rimjob','anilingus','cunnilingus','fellatio'
]

BLOCK_RE = re.compile('|'.join(re.escape(w) for w in PROFANITY), re.IGNORECASE)


def load_rows() -> List[Tuple[str,int]]:
    rows: List[Tuple[str,int]] = []
    with open(SRC, newline='', encoding='utf-8') as f:
        r = csv.DictReader(f)
        for row in r:
            w = row['word']
            if len(w) < 3:  # at least 3 letters
                continue
            if not w.isalpha():
                continue
            if BLOCK_RE.search(w):
                continue
            try:
                c = int(row['count'])
            except Exception:
                continue
            rows.append((w.lower(), c))
    return rows


def main():
    os.makedirs(os.path.join(os.path.dirname(__file__), '..', 'public'), exist_ok=True)
    rows = load_rows()

    # Determine top 200 most frequent 3-letter words to whitelist
    three_letter = [(w, c) for (w, c) in rows if len(w) == 3]
    three_letter.sort(key=lambda x: x[1], reverse=True)
    top200_three = set(w for w, _ in three_letter[:200])

    # Now sort all rows and collect up to 4000 respecting the 3-letter whitelist
    rows.sort(key=lambda x: x[1], reverse=True)
    selected: List[str] = []
    seen = set()
    for w, _ in rows:
        if w in seen:
            continue
        if len(w) == 3 and w not in top200_three:
            continue
        selected.append(w)
        seen.add(w)
        if len(selected) >= 4000:
            break

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(selected, f)
    print(f'wrote {len(selected)} words to {OUT}')

if __name__ == '__main__':
    main()
