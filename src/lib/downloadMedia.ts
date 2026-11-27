import { MediaItem } from '../types';

function sanitizeFilename(name: string): string {
  return (
    name
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'monte-media'
  );
}

function inferExtension(item: MediaItem, mimeType?: string): string {
  if (mimeType) {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('gif')) return 'gif';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('quicktime') || mimeType.includes('mov')) return 'mov';
    if (mimeType.includes('mp4')) return 'mp4';
  }
  const match = item.url.split('?')[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  if (match) return match[1].toLowerCase();
  return item.type === 'video' ? 'mp4' : 'jpg';
}

export async function downloadMediaFile(item: MediaItem): Promise<boolean> {
  const baseName = sanitizeFilename(item.title || 'monte-media');
  try {
    const res = await fetch(item.url);
    if (!res.ok) throw new Error('Fetch failed');
    const blob = await res.blob();
    const ext = inferExtension(item, blob.type);
    const filename = baseName.toLowerCase().endsWith(`.${ext}`)
      ? baseName
      : `${baseName}.${ext}`;

    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
    return true;
  } catch {
    // Fallback for strict CORS external URLs
    const ext = inferExtension(item);
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `${baseName}.${ext}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
}
