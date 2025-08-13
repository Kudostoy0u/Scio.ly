# Atbash Cipher

## Explanation
Atbash is a classical monoalphabetic substitution cipher that reflects the alphabet around its midpoint. Each letter is replaced by its opposite across the A–Z axis:

- A↔Z, B↔Y, C↔X, D↔W, E↔V, F↔U, G↔T, H↔S, I↔R, J↔Q, K↔P, L↔O, M↔N
- N↔M, O↔L, P↔K, Q↔J, R↔I, S↔H, T↔G, U↔F, V↔E, W↔D, X↔C, Y↔B, Z↔A

Key facts
- No key is required. The mapping is fixed and well-known.
- The cipher is reciprocal (an involution): applying Atbash twice returns the original text.
- Spaces, punctuation, and digits are usually preserved; letters are mapped A–Z only.
- Historically associated with Hebrew scripts and later adapted to Latin alphabets.

Why it’s approachable
- Single, universal mapping table—fast to learn and apply by hand.
- Ideal for warm-up or quick identification in Codebusters; common words (e.g., THE) map to recognizable patterns (THE→GSV).

## Mapping Table (One-Row Pairs)
A complete A–Z Atbash mapping, shown as bidirectional pairs (each pair maps both ways):

```
A↔Z  B↔Y  C↔X  D↔W  E↔V  F↔U  G↔T  H↔S  I↔R  J↔Q  K↔P  L↔O  M↔N
N↔M  O↔L  P↔K  Q↔J  R↔I  S↔H  T↔G  U↔F  V↔E  W↔D  X↔C  Y↔B  Z↔A
```

Index view (0-based A=0..Z=25)
```
i:  0  1  2  3  4  5  6  7  8  9 10 11 12 | 13 14 15 16 17 18 19 20 21 22 23 24 25
P:  A  B  C  D  E  F  G  H  I  J  K  L  M |  N  O  P  Q  R  S  T  U  V  W  X  Y  Z
C:  Z  Y  X  W  V  U  T  S  R  Q  P  O  N |  M  L  K  J  I  H  G  F  E  D  C  B  A
```

Mental mapping tips
- Mirror around the M/N midpoint; A↔Z, B↔Y, ... M↔N.
- Symmetry means you only need to memorize to the middle.

## How Decryption Works
- Atbash is an involution (self-inverse). Apply the mapping once to decrypt.

Steps
1) Normalize the ciphertext to A–Z.  
2) Map each letter through the same table.  
3) Preserve spacing and punctuation.

Quick check
- Mapping GSV (supposed THE) yields THE, confirming your mapping.

## Worked Examples (Decryption Only)
Example 1: Single word (cipher → plain)
```
Cipher: GSV
Plain:  THE
```
G→T, S→H, V→E

Example 2: Mixed case and digits (cipher → plain)
```
Cipher: Nvvg zg 5kn.
Plain:  Meet at 5pm.
```
- Often letters are case-normalized to uppercase for mapping; digits/punctuation pass through.

Example 3: Provided full-sentence walkthrough
```
Cipher: GSV EVIB URIHG NLNVMG RYVSVOW SRN, NB SVZIG DZH RIIVELXZYOB TLMV.
Plain:  The Very first moment I beheld him, my heart was irrevocably gone. (Jane Austen)
```
Step-by-step on the opening words:
- GSV → THE (G→T, S→H, V→E)
- EVIB → VERY (E→V, V→E, I→R, B→Y)
- URIHG → FIRST (U→F, R→I, I→R, H→S, G→T)
- NLNVMG → MOMENT (N→M, L→O, N→M, V→E, M→N, G→T)
Continue the same letter-by-letter mirroring for the rest; preserve punctuation and spacing.

## Recognizing Atbash Quickly
- GSV appears frequently if THE is present.  
- HVXZO -> SECDL? Not necessarily a tell by itself; however, common words like AND→ZMW, FOR→ULI, TO→GL, OF→LU are distinctive.
- Double letters remain double (e.g., SEE→HVV, LETTER→OVGGVI); no letter maps to itself under Latin A–Z Atbash.
- The mapping preserves letter distances from the ends; expect strong, rigid constraints compared to random substitutions.

