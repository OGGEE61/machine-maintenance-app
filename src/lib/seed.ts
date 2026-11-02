// Adds the catalogue to a database that has had its migrations run.
// Usage: npm run db:seed. Prices, stock and visibility of existing parts are left alone,
// because staff manage those in the admin panel.
import { neon } from '@neondatabase/serverless';
import { machines } from '../data/machines.ts';

const sql = neon(process.env.POSTGRES_URL!);

async function seed() {
  console.log('Seeding machine types...');

  for (const machine of machines) {
    await sql`
      INSERT INTO machine_types (id, name, model, description, image, xray_image)
      VALUES (${machine.id}, ${machine.name}, ${machine.model}, ${machine.description}, ${machine.image}, ${machine.xrayImage})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        model = EXCLUDED.model,
        description = EXCLUDED.description,
        image = EXCLUDED.image,
        xray_image = EXCLUDED.xray_image
    `;

    for (const mod of machine.modules) {
      await sql`
        INSERT INTO modules (id, machine_type_id, name, description, position_x, position_y)
        VALUES (${mod.id}, ${machine.id}, ${mod.name}, ${mod.description}, ${mod.position.x}, ${mod.position.y})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          position_x = EXCLUDED.position_x,
          position_y = EXCLUDED.position_y
      `;

      for (const part of mod.parts) {
        await sql`
          INSERT INTO parts (id, module_id, part_number, name, description, price, currency, availability, lead_time_days, category, visible)
          VALUES (${part.id}, ${mod.id}, ${part.partNumber}, ${part.name}, ${part.description}, ${part.price}, ${part.currency}, ${part.availability}, ${part.leadTimeDays ?? null}, ${part.category}, TRUE)
          ON CONFLICT (id) DO UPDATE SET
            part_number = EXCLUDED.part_number,
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category
        `;
      }
    }
    console.log(`  ✓ Seeded ${machine.name}`);
  }

  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
