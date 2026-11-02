import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getMachineById } from '@/data/machines';
import { getHiddenPartIds } from '@/lib/catalog';

// Lists the catalogue customers actually see, with each part's visibility from the database
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const machineTypeId = req.nextUrl.searchParams.get('machineTypeId');
  if (!machineTypeId) return NextResponse.json({ error: 'machineTypeId required' }, { status: 400 });

  const machine = getMachineById(machineTypeId);
  if (!machine) return NextResponse.json({ error: 'Unknown machine type' }, { status: 404 });

  const hidden = await getHiddenPartIds(machine.id);
  const modules = machine.modules.map((mod) => ({
    id: mod.id,
    name: mod.name,
    parts: mod.parts.map((part) => ({
      id: part.id,
      name: part.name,
      partNumber: part.partNumber,
      category: part.category,
      visible: !hidden.has(part.id),
    })),
  }));
  return NextResponse.json({ modules });
}
