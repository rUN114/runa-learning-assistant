'use strict';
const fs = require('node:fs');
const path = require('node:path');
fs.mkdirSync(path.resolve('work/sidebar-qa'), { recursive: true });
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const executablePath = process.env.EDGE_EXECUTABLE || (process.platform === 'win32'
  ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
  : process.platform === 'darwin'
    ? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    : '/usr/bin/microsoft-edge');
if (!fs.existsSync(executablePath)) throw new Error('找不到 Edge，请通过 EDGE_EXECUTABLE 指定浏览器路径。');
module.exports = { chromium, executablePath };
