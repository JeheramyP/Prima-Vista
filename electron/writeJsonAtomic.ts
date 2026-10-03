import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

/** Removes temp files left behind when a previous save crashed before rename. */
async function discardAbandonedTemps(file: string) {
  const directory = path.dirname(file);
  const prefix = `.${path.basename(file)}.`;
  const names = await fs.readdir(directory);
  await Promise.all(
    names
      .filter((name) => name.startsWith(prefix) && name.endsWith(".tmp"))
      .map((name) => fs.unlink(path.join(directory, name)).catch(() => undefined)),
  );
}

/**
 * Replaces `file` by writing a sibling temp file, flushing it, then renaming.
 * A crash or a failed write leaves the previous file untouched.
 */
export async function writeJsonAtomic(file: string, value: unknown): Promise<void> {
  const contents = JSON.stringify(value, null, 2);
  const directory = path.dirname(file);
  await fs.mkdir(directory, { recursive: true });
  await discardAbandonedTemps(file);
  const temp = path.join(
    directory,
    `.${path.basename(file)}.${process.pid}.${randomBytes(6).toString("hex")}.tmp`,
  );
  const handle = await fs.open(temp, "wx");
  try {
    await handle.writeFile(contents, "utf8");
    await handle.sync();
    await handle.close();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await fs.unlink(temp).catch(() => undefined);
    throw error;
  }

  try {
    await fs.rename(temp, file);
  } catch (error) {
    await fs.unlink(temp).catch(() => undefined);
    throw error;
  }
}
