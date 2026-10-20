'use client';

import { subscribePush } from '@/app/actions/candidate';

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Push wird erst angefragt, wenn die Person eine Suche speichert oder sich bewirbt –
 * nie beim ersten Besuch (PRD 13.3). Auf iOS nur in der installierten Web-App.
 */
export async function requestPush(): Promise<'granted' | 'denied' | 'unsupported' | 'ios-install'> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  await subscribePush(sub.toJSON());
  return 'granted';
}
