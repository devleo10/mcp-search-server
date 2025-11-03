import { readFile } from 'fs/promises';

export type SearchOptions = {
  regex?: boolean;
  insensitive?: boolean;
  context?: number;
  maxResults?: number;
};

export type Match = { line: number; text: string };

/**
 * Search a file for a keyword or regular expression.
 */
export async function searchFile(filePath: string, keyword: string, options: SearchOptions = {}): Promise<Match[]> {
  if (!filePath || !keyword) throw new Error('filePath and keyword required');
  const { regex = false, insensitive = false, context = 0, maxResults = 1000 } = options;

  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const matches: Match[] = [];

  let re: RegExp;
  if (regex) {
    re = new RegExp(keyword, insensitive ? 'i' : undefined);
  } else {
    const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(esc, insensitive ? 'i' : undefined);
  }

  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) {
      matches.push({ line: i + 1, text: lines[i] });
      if (matches.length >= maxResults) break;
    }
  }

  return matches;
}
