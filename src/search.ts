import { createReadStream, statSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve, normalize } from 'path';

export type SearchOptions = {
  regex?: boolean;
  insensitive?: boolean;
  context?: number;
  maxResults?: number;
  maxFileSize?: number; // Max file size in bytes (default: 100MB)
  workspaceRoot?: string; // Root directory for path validation
};

export type Match = {
  line: number;
  text: string;
  pre?: string[];
  post?: string[];
};

// Constants
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const STREAM_THRESHOLD = 10 * 1024 * 1024; // 10MB - use streaming above this
const MAX_CONTEXT_LINES = 100; // Limit context lines for memory efficiency

/**
 * Check if file appears to be binary by sampling first 512 bytes
 */
async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    const buffer = await readFile(filePath, { encoding: null });
    const sample = buffer.slice(0, 512);
    // Check for null bytes or high percentage of non-text characters
    const nullBytes = sample.filter(b => b === 0).length;
    if (nullBytes > 0) return true;
    
    // Check if more than 30% are non-printable ASCII (excluding newlines, tabs, etc.)
    const nonPrintable = sample.filter(b => b < 32 && b !== 9 && b !== 10 && b !== 13).length;
    return nonPrintable / sample.length > 0.3;
  } catch {
    return false; // If we can't read, assume text for now
  }
}

/**
 * Validate and normalize file path for security
 */
function validatePath(filePath: string, workspaceRoot?: string): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path');
  }

  // Resolve to absolute path
  const resolvedPath = resolve(normalize(filePath));

  // If workspace root is specified, ensure path is within it
  if (workspaceRoot) {
    const rootPath = resolve(normalize(workspaceRoot));
    if (!resolvedPath.startsWith(rootPath)) {
      throw new Error(`Access denied: Path must be within workspace root`);
    }
  }

  // Check for path traversal attempts
  if (filePath.includes('..') && !resolvedPath.includes('..')) {
    // This is okay, but log suspicious patterns
  }

  return resolvedPath;
}

/**
 * Search file using streaming (for large files)
 * Uses a sliding window approach for memory efficiency
 */
