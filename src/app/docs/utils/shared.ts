import { slugifyText } from '@/lib/utils/markdown';

export function eventSlug(name: string): string {
  return slugifyText(name);
}

export function wikiUrl(name: string): string {
  const map: Record<string, string> = {
    'Write It Do It': 'Write_It,_Do_It',
  };
  const title = map[name] ?? name.replace(/ /g, '_');
  return `https://scioly.org/wiki/index.php/${title}`;
}


