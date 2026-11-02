# GROSS Service App

After-sales spare parts ordering portal for **GROSS briquetting machines and industrial shredders**.  
Customers scan a unique QR code sticker on their machine and order original spare parts in seconds — no account, no phone call needed.

---

## Business Overview

GROSS manufactures briquetting machines and industrial shredders that are sold to businesses across Europe. Each machine is a long-term asset that requires periodic maintenance and part replacement. The traditional process — calling a sales rep, describing the machine, waiting for a quote — is slow and error-prone.

This app replaces that with a **self-service spare parts portal** tied to each physical machine via a unique QR code.

---

## Business Processes

### Process 1 — Machine Leaves the Factory

1. A machine is manufactured and assigned a **serial number** (e.g. `GP80-2024-001`)
2. An admin registers it under **Admin → Machines** with just the serial number and machine type
3. Its **QR sticker opens straight away**, ready to print or download. All stickers stay available under **Admin → QR Stickers**
4. The QR sticker is **physically placed on the machine** before it leaves the factory
5. The QR encodes a URL: `https://machine-maintenance-app.vercel.app/machine/GP80-2024-001`

> Stickers carry no client details, because they stay on the machine through resales. A machine registered by mistake can be deleted as long as it has no orders.

### Process 2 — Machine is Sold and Installed

1. Once the machine is sold, an admin opens **Machines**, finds the serial number (filter: **No client yet**) and clicks **Add client**
2. Client details are filled in: company name, email, phone, install address, installation date, internal notes
3. These details are **visible to staff only**. They appear next to the machine's orders, and never on the public parts page

> **If the machine is later sold or relocated**, the same form (**Edit client**) is used to update the details. No new QR sticker is needed.

### Process 3 — Customer Orders Parts

1. Customer scans the QR sticker on their machine with any smartphone camera
2. They land on the machine's spare parts page, which shows:
   - The correct machine diagram (X-ray view)
   - Clickable hotspots for each subsystem / module
   - A list of available spare parts per module
3. Customer adds parts to the cart. Each order covers one machine
4. Customer enters their name / company and email (phone and notes are optional) and submits the order
5. A confirmation with an order reference (e.g. `GRS-1A2B3C4D`) appears only once the order has been saved; if saving fails they see an error and keep their cart. The cart also survives a page refresh
6. No login or account is required

### Process 4 — GROSS Staff Manages Orders

1. An admin logs in at `/admin/login` with the admin PIN
2. **Orders** opens on the **To do** queue: new and processing orders, oldest first
3. Each order shows the customer, machine, parts, total and notes, with its next step as one button: **Start processing → Mark as shipped**. Orders can also be cancelled, reopened or moved a step back
4. Search finds orders by reference, customer, serial number or part. Orders and machines link to each other
5. The orders currently listed can be exported to CSV for internal use (ERP, invoicing)
6. When email is configured, staff get each new order by email (replies go to the customer) and the customer gets a confirmation

### Process 5 — Staff Manage Parts, Prices and Stock

1. **Admin → Parts** lists each machine type's catalogue by module, with price, availability and lead time
2. Changes apply to the customer's parts page immediately, with no deploy. Existing orders keep the prices they were placed at
3. Hiding a part removes it from the parts page and stops it being ordered. A module with no visible parts loses its hotspot

---

## Machine Catalogue

| Machine | Series | Type |
|---|---|---|
| Genius 2 / 40 | Genius | Briquetting — 40 mm |
| Genius 2 / 50 | Genius | Briquetting — 50 mm |
| Genius 2 / 60 | Genius | Briquetting — 60 mm |
| Genius 2 / 70 | Genius | Briquetting — 70 mm |
| GP 80 | GP | Briquetting — 50 mm |
| GP 100 | GP | Briquetting — 60 mm |
| GP 150 | GP | Briquetting — 70 mm |
| GP 200 | GP | Briquetting — 80 mm |
| GP 300 S | GP | Briquetting — 80 mm, max output |
| GP 400 M | GP | Briquetting — 150 x 60 mm rectangular |
| GAZ 600 / 62 / 82 / 82S / 102 / 102S / 152S | GAZ Series | Single-shaft wood shredder |
| GAZK 800 / 1000 / 1500 / 2000 | GAZK Series | Single-shaft shredder — plastics, paper, wood |
| GHZ B4 / 3–6 / T 6-13 | GHZ Series | Horizontal shredder — long timber |
| GZ 30 / 40 / 50 | GZ Series | Four-shaft shredder — continuous operation |

---

## Current Status

### ✅ Fully Working

- Machine registration with instant QR sticker; duplicate serial numbers are refused rather than overwritten
- QR code generation and printing (`/admin/qr-codes`)
- QR code scanning via camera (`/scan`) with manual serial number fallback
- Serial number → machine type lookup from database (QR flow end-to-end)
- Client details for when a machine is sold or relocated (staff only)
- Order submission (no login required) with contact details, and validation and prices enforced on the server
- Order management — To do queue, guided status steps, search, CSV export
- Parts, prices, stock and visibility managed per machine type, applied to customer pages and to ordering
- Admin PIN login with server-side sessions (8 hours), and limits on login attempts and orders
- Order emails to staff and customers (off until configured)

### 🔲 In Progress / Pending

- **Individual spare parts** — GROSS doesn't publish parts lists, so each machine component is one requestable item until real part numbers and prices are supplied

