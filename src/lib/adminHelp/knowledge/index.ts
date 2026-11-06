import type { AdminHelpChunk } from '../types';
import { HUB_GUIDE_CHUNKS } from './hubGuides';
import { HOW_TO_CHUNKS } from './howTos';
import { OPERATOR_GUIDE_CHUNKS } from './operatorGuides';

/** Full curated Admin Knowledge Pack (Tier 1 + Tier 2). */
export const ADMIN_HELP_CHUNKS: AdminHelpChunk[] = [
  ...HUB_GUIDE_CHUNKS,
  ...HOW_TO_CHUNKS,
  ...OPERATOR_GUIDE_CHUNKS,
];

export { resolveRouteInfo, suggestedChipsForPath } from './routeMap';
