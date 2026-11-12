/** "Organization {name} (ID {id})" for move screens. */
export function organizationMoveLabel(name: string | null | undefined, id: number): string {
  const trimmed = name?.trim();
  const display = trimmed && trimmed !== `#${id}` ? trimmed : `#${id}`;
  return `Organization ${display} (ID ${id})`;
}
