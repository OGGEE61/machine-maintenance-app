import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getMachineById } from '@/data/machines';
import { getAdminModules } from '@/lib/catalog';

// Lists the catalogue customers actually see, with the values staff manage from the database
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const machineTypeId = req.nextUrl.searchParams.get('machineTypeId');
  if (!machineTypeId) return NextResponse.json({ error: 'machineTypeId required' }, { status: 400 });

  const machine = getMachineById(machineTypeId);
  if (!machine) return NextResponse.json({ error: 'Unknown machine type' }, { status: 404 });

  return NextResponse.json({ modules: await getAdminModules(machine) });
}
