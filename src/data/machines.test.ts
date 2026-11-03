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

  it.each(machines.map((m) => [m.id, m] as const))('%s has the details GROSS publishes', (_id, machine) => {
    expect(machine.description).not.toBe('');
    expect(machine.intro).not.toBe('');
    expect(machine.howItWorks).not.toBe('');
    expect(machine.specs.length).toBeGreaterThan(0);
    expect(machine.brochureUrl).toMatch(/^https:\/\/gross-zerkleinerer\.de\/.+\.pdf$/);
  });

  it('invents no prices, stock levels or part numbers', () => {
    for (const part of machines.flatMap((m) => m.modules.flatMap((mod) => mod.parts))) {
      expect(part.price).toBeNull();
      expect(part.availability).toBeNull();
      expect(part.partNumber).toBe('');
    }
  });

  it('shows no German text from the page GROSS has not translated', () => {
    const genius = machines.find((m) => m.id === 'genius-2-60');
    expect(JSON.stringify(genius)).not.toMatch(/Brikett|Behälter|Rührwerk|Presszylinder/);
    expect(genius?.modules.map((mod) => mod.id)).toContain('genius-2-60-hopper');
  });

  it.each([
    ['ghz-b4', 'Rubber feet', { x: 37, y: 71 }],
    ['ghz-b4', 'Drive', { x: 51, y: 62 }],
    ['ghz-3-6', 'Vibrating conveyor', { x: 18, y: 22 }],
  ])('%s places %s on the component rather than where the site does', (id, name, position) => {
    const machine = machines.find((m) => m.id === id);
    expect(machine?.modules.find((mod) => mod.name === name)?.position).toEqual(position);
  });

  it('keeps ids unique, since the database and existing orders refer to them', () => {
    const partIds = machines.flatMap((m) => m.modules.flatMap((mod) => mod.parts.map((part) => part.id)));
    expect(new Set(partIds).size).toBe(partIds.length);
  });
});
