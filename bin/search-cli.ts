import { searchFile } from '../src/search';

function printUsage() {
  console.error('Usage: bun run bin/search-cli.ts -- <file> <keyword> [--regex|-r] [--insensitive|-i] [--context N|-c N] [--max N|-m N]');
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2) { printUsage(); process.exit(2); }
  const file = argv[0];
  const keyword = argv[1];
  const opts: { regex?: boolean; insensitive?: boolean; context?: number; maxResults?: number } = {};

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--regex' || a === '-r') opts.regex = true;
    else if (a === '--insensitive' || a === '-i') opts.insensitive = true;
    else if ((a === '--context' || a === '-c') && argv[i+1]) { opts.context = Number(argv[++i]); }
    else if ((a === '--max' || a === '-m') && argv[i+1]) { opts.maxResults = Number(argv[++i]); }
  }

  try {
    const matches = await searchFile(file, keyword, opts as any);
    if (!matches || matches.length === 0) {
      console.log('No matches found.');
      return;
    }
    for (const m of matches) console.log(`${m.line}: ${m.text}`);
  } catch (err: any) {
    console.error('Error:', err?.message ?? String(err));
    process.exit(1);
  }
}

main();
