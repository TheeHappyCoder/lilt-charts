/**
 * Where the land is, for the globe: a 360 by 180 grid of one-degree cells, row 0 at 90° north and
 * column 0 at 180° west. Rasterised once from Natural Earth's 1:110m land polygons (public domain,
 * naturalearthdata.com), sampling nine points a cell and keeping the majority.
 *
 * Encoded as alternating runs of sea and land, read row by row from the first sea cell. Each run is
 * a number in base 32, most significant digit first, written in the base64 alphabet: a character
 * at or past index 32 carries five bits and says another follows; one below 32 ends the number.
 */
const RUNS = [
  'indMpNCBURYpDZEhIBIoVIBDBNDhThDCBDWChLGlHVIhPeIBFiEHkbFBDDECLDhVhAHiRFkICFBXKIhThBEEBiQCkFEIBIDC',
  'FCKJhRiWDhBLkDLFDCCBMWhHiNGbYXIjGBWGBBZhFiLEbYjeIKBEDCFCCDCBDWhDiLDYhGFDjMQBDEEBCEJBEVhAiLENDJhQ',
  'LFhDBhXDCOFDBDDQBBRhBiKEMEChXDBCCBNhQKhDNHEDUPdBBhPGhFGBiVhGYEPDPDDBEFFEKNCBbhKPcDDGBieCICBNhTHD',
  'HCCGCEHHQYhMWOCDKCECjNMiMBGECCJKVhPbDCCZCjSGBCiPJMJShQVBGDcBjLBHFiQBBLGDCKNRJaKDKFkMGBIBDiJCEEMO',
  'LSIaKDLCkNViGFCCBJHOKhSLCkdQiJICEBHDRHhRMDkePiIQGXGhQMEkICDCJWRChUQIYDhQNEkFHJbJCBKhNRJDCiFNHCBj',
  'ZCEFDhHEQhNPKBEhaCJDCGHjVSDhICCBThJQPhYEOFFBBjURGhFCZhNLQhXDLDBEFjVSHhCCdhOIShXDKCBDHjTTHiDhRDWh',
  'QDCDKBGDBjVTFiCBDhPDXhPDDDHkGBBNEiIhODXhPCCGDkLNCiKhQBXhUFDkJBBOBiKiECChTCEkMBCiZCBhZJDhWkNCCibB',
  'BhWBDGGhRkQCBidhbJBBBhSkODBidhchehBBDDMDiVECichfhcfDCCLFiUjDhYCChfNDOJJEiVGBidhWheDDJDDDMMIDiUGE',
  'ibhVheMIDEKNHFiOJEichVheLKEDJEFEIFiMKBifhSiBJICFDBFCBCVDiEBHLCiehSiBJIBHBDDEWEiCCCCDMCifhQiCJVDD',
  'WFiAHDMBjAhPiDIOCGCEXEiBBCEDJDjBhOiGBGKLBGCBCCiVFDHFjChNiGBDNZiUGDEIjDhLiGRaiULGjJhHiHTYiWJEjNhF',
  'iHYGCMiWJCjPCBhBiHaEHDBDiYIBjRBChAiHdBjFjcBCREBHCiHhaCiIjcBBQNCiGhbDiHjcCBOODiDhPCNEiEjeBCNPCiCh',
  'QCOHhfkABCMQBiBhSCPHhckBCCKiThSCODDKhUCBkDJiShUDUJhRDBkFIOBBDhfhUDVJWBXFBkGISChchWCULRFQBCkPJHDJ',
  'DhahWDSPOGOjBBhSJFDPDhWhVERPMJMDCkRJCFPECBhShWDQQLKMDBkVNiIhXDNSKLNNCkLLiIhXEKUJMOMCkRJiDhZDJWGS',
  'LLCkSJiChaCGZGSLMBkUGiDhbBEcFSLNCkVEiChchAFSCCHlFCLBCBhVhbGCZETBDGNBCBkUDHKCBBBhOhbBGZEYDQBkYBDB',
  'DEBKhPiBZDBBRBGBlLDCShPhfbBCBRCYCkZBCThOhfeCRBWBBDkcThPhcfBTCOCGBkeYhLKFhMhTDNDlEZhMBNhKhQCDCLEl',
  'FahchGhSCCCKElFbhdhEhUCCCHHlDdhbhEhWDBBFJlCehbhChYEGJCEkcfhahBhaEFIPBkShEhWhBhbDGHCDJDkShFhVfhcF',
  'EHCDKCCEkMhJhSdheEICDBBBEBGKkIhLhRciADQBNJkGhOhPbiBChAIECjfhOhPbiDDdKHBjchNhQaiEGZJkGhMhQaiLBCBC',
  'BFBNDDCkFhLhRbiUBWCkFhKhRbnThIhTajGBkMhHhTcIBiRGFBkNhFhUcHCiQGGCkMhFhTdHCiMCCGGDkMhEhTcHDiKMGDkO',
  'hChTcFFiKODFhBBjMhBhTaGFiJSBFkQehUYIFiJYkQehVWJFiIakPehVWJFiFfPBjddhXVJEiDhCQBjcchYWHFiChEkMZhbW',
  'IEiChFkKYheUJDiChHkJXhfSiRhHkIWiASiRhHkIWiASiRhHkIWiBQiThHkHViDOiUhGkHWiDOiUhGkHViFMiWhFkITiGLiX',
  'KISkITiHJiYJLCBNkJOBDiJCifDSOkIQmELXBjRQmFKYBjPRmFKZBjPOmKBBCcDjNLnMDjNMnNCjNJmSDYCBBjOKmRDXDjRI',
  'mTBXDjRJnJDjSInKEjSInLCjTJqeJqfIkJBmXGrCGIDqYFrDGrEGrFBi6JB2JCrEDjTGhMEGEPGkcDjRMWiAkSDjMaKiHkKC',
  'CFifGCdIiRkCDBGiEECKChMFiYjcHBGhSCBiMEjDiXChAHhQlYiDBSFDKEDFMhNlZhXKBDCHBBKhGhPlWhQiRhOlXhSiMhKm',
  'AhGiThLmEhBCEiPdFImKhACLiIaINlfhUiKIFGIQlehNiaYmKhOieEmbhLqCLNUqFCfBh3I',
].join('');

