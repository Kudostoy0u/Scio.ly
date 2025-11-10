import os
import random
import string
import subprocess
import sys
from typing import List, Tuple

BASE = os.path.dirname(os.path.abspath(__file__))


def compile_java() -> None:
    src = os.path.join(BASE, 'Main.java')
    subprocess.run(['javac', src], check=True, cwd=BASE)


def run_java(stdin_data: str) -> str:
    proc = subprocess.run(['java', 'Main'], input=stdin_data.encode(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=BASE)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode())
    return proc.stdout.decode()


def op_valid(prev: str, nxt: str) -> bool:
    if len(prev) != len(nxt):
        return False
    if prev[0] != nxt[0]:
        return False
    for i in range(1, len(prev)):
        if nxt[i] != prev[i] and nxt[i] != prev[i - 1]:
            return False
    return True


def parse_and_validate_case(n: int, kmax: int, s: str, t: str, out_lines: List[str]) -> bool:
    # Returns True if output is valid; raises on hard parse errors
    if not out_lines:
        return False
    first = out_lines[0].strip()
    if first == '-1':
        # If solver says impossible, we accept here; other tests will probe minimality on small n
        return True
    try:
        k = int(first)
    except Exception:
        raise AssertionError(f"Expected integer k or -1, got: {first}")
    assert 0 <= k <= kmax, f"k out of bounds: {k} > {kmax}"
    assert len(out_lines[1:]) == k, f"Expected {k} lines of strings, got {len(out_lines[1:])}"
    cur = s
    for i, line in enumerate(out_lines[1:], 1):
        st = line.strip()
        assert len(st) == n, f"Step {i} length mismatch"
        assert op_valid(cur, st), f"Invalid operation at step {i}"
        cur = st
    assert cur == t, "Final string mismatch"
    return True


def bfs_min_steps(s: str, t: str, kmax: int) -> int:
    if s == t:
        return 0
    if s[0] != t[0]:
        return -1 if kmax >= 0 else -1
    n = len(s)
    from collections import deque
    q = deque([s])
    seen = {s}
    steps = 0
    while q and steps < kmax:
        steps += 1
        for _ in range(len(q)):
            cur = q.popleft()
            # generate all choices via bitmask for positions 1..n-1
            for mask in range(1 << (n - 1)):
                arr = list(cur)
                for i in range(1, n):
                    if (mask >> (i - 1)) & 1:
                        arr[i] = cur[i - 1]
                    else:
                        arr[i] = cur[i]
                nxt = ''.join(arr)
                if nxt not in seen:
                    if nxt == t:
                        return steps
                    seen.add(nxt)
                    q.append(nxt)
    return -1


def sample_io() -> Tuple[str, str]:
    sample_in = "\n".join([
        "7",
        "4 1",
        "abcd",
        "aabd",
        "2 2",
        "ab",
        "ab",
        "5 3",
        "abcde",
        "abbcc",
        "9 1",
        "egcnyeluw",
        "eegccyelw",
        "10 3",
        "vzvylxxmsy",
        "vvvvvllxxx",
        "4 6",
        "acba",
        "aaac",
        "5 7",
        "acabb",
        "aaaca",
    ]) + "\n"
    # we won't assert exact sample output, but validate format + correctness
    return sample_in, None


def random_case_small() -> Tuple[int, int, str, str]:
    n = random.randint(2, 6)
    s = ''.join(random.choice(string.ascii_lowercase[:3]) for _ in range(n))
    f = []
    prev = 1
    for i in range(1, n + 1):
        lo = prev
        hi = i
        j = random.randint(lo, hi)
        f.append(j)
        prev = j
    t = ''.join(s[j - 1] for j in f)
    kmin = max(i + 1 - f[i] for i in range(n))
    if random.random() < 0.3:
        # force impossible by breaking first char
        cands = [c for c in string.ascii_lowercase[:3] if c != s[0]]
        t = cands[0] + t[1:]
        kmax = random.randint(0, 6)
    else:
        kmax = random.randint(0, max(1, kmin + 2))
    return n, kmax, s, t


def random_case_large() -> Tuple[int, int, str, str]:
    n = random.randint(5, 200)
    s = ''.join(random.choice(string.ascii_lowercase[:4]) for _ in range(n))
    f = []
    prev = 1
    for i in range(1, n + 1):
        lo = prev
        hi = i
        j = random.randint(lo, hi)
        f.append(j)
        prev = j
    t = ''.join(s[j - 1] for j in f)
    kmin = max(i + 1 - f[i] for i in range(n))
    if random.random() < 0.5:
        kmax = kmin + random.randint(0, 3)
    else:
        kmax = max(0, kmin - random.randint(1, min(3, kmin)))
    return n, kmax, s, t


def build_input(cases: List[Tuple[int, int, str, str]]) -> str:
    parts = [str(len(cases))]
    for n, kmax, s, t in cases:
        parts.append(f"{n} {kmax}")
        parts.append(s)
        parts.append(t)
    return "\n".join(parts) + "\n"


def main() -> None:
    random.seed(0xC0FFEE)
    compile_java()

    # Run samples
    sin, _ = sample_io()
    sout = run_java(sin)
    # validate via format and semantics (not exact text)
    lines = sout.strip().splitlines()
    # Cannot reliably align lines-to-cases due to variable ks; instead, re-run case by case
    # We'll simply split input, run them individually, and check validity
    sample_cases: List[Tuple[int, int, str, str]] = []
    it = iter(sin.strip().splitlines())
    tcnt = int(next(it))
    for _ in range(tcnt):
        n, kmax = map(int, next(it).split())
        s = next(it).strip()
        t = next(it).strip()
        sample_cases.append((n, kmax, s, t))
    # run individually
    for n, kmax, s, t in sample_cases:
        case_in = build_input([(n, kmax, s, t)])
        case_out = run_java(case_in)
        ol = case_out.strip().splitlines()
        parse_and_validate_case(n, kmax, s, t, ol)

    # Random small with BFS minimality check
    for _ in range(50):
        n, kmax, s, t = random_case_small()
        inp = build_input([(n, kmax, s, t)])
        out = run_java(inp)
        ol = out.strip().splitlines()
        ok = parse_and_validate_case(n, kmax, s, t, ol)
        assert ok
        # BFS minimality when kmax small and n small
        kmin_bfs = bfs_min_steps(s, t, min(kmax, 7))
        if kmin_bfs != -1:
            if ol[0].strip() != '-1':
                k_reported = int(ol[0].strip())
                assert k_reported == kmin_bfs, f"Minimal k mismatch: reported={k_reported}, bfs={kmin_bfs}"
            else:
                # solver said -1 but bfs found reachable => error
                raise AssertionError("Solver reported -1 but BFS found a solution")

    # Random larger without BFS
    for _ in range(50):
        n, kmax, s, t = random_case_large()
        # ensure sum n*kmax is modest
        if n * max(1, kmax) > 20000:
            kmax = max(0, 20000 // n)
        inp = build_input([(n, kmax, s, t)])
        out = run_java(inp)
        ol = out.strip().splitlines()
        assert parse_and_validate_case(n, kmax, s, t, ol)

    print("All tests passed.")


if __name__ == '__main__':
    main()




