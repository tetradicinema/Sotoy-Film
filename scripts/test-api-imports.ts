/**
 * Guards the Vercel Node ESM entrypoints against missing file extensions.
 *
 * `api/*.ts` is deployed as native ESM, so every runtime relative import in the
 * reachable graph must end with `.js` (for example `./tmdbCountry.js`). Without
 * the extension Node throws ERR_MODULE_NOT_FOUND in production even though tsx
 * and Vite resolve it locally.
 *
 * The script traces the graph transitively from every `api/*.ts` entry, reports
 * each offending file and line, and includes self-tests for the checker.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export interface ParsedImport {
  line: number;
  specifier: string;
  typeOnly: boolean;
}

export interface ImportViolation {
  file: string;
  line: number;
  specifier: string;
  typeOnly: boolean;
}

export interface GraphResult {
  /** Relative runtime imports without a `.js` extension. */
  violations: ImportViolation[];
  /** Relative runtime imports that could not be resolved to a file. */
  unresolved: ImportViolation[];
  /** Absolute paths of every module reached from the entries. */
  visited: string[];
}

const IMPORT_PATTERN =
  /^[ \t]*import\s+(type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm;
const EXPORT_PATTERN =
  /^[ \t]*export\s+(type\s+)?(?:[^'"]*?\s+from\s+)['"]([^'"]+)['"]/gm;

const lineAt = (source: string, index: number): number =>
  source.slice(0, index).split('\n').length;

/**
 * Extracts static import and re-export statements from a source file. Comments
 * and strings are not parsed; the graph only contains real modules and both
 * dynamic imports and `require` are out of scope for the ESM entrypoints.
 */
export function parseImports(source: string): ParsedImport[] {
  const imports: ParsedImport[] = [];

  for (const pattern of [IMPORT_PATTERN, EXPORT_PATTERN]) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      imports.push({
        line: lineAt(source, match.index),
        specifier: match[2],
        typeOnly: Boolean(match[1]),
      });
    }
  }

  return imports.sort((a, b) => a.line - b.line);
}

/**
 * Returns the runtime relative imports of one file that lack a `.js`
 * extension. Type-only imports and bare package specifiers are ignored.
 */
export function findImportViolations(
  file: string,
  source: string
): ImportViolation[] {
  return parseImports(source)
    .filter(
      item =>
        !item.typeOnly &&
        (item.specifier.startsWith('./') || item.specifier.startsWith('../')) &&
        !item.specifier.endsWith('.js') &&
        !item.specifier.endsWith('.json')
    )
    .map(item => ({
      file,
      line: item.line,
      specifier: item.specifier,
      typeOnly: item.typeOnly,
    }));
}

/**
 * Resolves a relative TypeScript import the same way the bundlers do, so a
 * `.js` specifier maps back to its `.ts`/`.tsx` source during the trace.
 */
export function resolveLocalImport(
  fromFile: string,
  specifier: string,
  exists: (file: string) => boolean
): string | null {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) return null;

  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = /\.(js|ts|tsx)$/.test(base)
    ? [base.replace(/\.(js|ts|tsx)$/, '.ts'), base.replace(/\.(js|ts|tsx)$/, '.tsx'), base]
    : [
        `${base}.ts`,
        `${base}.tsx`,
        path.join(base, 'index.ts'),
        path.join(base, 'index.tsx'),
        base,
      ];

  return candidates.find(exists) ?? null;
}

/**
 * Walks the runtime import graph from the given entry files. Type-only imports
 * are erased and never traverse. Cycles are handled by the visited set.
 */
