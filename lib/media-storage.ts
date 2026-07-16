import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

const LOCAL_PREFIX = "local:";

function localMediaPath(storageKey: string) {
  const relativePath = storageKey.slice(LOCAL_PREFIX.length);
  const root = path.resolve(process.cwd(), ".data", "media");
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error("Invalid media path");
  return resolved;
}

export async function storePrivateMedia(pathname: string, file: File) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type || "application/octet-stream",
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error("Vercel Blob is not configured. Add BLOB_READ_WRITE_TOKEN.");
  }

  const storageKey = `${LOCAL_PREFIX}${pathname}`;
  const filePath = localMediaPath(storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, new Uint8Array(await file.arrayBuffer()));
  return storageKey;
}

export async function loadPrivateMedia(storageKey: string) {
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    try {
      return await readFile(localMediaPath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  const response = await get(storageKey, { access: "private", useCache: false });
  return response?.stream ?? null;
}

export async function deletePrivateMedia(storageKey: string) {
  if (storageKey.startsWith(LOCAL_PREFIX)) {
    try {
      await unlink(localMediaPath(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    return;
  }
  await del(storageKey);
}
