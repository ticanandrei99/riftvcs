#!/usr/bin/env node
/** Validate every version file first; update client/native metadata together. */
import { readFileSync, writeFileSync } from 'node:fs';
const arg = (flag, fallback) => { const i = process.argv.indexOf(flag); return i < 0 ? fallback : process.argv[i+1]; };
const kind = arg('--type', 'patch');
if (!['patch','minor','major'].includes(kind)) throw Error('Version type must be patch, minor or major');
const toml = readFileSync('src-tauri/Cargo.toml','utf8');
const nativeLock = readFileSync('src-tauri/Cargo.lock','utf8');
const pkg = JSON.parse(readFileSync('package.json','utf8'));
const npmLock = JSON.parse(readFileSync('package-lock.json','utf8'));
const changelog = readFileSync('CHANGELOG.md','utf8');
const current = toml.match(/^version\s*=\s*"(\d+\.\d+\.\d+)"/m)?.[1];
const nativeEntry = /(name = "riftvoice"\r?\nversion = )"(\d+\.\d+\.\d+)"/;
if (!current || pkg.version !== current || npmLock.packages?.['']?.version !== current || nativeLock.match(nativeEntry)?.[2] !== current) throw Error('Version metadata does not agree; no files changed');
let [major, minor, patch] = current.split('.').map(Number);
if (kind === 'major') {major++;minor=patch=0;} else if (kind === 'minor') {minor++;patch=0;} else patch++;
const next = `${major}.${minor}.${patch}`;
const date = arg('--date', new Date().toISOString().slice(0,10));
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error('Invalid date');
const body = arg('--changelog','### Changed\n- Describe this release.').replace(/\\n/g,'\n');
pkg.version = next; npmLock.version = next; npmLock.packages[''].version = next;
const section = `## [v${next}] — ${date}\n\n${body}\n`;
const changedLog = /## \[Unreleased\][^\r\n]*\r?\n/.test(changelog) ? changelog.replace(/(## \[Unreleased\][^\r\n]*\r?\n)/,`$1\n${section}`) : section+'\n'+changelog;
const files = {
  'src-tauri/Cargo.toml':toml.replace(/^version\s*=\s*"\d+\.\d+\.\d+"/m,`version = "${next}"`),
  'src-tauri/Cargo.lock':nativeLock.replace(nativeEntry,`$1"${next}"`),
  'package.json':JSON.stringify(pkg,null,2)+'\n',
  'package-lock.json':JSON.stringify(npmLock,null,2)+'\n',
  'CHANGELOG.md':changedLog+`\n[v${next}]: https://github.com/ticanandrei99/riftvcs/releases/tag/v${next}\n`,
};
if (!process.argv.includes('--dry-run')) for(const [path,content] of Object.entries(files)) writeFileSync(path,content);
console.log(next);
