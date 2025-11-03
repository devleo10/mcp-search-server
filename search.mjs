import { readFile } from 'fs/promises';

/**
 * Search a file for a keyword.
 * @param {string} filePath
 * @param {string} keyword
 * @param {{regex?: boolean, insensitive?: boolean, context?: number, maxResults?: number}} options
 * @returns {Promise<Array<{line:number,text:string}>>}
 */
export async function searchFile(filePath, keyword, options = {}) {
  if (!filePath || !keyword) throw new Error('filePath and keyword required');
  const { regex = false, insensitive = false, context = 0, maxResults = 1000 } = options;

  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const matches = [];

  let re;
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
