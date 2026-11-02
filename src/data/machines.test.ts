import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { machines } from './machines';

const isOnDisk = (publicPath: string) => fs.existsSync(path.join(process.cwd(), 'public', publicPath));

describe('machine catalogue', () => {
  it.each(machines.map((m) => [m.id, m] as const))('%s has its images and valid hotspots', (_id, machine) => {
    expect(isOnDisk(machine.image), machine.image).toBe(true);
    expect(isOnDisk(machine.xrayImage), machine.xrayImage).toBe(true);
    expect(machine.modules.length).toBeGreaterThan(0);

    for (const mod of machine.modules) {
      expect(mod.position.x).toBeGreaterThanOrEqual(0);
      expect(mod.position.x).toBeLessThanOrEqual(100);
      expect(mod.position.y).toBeGreaterThanOrEqual(0);
      expect(mod.position.y).toBeLessThanOrEqual(100);
      expect(mod.parts.length).toBeGreaterThan(0);
    }

    const spots = machine.modules.map((mod) => `${mod.position.x},${mod.position.y}`);
    expect(new Set(spots).size, 'two hotspots share a position').toBe(spots.length);
  });

  it('keeps ids unique, since the database and existing orders refer to them', () => {
    const partIds = machines.flatMap((m) => m.modules.flatMap((mod) => mod.parts.map((part) => part.id)));
    expect(new Set(partIds).size).toBe(partIds.length);
  });
});
