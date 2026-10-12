const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);
const files = fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts'));
for (const name of files) {
  const output = path.join(root, 'outputs/DeepSeek-右侧栏版', name.replace(/\.ts$/, '.js'));
  const text = fs.readFileSync(output, 'utf8');
  fs.writeFileSync(output, '// 由 src/' + name + ' 构建。请修改 TypeScript 源文件后运行 npm run build。\n' + text, 'utf8');
}
console.log('PASS: TypeScript 构建，' + files.length + ' 个脚本。');
const manifestPath = path.join(root, 'outputs/DeepSeek-右侧栏版/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
manifest.version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
