import { test, expect } from 'bun:test';
import { writeFile, unlink } from 'fs/promises';
import { searchFile } from '../search';

test('searchFile finds matches and respects options', async () => {
  const tmp = 'tests_tmp.txt';
  const content = [
    'hello world',
    'this line has keyword',
    'another keyword here',
    'no match here'
  ].join('\n');
  await writeFile(tmp, content, 'utf8');
  const res = await searchFile(tmp, 'keyword', { insensitive: false, regex: false });
  expect(res.length).toBe(2);
  await unlink(tmp);
});
