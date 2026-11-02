import { sql } from '@/lib/db';
import type { Machine } from '@/types';

export async function getHiddenPartIds(machineTypeId: string): Promise<Set<string>> {
  const rows = await sql`
    SELECT p.id
    FROM parts p
    JOIN modules m ON m.id = p.module_id
    WHERE m.machine_type_id = ${machineTypeId} AND p.visible = FALSE
  `;
  return new Set(rows.map((row) => row.id as string));
}

// The machine as customers may see it: hidden parts removed, along with modules left empty
export async function withVisiblePartsOnly(machine: Machine): Promise<Machine> {
  const hidden = await getHiddenPartIds(machine.id);
  return {
    ...machine,
    modules: machine.modules
      .map((mod) => ({ ...mod, parts: mod.parts.filter((part) => !hidden.has(part.id)) }))
      .filter((mod) => mod.parts.length > 0),
  };
}
