import fs from 'fs';
import path from 'path';

/**
 * Recursively remove a folder and its contents.
 * Best-effort cleanup - won't throw errors if removal fails.
 */
export const safeRemoveFolder = (folderPath: string): void => {
  try {
    if (!fs.existsSync(folderPath)) return;
    for (const entry of fs.readdirSync(folderPath)) {
      const p = path.join(folderPath, entry);
      const s = fs.statSync(p);
      if (s.isDirectory()) safeRemoveFolder(p);
      else fs.unlinkSync(p);
    }
    fs.rmdirSync(folderPath);
  } catch (err) {
    // Best-effort cleanup
  }
};