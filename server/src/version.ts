import { createRequire } from 'node:module';
const version=createRequire(import.meta.url)('../package.json').version;
export const SERVER_VERSION=typeof version==='string'&&/^\d+\.\d+\.\d+$/.test(version)?version:'development';
