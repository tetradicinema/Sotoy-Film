import { parseEmbedUrl, getEmbedValidationFeedback, getEmbedIframe } from '../src/lib/embeds.js';

interface TestCase {
  name: string;
  input: string;
  expectedProvider: string | null;
  expectedId?: string;
  expectedKind?: string;
  shouldReject?: boolean;
}

const testCases: TestCase[] = [
  // 1. YouTube standard watch
  {
    name: 'YouTube standard watch URL',
    input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    expectedProvider: 'youtube',
    expectedId: 'dQw4w9WgXcQ',
    expectedKind: 'video',
  },
  // 2. YouTube with tracking params
  {
    name: 'YouTube with utm and feature params',
    input: 'https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share&utm_source=twitter',
    expectedProvider: 'youtube',
    expectedId: 'dQw4w9WgXcQ',
  },
  // 3. YouTube short link (youtu.be)
  {
    name: 'YouTube youtu.be short link',
    input: 'https://youtu.be/dQw4w9WgXcQ',
    expectedProvider: 'youtube',
    expectedId: 'dQw4w9WgXcQ',
  },
  // 4. YouTube mobile (m.youtube.com)
  {
    name: 'YouTube mobile host',
    input: 'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    expectedProvider: 'youtube',
    expectedId: 'dQw4w9WgXcQ',
  },
  // 5. YouTube Shorts
  {
    name: 'YouTube Shorts URL',
    input: 'https://www.youtube.com/shorts/abcdefghijk',
    expectedProvider: 'youtube',
    expectedId: 'abcdefghijk',
    expectedKind: 'shorts',
  },
  // 6. YouTube embed link
  {
    name: 'YouTube /embed/ URL',
    input: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    expectedProvider: 'youtube',
    expectedId: 'dQw4w9WgXcQ',
  },
  // 7. YouTube live link
  {
    name: 'YouTube /live/ URL',
    input: 'https://www.youtube.com/live/dQw4w9WgXcQ',
    expectedProvider: 'youtube',
    expectedId: 'dQw4w9WgXcQ',
  },
  // 8. Instagram standard post (/p/)
  {
    name: 'Instagram post standard',
    input: 'https://www.instagram.com/p/C6q0XYZ123/',
    expectedProvider: 'instagram',
    expectedId: 'C6q0XYZ123',
    expectedKind: 'post',
  },
  // 9. Instagram post without trailing slash & with query
  {
    name: 'Instagram post with query params',
    input: 'https://instagram.com/p/C6q0XYZ123?igsh=MXJqMTlh',
    expectedProvider: 'instagram',
    expectedId: 'C6q0XYZ123',
  },
  // 10. Instagram Reel (/reel/)
  {
    name: 'Instagram Reel URL',
    input: 'https://www.instagram.com/reel/C8qXYZreel/',
    expectedProvider: 'instagram',
    expectedId: 'C8qXYZreel',
    expectedKind: 'reel',
  },
  // 11. Instagram TV (/tv/)
  {
    name: 'Instagram TV URL',
    input: 'https://instagram.com/tv/B8qXYZtv999/',
    expectedProvider: 'instagram',
    expectedId: 'B8qXYZtv999',
  },
  // 12. X.com post / status
  {
    name: 'X.com status URL',
    input: 'https://x.com/sotoyfilm/status/1846574920192837465',
    expectedProvider: 'x',
    expectedId: '1846574920192837465',
  },
  // 13. Twitter.com status
  {
    name: 'Twitter.com status URL',
    input: 'https://twitter.com/elonmusk/status/1234567890123456789',
    expectedProvider: 'x',
    expectedId: '1234567890123456789',
  },
  // 14. Mobile Twitter / X
  {
    name: 'Mobile Twitter URL',
    input: 'https://mobile.twitter.com/sotoyfilm/status/9876543210987654321?s=20',
    expectedProvider: 'x',
    expectedId: '9876543210987654321',
  },
  // 15. TikTok standard video
  {
    name: 'TikTok standard video URL',
    input: 'https://www.tiktok.com/@cinema_enthusiast/video/7123456789012345678',
    expectedProvider: 'tiktok',
    expectedId: '7123456789012345678',
    expectedKind: 'video',
  },
  // 16. TikTok video without www
  {
    name: 'TikTok video without www and with tracking query',
    input: 'https://tiktok.com/@sotoy/video/7999888777666555444?is_from_webapp=1',
    expectedProvider: 'tiktok',
    expectedId: '7999888777666555444',
  },
  // 17. TikTok short link (vm.tiktok.com) - must be rejected with informative feedback
  {
    name: 'TikTok short link (vm.tiktok.com) rejected',
    input: 'https://vm.tiktok.com/ZM8xK1234/',
    expectedProvider: null,
    shouldReject: true,
  },
  // 18. TikTok short link (vt.tiktok.com)
  {
    name: 'TikTok short link (vt.tiktok.com) rejected',
    input: 'https://vt.tiktok.com/ZSef1234/',
    expectedProvider: null,
    shouldReject: true,
  },
  // 19. Threads post
  {
    name: 'Threads standard post URL',
    input: 'https://www.threads.net/@sotoyfilm/post/DA123456789',
    expectedProvider: 'threads',
    expectedId: 'DA123456789',
    expectedKind: 'post',
  },
  // 20. Threads without www
  {
    name: 'Threads post without www',
    input: 'https://threads.net/@filmmaker/post/CZ998877665?xmt=AQGz',
    expectedProvider: 'threads',
    expectedId: 'CZ998877665',
  },
  // 21. Lookalike domain (youtube.com.evil.io) - ATTACK
  {
    name: 'Attack: Lookalike sub-domain youtube.com.evil.io',
    input: 'https://youtube.com.evil.io/watch?v=dQw4w9WgXcQ',
    expectedProvider: null,
    shouldReject: true,
  },
  // 22. Open redirect phishing (evil.io/?u=youtube.com/watch?v=x) - ATTACK
  {
    name: 'Attack: Open redirect parameter',
    input: 'https://evil.io/?u=https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    expectedProvider: null,
    shouldReject: true,
  },
  // 23. Insecure / dangerous protocol javascript: - ATTACK
  {
    name: 'Attack: javascript: URI',
    input: 'javascript:alert(document.cookie)',
    expectedProvider: null,
    shouldReject: true,
  },
  // 24. Dangerous protocol data: - ATTACK
  {
    name: 'Attack: data:text/html URI',
    input: 'data:text/html,<script>alert(1)</script>',
    expectedProvider: null,
    shouldReject: true,
  },
  // 25. Credentials in authority user:pass@ - ATTACK
  {
    name: 'Attack: Credentials embedded in URL',
    input: 'https://admin:secret@www.youtube.com/watch?v=dQw4w9WgXcQ',
    expectedProvider: null,
    shouldReject: true,
  },
  // 26. Unsupported normal website (e.g. IMDb or Wikipedia)
  {
    name: 'Unsupported domain (IMDb)',
    input: 'https://www.imdb.com/title/tt0903747/',
    expectedProvider: null,
    shouldReject: true,
  },
  // 27. Bare domain input (auto-upgraded to https://)
  {
    name: 'Bare domain youtube input',
    input: 'youtube.com/watch?v=dQw4w9WgXcQ',
    expectedProvider: 'youtube',
    expectedId: 'dQw4w9WgXcQ',
  },
  // 28. Empty / whitespace string
  {
    name: 'Empty string input',
    input: '   ',
    expectedProvider: null,
    shouldReject: true,
  },
];

