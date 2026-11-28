import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../src', import.meta.url));
const MODAL_PATH = join(SRC_DIR, 'components', 'Modals', 'LoginModal.tsx');

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx|js|jsx|html|md|json)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`✓ ${name}`);
  } else {
    failed++;
    console.error(`✗ ${name}`);
  }
}

console.log('=== Running Login Modal Branding Tests ===\n');

const sourceFiles = collectSourceFiles(SRC_DIR);
const firebasePhraseOffenders = sourceFiles.filter(file =>
  readFileSync(file, 'utf8').includes('Firebase Google Auth')
);
check(
  '"Firebase Google Auth" is absent from src/',
  firebasePhraseOffenders.length === 0
);

const modal = readFileSync(MODAL_PATH, 'utf8');

check(
  'primary Google label is mode-correct',
  modal.includes("const googleLabel = isSignUp ? 'Daftar dengan Google' : 'Masuk dengan Google';")
);
check(
  'secondary Google link is mode-correct',
  modal.includes("{isSignUp ? 'Daftar dengan Google' : 'Masuk dengan Google'}")
);
check('legacy Google label is removed', !modal.includes('Lanjut Masuk Cepat dengan Google'));
check('Firebase Google Auth sentence is removed', !modal.includes('Aman & terintegrasi langsung dengan Firebase Google Auth.'));
check('legacy emoji link label is removed', !modal.includes('👉'));

const lucideImport = modal.match(/import\s*\{[^}]*\}\s*from\s*'lucide-react'/)?.[0] ?? '';
check('lucide Chrome import is removed', !/\bChrome\b/.test(lucideImport));
check('Chrome icon usage is removed', !modal.includes('<Chrome'));

const googleColors = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];
check(
  'inline four-color Google SVG is present',
  modal.includes('viewBox="0 0 48 48"') &&
    googleColors.every(color => modal.includes(`fill="${color}"`))
);
check(
  'Google SVG is 20px and aria-hidden',
  modal.includes('aria-hidden="true"') && modal.includes('width="20"') && modal.includes('height="20"')
);

check('google-signin-btn id is preserved', modal.includes('id="google-signin-btn"'));
check('aria-label is wired to the mode label', modal.includes('aria-label={googleLabel}'));
check(
  'signInWithGoogle wiring is preserved in both controls',
  (modal.match(/await signInWithGoogle\(\)/g) ?? []).length === 2
);

check(
  'light Google button styling is applied',
  modal.includes('bg-[#F8FAFD]') &&
    modal.includes('border-[#DADCE0]') &&
    modal.includes('text-[#1F1F1F]') &&
    modal.includes('text-sm font-medium') &&
    modal.includes('hover:bg-[#F1F3F4]') &&
    modal.includes('focus-visible:ring-2') &&
    modal.includes('disabled:opacity-60')
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
