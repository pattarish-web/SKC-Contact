"use client";

export const SHARED_LIBRARY_FILENAME = "sanggan-clean-library.json";

export type FolderLibrarySnapshot = {
  version: 1;
  exportedAt: number;
  contracts: unknown[];
  attachments?: unknown[];
};

const HANDLE_DB = "sanggan-clean-folder-sync";
const HANDLE_STORE = "handles";
const HANDLE_KEY = "shared-folder";

type DirHandle = FileSystemDirectoryHandle;

function supportsFolderSync(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HANDLE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(req.error ?? new Error("เปิดฐานโฟลเดอร์ร่วมไม่สำเร็จ"));
  });
}

async function saveDirHandle(handle: DirHandle): Promise<void> {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("บันทึกโฟลเดอร์ร่วมไม่สำเร็จ"));
  });
}

async function loadDirHandle(): Promise<DirHandle | null> {
  try {
    const db = await openHandleDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, "readonly");
      const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
      req.onsuccess = () => resolve((req.result as DirHandle) || null);
      req.onerror = () =>
        reject(req.error ?? new Error("โหลดโฟลเดอร์ร่วมไม่สำเร็จ"));
    });
  } catch {
    return null;
  }
}

async function ensurePermission(handle: DirHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyHandle = handle as any;
  if (typeof anyHandle.queryPermission === "function") {
    let perm = await anyHandle.queryPermission(opts);
    if (perm === "granted") return true;
    if (typeof anyHandle.requestPermission === "function") {
      perm = await anyHandle.requestPermission(opts);
      return perm === "granted";
    }
  }
  return true;
}

export function canUseSharedFolderSync(): boolean {
  return supportsFolderSync();
}

export async function hasSharedFolder(): Promise<boolean> {
  const handle = await loadDirHandle();
  if (!handle) return false;
  return ensurePermission(handle);
}

/** Ask the user to pick a shared folder (OneDrive / Google Drive / NAS). */
export async function pickSharedFolder(): Promise<boolean> {
  if (!supportsFolderSync()) {
    throw new Error(
      "เบราว์เซอร์นี้ไม่รองรับโฟลเดอร์ร่วม — ใช้ Chrome/Edge แล้วเลือกโฟลเดอร์ OneDrive หรือไดรฟ์บริษัท"
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handle = (await (window as any).showDirectoryPicker({
    id: "sanggan-clean-library",
    mode: "readwrite",
  })) as DirHandle;
  await saveDirHandle(handle);
  return true;
}

export async function clearSharedFolder(): Promise<void> {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    tx.objectStore(HANDLE_STORE).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () =>
      reject(tx.error ?? new Error("ล้างโฟลเดอร์ร่วมไม่สำเร็จ"));
  });
}

export async function writeSharedLibrary(
  snapshot: FolderLibrarySnapshot
): Promise<void> {
  const handle = await loadDirHandle();
  if (!handle) throw new Error("ยังไม่ได้เลือกโฟลเดอร์ร่วม");
  if (!(await ensurePermission(handle))) {
    throw new Error("ไม่ได้รับสิทธิ์เขียนโฟลเดอร์ร่วม");
  }
  const fileHandle = await handle.getFileHandle(SHARED_LIBRARY_FILENAME, {
    create: true,
  });
  const writable = await fileHandle.createWritable();
  const body = JSON.stringify({
    version: 1,
    exportedAt: Math.max(snapshot.exportedAt || 0, Date.now()),
    contracts: snapshot.contracts,
    attachments: [],
  });
  await writable.write(body);
  await writable.close();
}

export async function readSharedLibrary(): Promise<FolderLibrarySnapshot | null> {
  const handle = await loadDirHandle();
  if (!handle) return null;
  if (!(await ensurePermission(handle))) {
    throw new Error("ไม่ได้รับสิทธิ์อ่านโฟลเดอร์ร่วม");
  }
  try {
    const fileHandle = await handle.getFileHandle(SHARED_LIBRARY_FILENAME);
    const file = await fileHandle.getFile();
    const text = await file.text();
    if (!text.trim()) return null;
    const data = JSON.parse(text) as FolderLibrarySnapshot;
    if (!data || !Array.isArray(data.contracts)) {
      throw new Error("ไฟล์คลังในโฟลเดอร์ร่วมไม่ถูกต้อง");
    }
    return {
      version: 1,
      exportedAt: typeof data.exportedAt === "number" ? data.exportedAt : 0,
      contracts: data.contracts,
      attachments: [],
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") {
      return null;
    }
    throw error;
  }
}