async function searchFileStreaming(
  filePath: string,
  keyword: string,
  regex: RegExp,
  options: SearchOptions
): Promise<Match[]> {
  const { context = 0, maxResults = 1000 } = options;
  const limitedContext = Math.min(context, MAX_CONTEXT_LINES);
  
  const matches: Match[] = [];
  const lineBuffer: string[] = []; // Sliding window buffer
  const matchData: Array<{ bufferIdx: number; lineNumber: number }> = []; // Track match positions and line numbers
  
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
    let lineNumber = 0;
    let remaining = '';
    let matchCount = 0;
    const bufferSize = limitedContext > 0 ? limitedContext * 2 + 1 : 1000;

    stream.on('data', (chunk: string | Buffer) => {
      const data = remaining + (typeof chunk === 'string' ? chunk : chunk.toString('utf8'));
      const lineEndings = data.split(/\r?\n/);
      remaining = lineEndings.pop() || '';

      for (const line of lineEndings) {
        lineNumber++;
        lineBuffer.push(line);

        // Keep buffer size manageable
        if (lineBuffer.length > bufferSize) {
          // Process matches before removing old lines
          while (matchData.length > 0 && matchData[0].bufferIdx < lineBuffer.length - bufferSize) {
            const match = matchData.shift()!;
            const actualIdx = match.bufferIdx - (lineBuffer.length - bufferSize);
            const matchLine = lineBuffer[actualIdx];
            
            const pre: string[] = [];
            const startIdx = Math.max(0, actualIdx - limitedContext);
            for (let i = startIdx; i < actualIdx; i++) {
              pre.push(lineBuffer[i]);
            }
            
            matches.push({
              line: match.lineNumber,
              text: matchLine,
              pre: pre.length > 0 ? pre : undefined,
              post: undefined // Post context not available in streaming mode
            });
          }
          
          // Remove old lines
          const removeCount = lineBuffer.length - bufferSize;
          lineBuffer.splice(0, removeCount);
          // Adjust match indices
          for (let i = 0; i < matchData.length; i++) {
            matchData[i].bufferIdx -= removeCount;
          }
        }

        if (regex.test(line)) {
          matchCount++;
          matchData.push({ bufferIdx: lineBuffer.length - 1, lineNumber });

          if (matchCount >= maxResults) {
            stream.destroy();
            // Process remaining matches
            for (const match of matchData) {
              const pre: string[] = [];
              const startIdx = Math.max(0, match.bufferIdx - limitedContext);
              for (let i = startIdx; i < match.bufferIdx; i++) {
                pre.push(lineBuffer[i]);
              }
              matches.push({
                line: match.lineNumber,
                text: lineBuffer[match.bufferIdx],
                pre: pre.length > 0 ? pre : undefined,
                post: undefined
              });
            }
            resolve(matches);
            return;
          }
        }
      }
    });

    stream.on('end', () => {
      if (remaining) {
        lineNumber++;
        lineBuffer.push(remaining);
        if (regex.test(remaining)) {
          matchData.push({ bufferIdx: lineBuffer.length - 1, lineNumber });
        }
      }
      
      // Process all remaining matches
      for (const match of matchData) {
        const pre: string[] = [];
        const startIdx = Math.max(0, match.bufferIdx - limitedContext);
        for (let i = startIdx; i < match.bufferIdx; i++) {
          pre.push(lineBuffer[i]);
        }
        
        const post: string[] = [];
        const endIdx = Math.min(lineBuffer.length - 1, match.bufferIdx + limitedContext);
        for (let i = match.bufferIdx + 1; i <= endIdx; i++) {
          post.push(lineBuffer[i]);
        }
        
        matches.push({
          line: match.lineNumber,
          text: lineBuffer[match.bufferIdx],
          pre: pre.length > 0 ? pre : undefined,
          post: post.length > 0 ? post : undefined
        });
      }
      
      resolve(matches);
    });

    stream.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Search file using in-memory approach (for smaller files)
 */
async function searchFileInMemory(
  filePath: string,
  keyword: string,
  regex: RegExp,
  options: SearchOptions
): Promise<Match[]> {
  const { context = 0, maxResults = 1000 } = options;
  const limitedContext = Math.min(context, MAX_CONTEXT_LINES);
  
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const matches: Match[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      const pre: string[] = [];
      const post: string[] = [];
      
      for (let p = Math.max(0, i - limitedContext); p < i; p++) {
        pre.push(lines[p]);
      }
      
      for (let q = i + 1; q <= Math.min(lines.length - 1, i + limitedContext); q++) {
        post.push(lines[q]);
      }
      
      matches.push({
        line: i + 1,
        text: lines[i],
        pre: pre.length > 0 ? pre : undefined,
        post: post.length > 0 ? post : undefined
      });
      
      if (matches.length >= maxResults) break;
    }
  }

  return matches;
}

/**
 * Search a file for a keyword or regular expression.
 * Automatically uses streaming for large files and in-memory for smaller files.
 */
export async function searchFile(
  filePath: string,
  keyword: string,
  options: SearchOptions = {}
): Promise<Match[]> {
  // Input validation
  if (!filePath || !keyword) {
    throw new Error('filePath and keyword required');
  }

  if (typeof keyword !== 'string' || keyword.length === 0) {
    throw new Error('keyword must be a non-empty string');
  }

  const {
    regex = false,
    insensitive = false,
    context = 0,
    maxResults = 1000,
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    workspaceRoot = process.cwd()
  } = options;

  // Validate and normalize path
  const normalizedPath = validatePath(filePath, workspaceRoot);

  // Check file existence and size
  let stats;
  try {
    stats = statSync(normalizedPath);
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      } else if (nodeErr.code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      }
    }
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Cannot access file: ${errorMessage}`);
  }

  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${filePath}`);
  }

  if (stats.size > maxFileSize) {
    throw new Error(`File too large: ${stats.size} bytes (max: ${maxFileSize} bytes)`);
  }

  // Check for binary files
  if (await isBinaryFile(normalizedPath)) {
    throw new Error(`Cannot search binary file: ${filePath}`);
  }

  // Build regex pattern
  let re: RegExp;
  if (regex) {
    try {
      re = new RegExp(keyword, insensitive ? 'i' : undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid regex pattern: ${errorMessage}`);
    }
  } else {
    const esc = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(esc, insensitive ? 'i' : undefined);
  }

  // Choose strategy based on file size
  if (stats.size > STREAM_THRESHOLD) {
    return searchFileStreaming(normalizedPath, keyword, re, { ...options, context, maxResults });
  } else {
    return searchFileInMemory(normalizedPath, keyword, re, { ...options, context, maxResults });
  }
}