console.log('============================================================');
console.log('🧪 Sotoy Film - Social Media Embed Parser Unit Test Suite');
console.log('============================================================');

let passed = 0;
let failed = 0;

testCases.forEach((tc, idx) => {
  const result = parseEmbedUrl(tc.input);

  let ok = true;
  if (tc.expectedProvider === null) {
    if (result !== null) {
      ok = false;
      console.error(`❌ [${idx + 1}/${testCases.length}] ${tc.name}: Expected rejection, but got`, result);
    }
  } else {
    if (!result) {
      ok = false;
      console.error(`❌ [${idx + 1}/${testCases.length}] ${tc.name}: Expected parse result, but got null for ${tc.input}`);
    } else if (result.provider !== tc.expectedProvider) {
      ok = false;
      console.error(`❌ [${idx + 1}/${testCases.length}] ${tc.name}: Expected provider "${tc.expectedProvider}", got "${result.provider}"`);
    } else if (tc.expectedId && result.id !== tc.expectedId) {
      ok = false;
      console.error(`❌ [${idx + 1}/${testCases.length}] ${tc.name}: Expected ID "${tc.expectedId}", got "${result.id}"`);
    } else if (tc.expectedKind && result.kind !== tc.expectedKind) {
      ok = false;
      console.error(`❌ [${idx + 1}/${testCases.length}] ${tc.name}: Expected kind "${tc.expectedKind}", got "${result.kind}"`);
    }
  }

  // Also check validation feedback function
  const feedback = getEmbedValidationFeedback(tc.input);
  if (tc.shouldReject && feedback.valid) {
    ok = false;
    console.error(`❌ [${idx + 1}/${testCases.length}] ${tc.name}: getEmbedValidationFeedback should have returned valid: false`);
  } else if (!tc.shouldReject && !feedback.valid) {
    ok = false;
    console.error(`❌ [${idx + 1}/${testCases.length}] ${tc.name}: getEmbedValidationFeedback should have returned valid: true, error: ${feedback.error}`);
  }

  if (ok) {
    passed++;
    console.log(`✅ [${idx + 1}/${testCases.length}] ${tc.name}`);
  } else {
    failed++;
  }
});

console.log('============================================================');
console.log(`📊 Summary: ${passed} Passed, ${failed} Failed out of ${testCases.length} tests`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
