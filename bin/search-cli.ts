#!/usr/bin/env bun
import { searchFile } from '../src/search';

function usage() {
  console.log('Usage: bun run bin/search-cli.ts -- <file> <keyword> [-i] [-r] [-c N] [-m N]');
}

const argv = process.argv.slice(2);
if (argv.length < 2) {
  usage();
  process.exit(2);
}

const filePath = argv[0];
const keyword = argv[1];
let regex = false;
let insensitive = false;
let context = 0;
let maxResults = 1000;

for (let i = 2; i < argv.length; i++) {
  const a = argv[i];
  if (a === '-r') regex = true;
  else if (a === '-i') insensitive = true;
  else if (a === '-c' && argv[i+1]) { context = Number(argv[++i]); }
  else if (a === '-m' && argv[i+1]) { maxResults = Number(argv[++i]); }
}

searchFile(filePath, keyword, { regex, insensitive, context, maxResults })
  .then(matches => {
    if (matches.length === 0) console.log('No matches found.');
    matches.forEach(m => console.log(`${m.line}: ${m.text}`));
  })
  .catch(err => { console.error('Error:', err); process.exit(1); });
#!/usr/bin/env bun
import { searchFile } from '../search';

declare const process: any;

type Opts = { regex?: boolean; insensitive?: boolean; context?: number; maxResults?: number };

function printUsage() {
  console.error('Usage: bun run bin/search-cli.ts <file> <keyword> [--regex] [--insensitive] [--context N] [--max N]');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) { printUsage(); process.exit(2); }
  const file = argv[0];
  const keyword = argv[1];
  const opts: Opts = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--regex' || a === '-r') opts.regex = true;
    else if (a === '--insensitive' || a === '-i') opts.insensitive = true;
    else if ((a === '--context' || a === '-c') && argv[i+1]) { opts.context = Number(argv[++i]); }
    else if ((a === '--max' || a === '-m') && argv[i+1]) { opts.maxResults = Number(argv[++i]); }
  }

  try {
    const matches = await searchFile(file, keyword, opts as any);
    if (matches.length === 0) {
      console.log('No matches found.');
      return;
    }
    for (const m of matches) {
      console.log(`${m.line}: ${m.text}`);
    }
  } catch (err: any) {
    console.error('Error:', err.message || String(err));
    process.exit(1);
  }
}

main();
