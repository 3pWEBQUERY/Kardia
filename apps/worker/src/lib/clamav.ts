import { connect } from 'node:net';

import type { Readable } from 'node:stream';

/**
 * ClamAV über clamd (TCP, Protokoll INSTREAM): `zINSTREAM\0`, danach Blöcke mit
 * 4-Byte-Länge (Big Endian) und ein 0-Block als Abschluss. Antwort z. B.
 * `stream: OK` oder `stream: Eicar-Signature FOUND`.
 */
export type ScanResult = { clean: true } | { clean: false; signature: string } | { error: string };

export function parseClamdResponse(raw: string): ScanResult {
  const text = raw.replace(/\0/g, '').trim();
  if (/:\s*OK$/.test(text)) return { clean: true };
  const found = /:\s*(.+)\s+FOUND$/.exec(text);
  if (found?.[1]) return { clean: false, signature: found[1].trim() };
  return { error: text || 'leere Antwort' };
}

export function scanStream(stream: Readable, host: string, port: number, timeoutMs = 60_000): Promise<ScanResult> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    let response = '';
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({ error: 'Zeitüberschreitung beim Virenscan' });
    }, timeoutMs);
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      stream.on('data', (chunk: Buffer) => {
        const size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length, 0);
        socket.write(size);
        socket.write(chunk);
      });
      stream.on('end', () => socket.write(Buffer.alloc(4)));
      stream.on('error', (e) => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ error: e.message });
      });
    });
    socket.on('data', (d) => (response += d.toString()));
    socket.on('end', () => {
      clearTimeout(timer);
      resolve(parseClamdResponse(response));
    });
    socket.on('error', (e) => {
      clearTimeout(timer);
      resolve({ error: e.message });
    });
  });
}
