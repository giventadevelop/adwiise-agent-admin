import { customAlphabet } from "nanoid";
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAppUrl } from "@/lib/env"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789");

export function absoluteUrl(path: string) {
  return `${getAppUrl()}${path}`;
}

/** Built-in admin roles, plus any catalog role flagged grants_admin. */
export function isAdminRole(
  role: string | null | undefined,
  grantsAdminRoles?: ReadonlySet<string> | readonly string[] | null
): boolean {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;
  if (!role || !grantsAdminRoles) return false;
  return grantsAdminRoles instanceof Set ? grantsAdminRoles.has(role) : grantsAdminRoles.includes(role);
}