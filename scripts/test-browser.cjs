'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const files = [
  'browser-check', 'reload-check', 'revisit-check', 'navigation-check',
  'video-start-check', 'multi-quality-check', 'consensus-queue-check',
  'task-metadata', 'course-history', 'ocs-adapters', 'hardening', 'discussion', 'brand-preview'
];
for (const name of files) {
  const result = spawnSync(process.execPath, [path.join('tests', name + '.cjs')], {
    cwd: path.resolve(__dirname, '..'), stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
