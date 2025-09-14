#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from root package.json
const rootPackageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const version = rootPackageJson.version;

// Update website/lib/version.ts
const versionFilePath = path.join(__dirname, '..', 'website', 'lib', 'version.ts');
const versionFileContent = `// Version is managed from the main package.json
// Update this when releasing new versions
export const PACKAGE_VERSION = '${version}'

export function getPackageVersion(): string {
  return PACKAGE_VERSION
}

export function getLatestVersion(): string {
  return PACKAGE_VERSION
}
`;

fs.writeFileSync(versionFilePath, versionFileContent);

console.log(`✅ Synced version ${version} to website/lib/version.ts`);