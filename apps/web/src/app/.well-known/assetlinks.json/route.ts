import { NextResponse } from 'next/server';

/** Android App Links, zunächst leer (PRD 13.4). */
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE;
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS ?? '').split(',').filter(Boolean);
  return NextResponse.json(
    pkg ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: fingerprints } }] : [],
  );
}
