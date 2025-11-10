import java.io.*;
import java.util.*;

public class Main {
    private static final class FastScanner {
        private final InputStream in;
        private final byte[] buffer = new byte[1 << 16];
        private int ptr = 0, len = 0;
        FastScanner(InputStream is) { this.in = is; }
        private int read() throws IOException {
            if (ptr >= len) {
                len = in.read(buffer);
                ptr = 0;
                if (len <= 0) return -1;
            }
            return buffer[ptr++];
        }
        String next() throws IOException {
            StringBuilder sb = new StringBuilder();
            int c;
            while ((c = read()) <= ' ') {
                if (c == -1) return null;
            }
            do {
                sb.append((char)c);
                c = read();
            } while (c > ' ');
            return sb.toString();
        }
        int nextInt() throws IOException { return Integer.parseInt(next()); }
    }

    private static final class CharPositions {
        // positions for each character 'a'..'z' (1-indexed positions)
        final ArrayList<int[]> idxArrays; // store as primitive arrays for fast binary search
        final int[] sizes;
        CharPositions(char[] s) {
            ArrayList<ArrayList<Integer>> lists = new ArrayList<>(26);
            for (int i = 0; i < 26; i++) lists.add(new ArrayList<>());
            for (int i = 0; i < s.length; i++) {
                int c = s[i] - 'a';
                lists.get(c).add(i + 1); // 1-indexed
            }
            idxArrays = new ArrayList<>(26);
            sizes = new int[26];
            for (int i = 0; i < 26; i++) {
                ArrayList<Integer> L = lists.get(i);
                sizes[i] = L.size();
                int[] arr = new int[sizes[i]];
                for (int j = 0; j < sizes[i]; j++) arr[j] = L.get(j);
                idxArrays.add(arr);
            }
        }
        int firstAtLeast(int chIdx, int lowerBound) {
            int[] arr = idxArrays.get(chIdx);
            int lo = 0, hi = sizes[chIdx];
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (arr[mid] < lowerBound) lo = mid + 1; else hi = mid;
            }
            return lo < sizes[chIdx] ? arr[lo] : Integer.MAX_VALUE;
        }
    }

    private static int[] feasibleMappingForK(char[] s, char[] t, int k, CharPositions cp) {
        int n = s.length;
        if (s[0] != t[0]) return null; // position 1 never changes
        int[] f = new int[n];
        f[0] = 1;
        int prev = 1;
        for (int i = 1; i < n; i++) {
            int L = Math.max(prev, i + 1 - k);
            if (L < 1) L = 1;
            int ch = t[i] - 'a';
            int j = cp.firstAtLeast(ch, L);
            if (j == Integer.MAX_VALUE || j > i + 1) return null;
            f[i] = j;
            prev = j;
        }
        return f;
    }

    public static void main(String[] args) throws Exception {
        FastScanner fs = new FastScanner(System.in);
        String ts = fs.next();
        if (ts == null) return;
        int T = Integer.parseInt(ts);
        StringBuilder out = new StringBuilder();
        while (T-- > 0) {
            int n = fs.nextInt();
            int kmax = fs.nextInt();
            char[] s = fs.next().toCharArray();
            char[] t = fs.next().toCharArray();

            if (s.length != n || t.length != n) {
                out.append("-1\n");
                continue;
            }

            if (!Arrays.equals(s, t)) {
                if (s[0] != t[0]) {
                    out.append("-1\n");
                    continue;
                }
            }

            // quick zero-ops check
            if (Arrays.equals(s, t)) {
                out.append("0\n");
                continue;
            }

            CharPositions cp = new CharPositions(s);
            int lo = 0, hi = Math.min(kmax, n - 1), ans = -1;
            int[] bestF = null;
            while (lo <= hi) {
                int mid = (lo + hi) >>> 1;
                int[] f = feasibleMappingForK(s, t, mid, cp);
                if (f != null) {
                    ans = mid; bestF = f; hi = mid - 1;
                } else {
                    lo = mid + 1;
                }
            }

            if (ans == -1) {
                out.append("-1\n");
                continue;
            }

            // simulate steps using policy: at step r, copy at i if r <= d[i]
            int k = ans;
            out.append(k).append('\n');
            int nChars = n;
            int[] d = new int[nChars];
            for (int i = 0; i < nChars; i++) d[i] = (i + 1) - bestF[i];
            char[] cur = Arrays.copyOf(s, nChars);
            for (int r = 1; r <= k; r++) {
                char[] nxt = Arrays.copyOf(cur, nChars);
                nxt[0] = cur[0];
                for (int i = 1; i < nChars; i++) {
                    if (r <= d[i]) {
                        nxt[i] = cur[i - 1];
                    } else {
                        nxt[i] = cur[i];
                    }
                }
                out.append(nxt).append('\n');
                cur = nxt;
            }
        }
        System.out.print(out.toString());
    }
}