Everything else — routing, database, QR flow, admin panel, order management — is production-ready.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion |
| Icons | lucide-react |
| Database | Neon Serverless Postgres (`@neondatabase/serverless`) |
| QR Scanning | `jsqr` (browser camera via `getUserMedia`) |
| QR Generation | `qrcode` |
| Deployment | Vercel (auto-deploy on push to `main`) |

---

## Routes

| Route | Who | Description |
|---|---|---|
| `/` | Customer | Machine catalogue grid |
| `/machine/[id]` | Customer | Parts viewer — accepts machine-type ID or serial number. Rendered per request, never cached |
| `/scan` | Customer | Camera QR code scanner |
| `/admin/login` | Staff | PIN login |
| `/admin` | Staff | Orders, machines & parts dashboard (`?tab=orders\|machines\|parts`) |
| `/admin/qr-codes` | Staff | QR sticker generator & print view |

---

## API Reference

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth` | — | PIN login → sets session cookie |
| `DELETE` | `/api/auth` | — | Logout |
| `POST` | `/api/orders` | — | Create new order (customer-facing) |
| `GET` | `/api/orders` | Admin | List all orders |
| `PATCH` | `/api/orders/[id]` | Admin | Move an order to its next status (other moves return `409`) |
| `POST` | `/api/machines-db` | Admin | Register a physical machine (duplicate serial returns `409`) |
| `GET` | `/api/machines-db` | Admin | List all registered machines |
| `PATCH` | `/api/machines-db/[serial]` | Admin | Update client details for a machine |
| `DELETE` | `/api/machines-db/[serial]` | Admin | Remove a machine record (machines with orders return `409`) |
| `PATCH` | `/api/parts/[id]` | Admin | Toggle part visibility |
| `GET` | `/api/parts-by-machine` | Admin | Get parts for a machine type |

---

## Database Schema

```
machine_types   — machine models (Genius 2/40, GP 80, etc.)
                  id, name, model, description, image, xray_image

modules         — subsystems per machine type (Hopper, Hydraulic Tank, etc.)
                  id, machine_type_id, name, description, position_x, position_y

parts           — spare parts per module
                  id, module_id, part_number, name, description,
                  price, currency, availability, lead_time_days, category, visible

machines        — registered physical machines (one row per serial number)
                  serial_number (PK), machine_type_id, client_name, client_email,
                  client_address, client_phone, installed_at, notes, created_at

orders          — customer order requests
                  id, serial_number, machine_type_id, status, customer_name,
                  customer_email, customer_phone, notes, created_at, updated_at

order_items     — line items per order, keeping the price at the time of ordering
                  id, order_id, part_id, part_number, part_name,
                  quantity, unit_price, currency

admin_sessions  — logged-in staff sessions, storing only a hash of each token
rate_limits     — attempt counters per time window, storing only hashed addresses
```

**GROSS's website is the source of the catalogue.** `npm run sync:gross` reads the product pages on gross-zerkleinerer.de and regenerates `src/data/gross-catalogue.ts` and `public/machines`: names, descriptions, specifications, brochures, images and hotspot positions. Review the diff before committing it. `src/data/machines.ts` turns that into the app's catalogue and holds corrections for mistakes on the site. GROSS shares images between some similar models.

The website publishes no prices, stock levels or part numbers, so the app doesn't invent any. **Price, availability, lead time and visibility come from the `parts` table**, which is what the admin panel edits. A blank price shows customers "Price on request".

Schema changes live in [`migrations/`](migrations/) as numbered SQL files:

```bash
npm run db:migrate   # applies pending migrations to POSTGRES_URL in .env.local
npm run db:seed      # adds new catalogue entries; keeps existing prices, stock and visibility
```

Both use whichever database `.env.local` points at, so check that first. `db:migrate` prints the host it connects to.

---

## Admin Access

Visit `/admin/login` and enter the admin PIN.  
Production PIN is set via `ADMIN_PIN` in Vercel environment variables. Use a long one: attempts are limited, but a 4-digit PIN is still guessable over time.

Logging out ends the session on the server. To sign everyone out at once, for example after changing the PIN, run `DELETE FROM admin_sessions`.

> ⚠️ Never commit the PIN to the repository.

---

## Testing

```bash
npm run lint
npm run typecheck
npm test            # unit tests
npx playwright install chromium   # first time only
npm run test:e2e    # full flows in a real browser
```

The end-to-end tests run the real migrations, seed script and a production build against a throwaway in-memory Postgres, so they never touch a real database or send real email, whatever is in `.env.local`. GitHub Actions runs all of this on every pull request.

---

## Deployment

Deployed automatically via **Vercel** on every push to `main`. Run `npm run db:migrate` against production **before** merging anything that adds a migration.

Environment variables (set in the Vercel dashboard; see [`.env.example`](.env.example)):
- `POSTGRES_URL` — provided automatically by the Neon integration
- `ADMIN_PIN` — set manually
- `NEXT_PUBLIC_APP_URL` — the production address printed on QR stickers, e.g. `https://machine-maintenance-app.vercel.app`. Without it, stickers use the address of whichever deployment generated them, so a sticker made on a preview deploy or localhost would not work once printed
- `RESEND_API_KEY`, `ORDER_FROM_EMAIL` — optional, turn on order emails through [Resend](https://resend.com). The sender address must be on a domain verified with Resend
- `ORDER_NOTIFY_EMAIL` — optional, the staff inbox for new orders
