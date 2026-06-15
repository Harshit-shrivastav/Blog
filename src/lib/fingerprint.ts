const STORAGE_KEY = "device-fingerprint";

export function getFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem(STORAGE_KEY);
  if (!fp) {
    fp = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(STORAGE_KEY, fp);
  }
  return fp;
}