Tell-tale pairs (common English words → Atbash)
- THE → GSV
- AND → ZMW
- OF  → LU
- TO  → GL
- IN  → RM
- IS  → RH
- IT  → RG
- YOU → BLF
- ARE → ZIV
- FOR → ULI
- NOT → MLG

## Strategy for Solving (When You Don’t Know It’s Atbash Yet)
1) Inspect for fixed, simple, reversible patterns: test whether substituting via Atbash table yields readable English.  
2) Try common cribs: Check if GSV occurs where THE would; try substituting a few words with the Atbash mapping.  
3) Validate across the whole text: The same mapping must work everywhere.  
4) Once confirmed, decrypt everything with the Atbash table.

Fallback: If Atbash fails, it might be a different monoalphabetic cipher (Random Aristocrat or K1/K2/K3). Switch to general substitution solving techniques.

## Properties and Math Notes
- Involution: f(f(x)) = x for all letters x.  
- Bijective mapping: one-to-one and onto (a permutation of letters).  
- Affine view over indices 0..25: Atbash can be written as x ↦ 25 - x (mod 26).  
- Frequency reflection: Letter frequencies are remapped; the frequency of E (high) transfers to V (its mirror), T to G, A to Z, etc.  
- Bigram/trigram structure: Because mapping is position-wise and deterministic, common patterns transform consistently (THE→GSV, AND→ZMW).  
- No self-maps in Latin A–Z: Each letter maps to a different one (contrast with ROT13 where no self-maps either, but different pairing).

## Common Mistakes
- Assuming a Caesar/Vigenère shift: Atbash is reflection, not rotation.  
- Expecting letters to map to themselves: Not in A–Z Atbash.  
- Altering digits/punctuation: Typically preserved as-is.  
- Forgetting it’s symmetric: The same mapping decrypts—no separate inverse table needed.

## Quick Reference
- Mapping rule: A↔Z, B↔Y, …, M↔N.  
- Formula: index(plain) = 25 - index(cipher) (same formula either direction).  
- Decrypt by applying the mapping once.  
- Great tell: THE ↔ GSV, AND ↔ ZMW, YOU ↔ BLF.

Minimal cheat table
```
A Z   B Y   C X   D W   E V   F U   G T
H S   I R   J Q   K P   L O   M N   (mirror)
```

## Practice Exercises (Decryption Only)
1) Decrypt the following using Atbash:
```
GSV XLWV GL GSV ZOO
```

2) Spot-the-Atbash: Which of these look like plausible Atbash of “KNOWLEDGE IS POWER”?
```
PMDLWVTV RH KLDVI   |   PMOWLVTW RH KLDVI   |   PMLDWVTV RH KLDVI
```
(Decrypt all three by Atbash and pick the correct plaintext.)

3) Longer practice (punctuation preserved):
```
GSV XZHGVI RH ZMW Z ORPV RH Z GSV RMG! GSV NRORXOFH ZMW GSV TIZGV R XZRH.
```

## Pseudocode (Reference)
```text
alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
mirror   = "ZYXWVUTSRQPONMLKJIHGFEDCBA"   // reversed alphabet

function atbashChar(ch):
  if 'A'<=ch<='Z': return mirror[ indexOf(ch in alphabet) ]
  if 'a'<=ch<='z':
    CH = toUpper(ch)
    MC = mirror[ indexOf(CH in alphabet) ]
    return toLower(MC)
  return ch  // digits/punct/spaces

function atbash(text):
  out = ""
  for ch in text: out += atbashChar(ch)
  return out
```

## Further Reading
- Classical ciphers overview (Atbash, ROT, Caesar, Affine).  
- Codebusters resources on simple substitution recognition.  
- Historical mentions of Atbash in Hebrew cryptographic contexts.

