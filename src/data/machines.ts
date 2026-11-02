import type { GrossMachine, Machine } from '@/types';
import { grossCatalogue } from './gross-catalogue.ts';

// Corrections to what the website currently publishes. Remove an entry once GROSS fixes its page.
const CORRECTIONS: Record<string, Partial<GrossMachine>> = {
  // The English page's summary says 80 mm; its specifications and introduction say 50 mm
  'gp-80': { summary: 'Medium throughput requirements | 50 mm briquette diameter' },
  // The English page is in German, so this is a translation, with hotspots from the identical Genius 2 / 50
  'genius-2-60': {
    category: 'Briquette press with clamping technology',
    label: 'The basic machine for briquetting',
    summary: 'The basic machine | 60 mm briquette diameter',
    audience: 'Your introduction to briquetting',
    intro: 'The GROSS Genius 2 / 60 is a compact briquette press for light wood shavings, sawdust, sanding dust and loose paper shreds. It compresses the residues into round briquettes with a diameter of 60 mm, reducing their volume for easier storage, handling and further use. With its small footprint and automatic operation, the Genius 2 / 60 is especially suited to smaller trade and production businesses.',
    howItWorks: 'The material is fed in via a large hopper and moved by an agitator to the briquette press’s conveyor screw. The screw transports a set quantity into the pre-compactor. A hydraulic feed gate then pushes the material into the press clamp, where it is compressed under high pressure into a solid briquette. With each pressing cycle, the finished briquette is pushed a little further out of the machine.',
    modules: grossCatalogue.find((m) => m.id === 'genius-2-50')?.modules,
  },
};

function seriesOf(id: string): string {
  if (id.startsWith('genius')) return 'Genius';
  if (id.startsWith('gp-')) return 'GP';
  if (id.startsWith('gazk')) return 'GAZK Series';
  if (id.startsWith('gaz')) return 'GAZ Series';
  if (id.startsWith('ghz')) return 'GHZ Series';
  return 'GZ Series';
}

// These ids are referenced by the database and existing orders, so they must stay stable
function moduleSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 8);
}

function toMachine(published: GrossMachine): Machine {
  const { summary, modules, ...details } = { ...published, ...CORRECTIONS[published.id] };
  return {
    ...details,
    // The site's headings drop the slash its own text uses
    name: details.name.replace(/^Genius 2 (\d+)$/, 'Genius 2 / $1'),
    model: seriesOf(details.id),
    serialNumber: '',
    description: summary,
    modules: modules.map((mod) => {
      const id = `${details.id}-${moduleSlug(mod.name)}`;
      return {
        id,
        name: mod.name,
        description: mod.description,
        position: { x: mod.x, y: mod.y },
        // GROSS doesn't publish individual parts, so each component is one requestable item for now
        parts: [{
          id: `${id}-kit`,
          partNumber: '',
          name: mod.name,
          description: mod.description,
          price: null,
          currency: 'EUR',
          availability: null,
          category: 'Spare parts',
        }],
      };
    }),
  };
}

export const machines: Machine[] = grossCatalogue.map(toMachine);

export function getMachineById(id: string): Machine | undefined {
  return machines.find((m) => m.id === id);
}
