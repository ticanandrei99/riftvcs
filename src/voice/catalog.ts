import { championKey } from './presets';
const ORIGIN = 'https://ddragon.leagueoflegends.com';
const SUPPORTED: Record<string, string> = { xerath: 'Xerath', thresh: 'Thresh', mordekaiser: 'Mordekaiser' };
/** Data Dragon skins.num matches Live Client Data skinID; skins.id does not. */
export function findSkinName(data: unknown, champion: string, skinId: number): string | undefined {
  const skins = (data as any)?.data?.[champion]?.skins;
  if (!Array.isArray(skins) || !Number.isSafeInteger(skinId) || skinId < 0) return undefined;
  const skin = skins.find((s: any) => s?.num === skinId && typeof s?.name === 'string');
  return skin?.name;
}
export async function resolveSkinName(champion: string, skinId: number | undefined, signal: AbortSignal): Promise<string | undefined> {
  const canonical = SUPPORTED[championKey(champion)];
  if (!canonical || skinId === undefined || !Number.isSafeInteger(skinId) || skinId < 0) return undefined;
  const bounded = AbortSignal.any([signal, AbortSignal.timeout(6000)]);
  try {
    const versionsResponse = await fetch(ORIGIN + '/api/versions.json', { signal: bounded });
    if (!versionsResponse.ok) return undefined;
    const versions: unknown = await versionsResponse.json();
    const version = Array.isArray(versions) ? versions[0] : null;
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) return undefined;
    const response = await fetch(ORIGIN + '/cdn/' + version + '/data/en_US/champion/' + canonical + '.json', { signal: bounded });
    if (!response.ok) return undefined;
    return findSkinName(await response.json(), canonical, skinId);
  } catch { return undefined; } // Offline: champion preset remains available.
}
