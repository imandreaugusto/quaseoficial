import './maplibreWorker';

export const OPENFREEMAP_STYLES = {
  night: 'https://tiles.openfreemap.org/styles/dark',
  city: 'https://tiles.openfreemap.org/styles/liberty',
} as const;

export function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

type StyleLike = { layers?: Array<{ type?: string }> };

export function hasBuildingExtrusion(style: StyleLike | undefined): boolean {
  return Boolean(style?.layers?.some((layer) => layer.type === 'fill-extrusion'));
}
