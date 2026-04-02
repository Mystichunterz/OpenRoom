/**
 * Seed each APP's meta.yaml and guide.md into disk storage on initialization
 * So Agent can read them via file_read("apps/{appName}/meta.yaml")
 */

import * as idb from './diskStorage';
import { getSourceDirToAppName } from './appRegistry';
import { getSessionPath } from './sessionPath';

// Eager import — inlined as strings at build time
const metaFiles: Record<string, string> = import.meta.glob(
  [
    '../pages/*/meta/meta_en/meta.yaml',
    '../pages/*/meta/meta_en/guide.md',
    '../pages/*/*_en/meta.yaml',
    '../pages/*/*_en/guide.md',
  ],
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

const DIR_TO_APP_NAME = getSourceDirToAppName();

const SEEDED_SESSION_KEYS = new Set<string>();

function getSessionKey(): string {
  return getSessionPath() || '__default__';
}

export async function seedMetaFiles(options?: { force?: boolean }): Promise<void> {
  const sessionKey = getSessionKey();
  if (!options?.force && SEEDED_SESSION_KEYS.has(sessionKey)) return;

  const files: Array<{ path: string; name: string; content: string }> = [];

  for (const [filePath, content] of Object.entries(metaFiles)) {
    const dirMatch = filePath.match(/\.\.\/pages\/([^/]+)\//);
    if (!dirMatch) continue;
    const appName = DIR_TO_APP_NAME[dirMatch[1]] || dirMatch[1].toLowerCase();
    const fileName = filePath.split('/').pop() || '';
    if (!fileName) continue;
    files.push({ path: `apps/${appName}`, name: fileName, content });
  }

  if (files.length === 0) {
    SEEDED_SESSION_KEYS.add(sessionKey);
    return;
  }

  try {
    await idb.putTextFilesByJSON({ files });
    SEEDED_SESSION_KEYS.add(sessionKey);
    console.info(`[seedMeta] Seeded ${files.length} meta files to disk (session=${sessionKey})`);
  } catch (err) {
    SEEDED_SESSION_KEYS.delete(sessionKey);
    console.error(`[seedMeta] Failed to seed meta files (session=${sessionKey})`, err);
  }
}
