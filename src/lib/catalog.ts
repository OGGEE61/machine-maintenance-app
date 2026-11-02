import { sql } from '@/lib/db';
import type { Machine, Module, Part } from '@/types';

// machines.ts defines what each machine is made of. Prices, stock and visibility
// come from the database, where staff can change them without a deploy.
type ManagedPart = Part & { visible: boolean };

async function withManagedValues(machine: Machine): Promise<Array<Omit<Module, 'parts'> & { parts: ManagedPart[] }>> {
  const rows = await sql`
    SELECT p.id, p.price, p.availability, p.lead_time_days, p.visible
    FROM parts p
    JOIN modules m ON m.id = p.module_id
    WHERE m.machine_type_id = ${machine.id}
  `;
  const byId = new Map(rows.map((row) => [row.id as string, row]));

  return machine.modules.map((mod) => ({
    ...mod,
    parts: mod.parts.map((part) => {
      const row = byId.get(part.id);
      if (!row) return { ...part, visible: true };
      return {
        ...part,
        price: Number(row.price),
        availability: row.availability as Part['availability'],
        leadTimeDays: (row.lead_time_days as number | null) ?? undefined,
        visible: row.visible as boolean,
      };
    }),
  }));
}

// The machine as customers may see it: hidden parts removed, along with modules left empty
export async function getCustomerMachine(machine: Machine): Promise<Machine> {
  const modules = await withManagedValues(machine);
  return {
    ...machine,
    modules: modules
      .map((mod) => ({ ...mod, parts: mod.parts.filter((part) => part.visible) }))
      .filter((mod) => mod.parts.length > 0),
  };
}

export async function getAdminModules(machine: Machine) {
  const modules = await withManagedValues(machine);
  return modules.map((mod) => ({
    id: mod.id,
    name: mod.name,
    parts: mod.parts.map((part) => ({
      id: part.id,
      name: part.name,
      partNumber: part.partNumber,
      price: part.price,
      currency: part.currency,
      availability: part.availability,
      leadTimeDays: part.leadTimeDays ?? null,
      visible: part.visible,
    })),
  }));
}