export const MASK_WIDTH = 360;
export const MASK_HEIGHT = 180;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

let mask: Uint8Array | null = null;

/** The land mask, one byte a cell, 1 for land. Decoded once, on first use. */
export function landMask(): Uint8Array {
  if (mask) return mask;
  const out = new Uint8Array(MASK_WIDTH * MASK_HEIGHT);
  let at = 0;
  let land = 0;
  let value = 0;
  for (let i = 0; i < RUNS.length; i++) {
    const digit = ALPHABET.indexOf(RUNS[i]!);
    value = value * 32 + (digit & 31);
    if (digit >= 32) continue;
    if (land) out.fill(1, at, at + value);
    at += value;
    land ^= 1;
    value = 0;
  }
  mask = out;
  return out;
}

/**
 * How much land is at a latitude and longitude in degrees, from 0 to 1, blended between the four
 * nearest cells so coastlines come out soft rather than stepped.
 */
export function landAt(lat: number, lon: number): number {
  const m = landMask();
  const x = ((((lon + 180) % 360) + 360) % 360) - 0.5;
  const y = Math.min(MASK_HEIGHT - 1, Math.max(0, 90 - lat - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const c0 = (x0 + MASK_WIDTH) % MASK_WIDTH;
  const c1 = (x0 + 1) % MASK_WIDTH;
  const r1 = Math.min(MASK_HEIGHT - 1, y0 + 1);
  const a = m[y0 * MASK_WIDTH + c0]! + (m[y0 * MASK_WIDTH + c1]! - m[y0 * MASK_WIDTH + c0]!) * fx;
  const b = m[r1 * MASK_WIDTH + c0]! + (m[r1 * MASK_WIDTH + c1]! - m[r1 * MASK_WIDTH + c0]!) * fx;
  return a + (b - a) * fy;
}
