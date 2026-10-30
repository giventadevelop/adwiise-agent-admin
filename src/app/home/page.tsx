import { redirect } from 'next/navigation';

/**
 * Legacy `/home` route. This admin hub has no tenant public homepage —
 * send visitors to the hub root (which does not fetch tenant content sections).
 */
export default function HomePage() {
  redirect('/');
}
