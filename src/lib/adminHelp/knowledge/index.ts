import type { AdminHelpChunk } from '../types';
import { HUB_GUIDE_CHUNKS } from './hubGuides';
import { HOW_TO_CHUNKS } from './howTos';
import { OPERATOR_GUIDE_CHUNKS } from './operatorGuides';
import { PAGE_GUIDE_CHUNKS } from './pageGuides';
import { CONCEPT_CHUNKS } from './concepts';

/** Full curated Admin Knowledge Pack (Tier 1 + Tier 2). */
export const ADMIN_HELP_CHUNKS: AdminHelpChunk[] = [
  ...CONCEPT_CHUNKS,
  ...HUB_GUIDE_CHUNKS,
  ...HOW_TO_CHUNKS,
  ...OPERATOR_GUIDE_CHUNKS,
  ...PAGE_GUIDE_CHUNKS,
];

export { PAGE_GUIDES, resolvePageGuide, pageGuideChunkId } from './pageGuides';

export { resolveRouteInfo, suggestedChipsForPath } from './routeMap';
