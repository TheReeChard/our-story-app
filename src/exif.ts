/**
 * Turn an EXIF date string ("2024:06:15 18:42:10") into an ISO date ("2024-06-15").
 * Returns null if the value is missing or not a plausible date.
 */
export function exifDateToIso(exif: Record<string, unknown> | null | undefined): string | null {
  if (!exif) return null;
  const raw =
    (exif['DateTimeOriginal'] as string | undefined) ??
    (exif['DateTimeDigitized'] as string | undefined) ??
    (exif['DateTime'] as string | undefined);
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  if (year < 1990 || year > new Date().getFullYear() + 1) return null;
  const iso = `${y}-${mo}-${d}`;
  return isValidIsoDate(iso) ? iso : null;
}

export function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function formatDate(iso: string | null): string {
  if (!iso) return 'Date unknown';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
