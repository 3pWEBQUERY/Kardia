/** Einfache HTML→Text-Umwandlung für den URL-Import (keine Skripte, keine Styles). */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

/** URL mit Zeitlimit und Grössenlimit laden. */
export async function fetchText(url: string, timeoutMs = 10_000, maxBytes = 2_000_000): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'follow',
    headers: { 'User-Agent': 'KardiaImport/1.0 (+https://kardia.ch)' },
  });
  if (!res.ok) throw new Error(`Abruf fehlgeschlagen: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > maxBytes) throw new Error('Seite zu gross');
  const type = res.headers.get('content-type') ?? '';
  const text = buf.toString('utf8');
  return type.includes('html') ? htmlToText(text) : text;
}
