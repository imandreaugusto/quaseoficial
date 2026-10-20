export const SPACE_MOMENT_INSIGHT_EVENT = 'bia:space-moment-insight';

export interface SpaceMomentInsightDetail {
  draft?: string;
}

export function requestSpaceMomentInsight(detail: SpaceMomentInsightDetail = {}) {
  window.dispatchEvent(new CustomEvent<SpaceMomentInsightDetail>(SPACE_MOMENT_INSIGHT_EVENT, { detail }));
}
