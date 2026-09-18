export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDateString(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return localDateString(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return localDateString(asDate);
  }
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  }
  if (typeof value === "object" && value !== null && "toISOString" in value) {
    try {
      const iso = (value as { toISOString: () => string }).toISOString();
      const match = iso.match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function stableNoteId(path: string): string {
  let hash = 2166136261;
  for (let i = 0; i < path.length; i++) {
    hash ^= path.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4).trim();
}

export function excerptBody(content: string, maxChars = 500): string {
  const body = stripFrontmatter(content)
    .replace(/^#+\s+/gm, "")
    .replace(/>\s*\[!.*?\][^\n]*/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  if (body.length <= maxChars) return body;
  return `${body.slice(0, maxChars).trim()}…`;
}

export function obsidianOpenUrl(vaultName: string, filePath: string): string {
  return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
}