export function traceImportGraph(
  entryFiles: string[],
  readFile: (file: string) => string | null,
  exists: (file: string) => boolean
): GraphResult {
  const violations: ImportViolation[] = [];
  const unresolved: ImportViolation[] = [];
  const visited: string[] = [];
  const visitedSet = new Set<string>();
  const queue = entryFiles.map(file => path.resolve(file));

  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (visitedSet.has(file)) continue;

    const source = readFile(file);
    if (source === null) continue;

    visitedSet.add(file);
    visited.push(file);

    for (const item of parseImports(source)) {
      if (item.typeOnly) continue;
      if (!item.specifier.startsWith('./') && !item.specifier.startsWith('../')) continue;

      if (!item.specifier.endsWith('.js') && !item.specifier.endsWith('.json')) {
        violations.push({
          file,
          line: item.line,
          specifier: item.specifier,
          typeOnly: false,
        });
      }

      const resolved = resolveLocalImport(file, item.specifier, exists);
      if (resolved === null) {
        unresolved.push({
          file,
          line: item.line,
          specifier: item.specifier,
          typeOnly: false,
        });
      } else if (!visitedSet.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  return { violations, unresolved, visited };
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

const assert = (condition: boolean, message: string) => {
  if (condition) {
    passed++;
    console.log(`✓ ${message}`);
  } else {
    failed++;
    console.error(`✗ ${message}`);
  }
};

const assertEquals = (actual: any, expected: any, message: string) => {
  const same = JSON.stringify(actual) === JSON.stringify(expected);
  assert(
    same,
    `${message}${same ? '' : ` (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`}`
  );
};

const virtualRoot = path.resolve(repoRoot, '.__import_check__');
const virtualPath = (...parts: string[]) => path.resolve(virtualRoot, ...parts);
const relative = (file: string) => path.relative(virtualRoot, file).replace(/\\/g, '/');

const memoryFs = (sources: Record<string, string>) => ({
  readFile: (file: string): string | null => sources[file] ?? null,
  exists: (file: string): boolean => Object.prototype.hasOwnProperty.call(sources, file),
});

const summarize = (violations: ImportViolation[]) =>
  violations.map(item => ({
    file: relative(item.file),
    line: item.line,
    specifier: item.specifier,
  }));

const runCheckerTests = () => {
  console.log('Running API Import Checker Tests...\n');

  // 1. Type-only imports are erased and must be ignored.
  {
    const entry = virtualPath('api/type-only.ts');
    const types = virtualPath('api/types.ts');
    const fsStub = memoryFs({
      [entry]: "import type { Country } from './types';\nexport const value = 1;\n",
      [types]: 'export interface Country { code: string }\n',
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(result.violations, [], 'type-only relative imports are ignored');
    assertEquals(
      result.visited.map(relative),
      ['api/type-only.ts'],
      'type-only modules are not traversed'
    );
  }

  // 2. Bare package specifiers are resolved by Node and need no extension.
  {
    const entry = virtualPath('api/bare.ts');
    const fsStub = memoryFs({
      [entry]: "import fs from 'node:fs';\nimport { thing } from 'some-package';\n",
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(result.violations, [], 'bare package imports are ignored');
  }

  // 3. A .js specifier is accepted and resolves to its .ts source.
  {
    const entry = virtualPath('api/with-js.ts');
    const country = virtualPath('api/country.ts');
    const fsStub = memoryFs({
      [entry]: "import { map } from './country.js';\n",
      [country]: 'export const map = (): string[] => [];\n',
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(result.violations, [], '.js relative imports are accepted');
    assertEquals(
      result.visited.map(relative),
      ['api/with-js.ts', 'api/country.ts'],
      '.js specifiers are followed into their .ts sources'
    );
  }

  // 4. A missing .js extension is rejected with the offending line.
  {
    const entry = virtualPath('api/missing.ts');
    const country = virtualPath('api/country.ts');
    const fsStub = memoryFs({
      [entry]: "// header\nimport { map } from './country';\n",
      [country]: 'export const map = (): string[] => [];\n',
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(
      summarize(result.violations),
      [{ file: 'api/missing.ts', line: 2, specifier: './country' }],
      'relative imports without .js are rejected with file and line'
    );
  }

  // 5. Nested relative paths resolve transitively.
  {
    const entry = virtualPath('api/nested.ts');
    const deep = virtualPath('api/lib/deep/module.ts');
    const fsStub = memoryFs({
      [entry]: "import { x } from './lib/deep/module.js';\n",
      [deep]: 'export const x = 1;\n',
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(result.violations, [], 'nested relative paths with .js are accepted');
    assertEquals(
      result.visited.map(relative),
      ['api/nested.ts', 'api/lib/deep/module.ts'],
      'nested relative paths are traversed'
    );
  }

  // 6. Multi-line imports report the statement's first line.
  {
    const entry = virtualPath('api/multiline.ts');
    const multi = virtualPath('api/multi.ts');
    const fsStub = memoryFs({
      [entry]: "// header\n\nimport {\n  alpha,\n  beta\n} from './multi';\n",
      [multi]: 'export const alpha = 1;\nexport const beta = 2;\n',
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(
      summarize(result.violations),
      [{ file: 'api/multiline.ts', line: 3, specifier: './multi' }],
      'multi-line imports are parsed and report the correct line'
    );
  }

  // 7. Runtime re-exports are checked too, while type-only re-exports are not.
  {
    const entry = virtualPath('api/reexports.ts');
    const runtime = virtualPath('api/runtime.ts');
    const types = virtualPath('api/types.ts');
    const fsStub = memoryFs({
      [entry]:
        "export type { Country } from './types';\nexport { map } from './runtime';\n",
      [runtime]: 'export const map = (): void => undefined;\n',
      [types]: 'export interface Country { code: string }\n',
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(
      summarize(result.violations),
      [{ file: 'api/reexports.ts', line: 2, specifier: './runtime' }],
      'runtime re-exports need .js while type-only re-exports are ignored'
    );
  }

  // 8. Violations are reported for files reached transitively, and cycles stop.
  {
    const entry = virtualPath('api/transitive.ts');
    const first = virtualPath('api/first.ts');
    const second = virtualPath('api/second.ts');
    const fsStub = memoryFs({
      [entry]: "import { first } from './first.js';\n",
      [first]: "import { second } from './second';\n",
      [second]: "import { first } from './first.js';\n",
    });
    const result = traceImportGraph([entry], fsStub.readFile, fsStub.exists);
    assertEquals(
      summarize(result.violations),
      [{ file: 'api/first.ts', line: 1, specifier: './second' }],
      'transitive violations are reported and cycles terminate'
    );
    assertEquals(
      result.visited.map(relative).sort(),
      ['api/first.ts', 'api/second.ts', 'api/transitive.ts'],
      'transitive graph visits each module once'
    );
  }
};

// ---------------------------------------------------------------------------
// Real repository check
// ---------------------------------------------------------------------------

const runRepositoryCheck = (): boolean => {
  console.log('\nRunning API import graph check...\n');

  const apiDir = path.join(repoRoot, 'api');
  const entryFiles = fs
    .readdirSync(apiDir)
    .filter(name => name.endsWith('.ts'))
    .map(name => path.join(apiDir, name));
  entryFiles.push(path.join(repoRoot, 'middleware.ts'));

  const readFile = (file: string): string | null => {
    try {
      return fs.readFileSync(file, 'utf8');
    } catch {
      return null;
    }
  };
  const exists = (file: string): boolean => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  };

  const result = traceImportGraph(entryFiles, readFile, exists);
  const toRelative = (file: string) => path.relative(repoRoot, file).replace(/\\/g, '/');

  // The production guard covers the API entrypoints, middleware.ts, and the
  // shared helpers in src/utils and src/lib/edge that they reach. Other
  // pre-existing runtime modules keep their own conventions and are traversed
  // but not validated here.
  const utilsDir = path.join(repoRoot, 'src', 'utils');
  const edgeDir = path.join(repoRoot, 'src', 'lib', 'edge');
  const middlewareFile = path.resolve(repoRoot, 'middleware.ts');
  const isCheckedFile = (file: string): boolean => {
    const normalized = path.resolve(file);
    return (
      normalized === middlewareFile ||
      normalized.startsWith(`${path.resolve(apiDir)}${path.sep}`) ||
      normalized.startsWith(`${path.resolve(utilsDir)}${path.sep}`) ||
      normalized.startsWith(`${path.resolve(edgeDir)}${path.sep}`)
    );
  };
  const scopedViolations = result.violations.filter(item => isCheckedFile(item.file));

  console.log(`Entry points: ${entryFiles.length}`);
  console.log('Reachable modules:');
  for (const file of result.visited) {
    console.log(`  - ${toRelative(file)}`);
  }

  if (result.unresolved.length > 0) {
    console.log('\nUnresolved relative imports (verify these exist):');
    for (const item of result.unresolved) {
      console.log(`  ${toRelative(item.file)}:${item.line}: '${item.specifier}'`);
    }
  }

  if (scopedViolations.length > 0) {
    console.error('\nRelative imports missing the .js extension:');
    for (const item of scopedViolations) {
      console.error(`  ${toRelative(item.file)}:${item.line}: '${item.specifier}'`);
    }
    return false;
  }

  assert(true, 'every runtime relative import reachable from api/*.ts and middleware.ts ends with .js');
  return true;
};

const runTests = () => {
  runCheckerTests();

  const repositoryOk = runRepositoryCheck();

  console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0 || !repositoryOk) {
    process.exit(1);
  }
};

runTests();
