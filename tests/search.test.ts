import { test, expect } from 'bun:test';
import { writeFile, unlink } from 'fs/promises';
import { searchFile } from '../src/search';

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
  expect(res[0].line).toBe(2);
  expect(res[0].text).toBe('this line has keyword');
  expect(res[1].line).toBe(3);
  await unlink(tmp);
});

test('searchFile respects case-insensitive option', async () => {
  const tmp = 'tests_tmp_case.txt';
  const content = [
    'Hello World',
    'hello world',
    'HELLO WORLD',
    'no match'
  ].join('\n');
  await writeFile(tmp, content, 'utf8');
  const res = await searchFile(tmp, 'hello', { insensitive: true, regex: false });
  expect(res.length).toBe(3);
  await unlink(tmp);
});

test('searchFile respects case-sensitive option', async () => {
  const tmp = 'tests_tmp_case2.txt';
  const content = [
    'Hello World',
    'hello world',
    'HELLO WORLD'
  ].join('\n');
  await writeFile(tmp, content, 'utf8');
  const res = await searchFile(tmp, 'hello', { insensitive: false, regex: false });
  expect(res.length).toBe(1);
  expect(res[0].text).toBe('hello world');
  await unlink(tmp);
});

test('searchFile supports regex patterns', async () => {
  const tmp = 'tests_tmp_regex.txt';
  const content = [
    'hello123',
    'hello456',
    'hello789',
    'helloabc'
  ].join('\n');
  await writeFile(tmp, content, 'utf8');
  const res = await searchFile(tmp, 'hello\\d+', { regex: true, insensitive: false });
  expect(res.length).toBe(3);
  await unlink(tmp);
});

test('searchFile includes context lines', async () => {
  const tmp = 'tests_tmp_context.txt';
  const content = [
    'line 1',
    'line 2',
    'line 3',
    'line 4 keyword',
    'line 5',
    'line 6',
    'line 7'
  ].join('\n');
  await writeFile(tmp, content, 'utf8');
  const res = await searchFile(tmp, 'keyword', { context: 2, insensitive: false });
  expect(res.length).toBe(1);
  expect(res[0].pre).toEqual(['line 2', 'line 3']);
  expect(res[0].post).toEqual(['line 5', 'line 6']);
  await unlink(tmp);
});

test('searchFile returns empty array when no matches found', async () => {
  const tmp = 'tests_tmp_nomatch.txt';
  const content = [
    'line 1',
    'line 2',
    'line 3'
  ].join('\n');
  await writeFile(tmp, content, 'utf8');
  const res = await searchFile(tmp, 'nonexistent', { insensitive: false });
  expect(res.length).toBe(0);
  expect(Array.isArray(res)).toBe(true);
  await unlink(tmp);
});

test('searchFile handles empty file', async () => {
  const tmp = 'tests_tmp_empty.txt';
  await writeFile(tmp, '', 'utf8');
  const res = await searchFile(tmp, 'keyword', {});
  expect(res.length).toBe(0);
  await unlink(tmp);
});

test('searchFile respects maxResults limit', async () => {
  const tmp = 'tests_tmp_max.txt';
  const content = Array.from({ length: 100 }, (_, i) => `line ${i} keyword`).join('\n');
  await writeFile(tmp, content, 'utf8');
  const res = await searchFile(tmp, 'keyword', { maxResults: 10 });
  expect(res.length).toBe(10);
  await unlink(tmp);
});

test('searchFile handles large files efficiently', async () => {
  const tmp = 'tests_tmp_large.txt';
  // Create a file with 10000 lines, matching every 10th line
  const lines = Array.from({ length: 10000 }, (_, i) => 
    i % 10 === 0 ? `line ${i} keyword` : `line ${i}`
  );
  await writeFile(tmp, lines.join('\n'), 'utf8');
  const res = await searchFile(tmp, 'keyword', { maxResults: 100 });
  expect(res.length).toBe(100);
  await unlink(tmp);
});

test('searchFile throws error for invalid regex pattern', async () => {
  const tmp = 'tests_tmp_badregex.txt';
  await writeFile(tmp, 'test content', 'utf8');
  await expect(searchFile(tmp, '[invalid', { regex: true })).rejects.toThrow();
  await unlink(tmp);
});

test('searchFile throws error for missing file path', async () => {
  await expect(searchFile('', 'keyword')).rejects.toThrow();
});

test('searchFile throws error for missing keyword', async () => {
  const tmp = 'tests_tmp_nokeyword.txt';
  await writeFile(tmp, 'test', 'utf8');
  await expect(searchFile(tmp, '')).rejects.toThrow();
  await unlink(tmp);
});
