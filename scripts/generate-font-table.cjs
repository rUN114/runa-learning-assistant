'use strict';
// Independently generate hashes from an OFL font, never from a vendor lookup table.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const input = process.argv[2];
if (!input) throw new Error('用法：node scripts/generate-font-table.cjs <SourceHanSansSC-Normal.otf>');
const root = path.resolve(__dirname, '..');
const bytes = fs.readFileSync(input);
const context = vm.createContext({ TextDecoder, TextEncoder, Uint8Array, ArrayBuffer });
vm.runInContext(fs.readFileSync(path.join(root, 'outputs/DeepSeek-右侧栏版/lib/TyprMd5.js'), 'utf8'), context);
context.bytes = new Uint8Array(bytes).buffer;
const table = vm.runInContext(`(() => {
  const font = Typr.parse(bytes)[0], table = {}, ambiguous = new Set();
  for (let code = 19968; code < 40870; code++) {
    const glyph = Typr.U.codeToGlyph(font, code);
    if (!glyph) continue;
    const hash = md5(JSON.stringify(Typr.U.glyphToPath(font, glyph))).slice(24);
    if (table[hash] && table[hash] !== code) ambiguous.add(hash);
    else table[hash] = code;
  }
  for (const hash of ambiguous) delete table[hash];
  return table;
})()`, context);
const digest = crypto.createHash('sha256').update(bytes).digest('hex');
const header = '// Generated from Adobe Source Han Sans SC Normal (SIL OFL 1.1).\n'
  + '// Font SHA256: ' + digest + '\n'
  + '// See SourceHanSans-LICENSE.txt and THIRD_PARTY_NOTICES.md.\n';
fs.writeFileSync(path.join(root, 'outputs/DeepSeek-右侧栏版/lib/font-table.js'), header + 'const LOCAL_FONT_TABLE=' + JSON.stringify(table) + ';\n');
console.log('Generated', Object.keys(table).length, 'unambiguous glyph hashes; font SHA256', digest);
