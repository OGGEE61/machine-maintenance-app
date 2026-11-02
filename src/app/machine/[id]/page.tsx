import { cache } from 'react';
import { getMachineById } from '@/data/machines';
import { notFound } from 'next/navigation';
import { sql } from '@/lib/db';
import { getCustomerMachine } from '@/lib/catalog';
import MachinePageClient from './MachinePageClient';
import type { Machine } from '@/types';

// Always render on request: registrations and part visibility must show up immediately,
// and an unregistered serial must not stay cached as a 404 once it has been registered
export const dynamic = 'force-dynamic';

const findMachine = cache(async (id: string): Promise<Machine | undefined> => {
  // 1. Try static machine-type lookup first (catalogue URL like /machine/genius-2-40)
  const machineByType = getMachineById(id);
  if (machineByType) return machineByType;

  // 2. Fall back to DB lookup by serial number (QR-scanned URL like /machine/GRS-2024-001)
  // Only the type is read: this page is public, so client details must never reach it
  const rows = await sql`SELECT machine_type_id FROM machines WHERE serial_number = ${id} LIMIT 1`;
  if (rows.length === 0) return undefined;

  // Look up the full machine-type definition from static data
  const machineTemplate = getMachineById(rows[0].machine_type_id as string);
  return machineTemplate && { ...machineTemplate, serialNumber: id };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const machine = await findMachine(id);
  if (!machine) return { title: 'Machine Not Found' };
  return {
    title: `${machine.name} — GROSS Parts`,
    description: `Order spare parts for your ${machine.name}. ${machine.description}`,
    // Individual machines shouldn't turn up in search results, only the catalogue pages
    robots: machine.serialNumber ? { index: false } : undefined,
  };
}

export default async function MachinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const machine = await findMachine(id);
  if (!machine) {
    notFound();
  }

  return <MachinePageClient machine={await getCustomerMachine(machine)} />;
}
