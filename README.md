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
5. The QR encodes a URL: `https://gross-service-app.vercel.app/machine/GP80-2024-001`

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
5. A confirmation with an order reference (e.g. `GRS-1A2B3C4D`) appears only once the order has been saved; if saving fails they see an error and keep their cart
6. No login or account is required

### Process 4 — GROSS Staff Manages Orders

1. An admin logs in at `/admin/login` with the admin PIN
2. **Orders** opens on the **To do** queue: new and processing orders, oldest first
3. Each order shows the customer, machine, parts, total and notes, with its next step as one button: **Start processing → Mark as shipped**. Orders can also be cancelled, reopened or moved a step back
4. Search finds orders by reference, customer, serial number or part. Orders and machines link to each other
5. The orders currently listed can be exported to CSV for internal use (ERP, invoicing)

### Process 5 — Staff Control What Can Be Ordered

1. **Admin → Parts** lists each machine type's catalogue by module
2. Hiding a part removes it from the customer's parts page immediately and stops it being ordered. A module with no visible parts loses its hotspot

---

## Machine Catalogue

| Machine | Series | Type |
|---|---|---|
| Genius 2 / 40 | Genius | Briquetting — 40 mm |
| Genius 2 / 50 | Genius | Briquetting — 50 mm |
| Genius 2 / 60 | Genius | Briquetting — 60 mm |
| Genius 2 / 70 | Genius | Briquetting — 70 mm |
| GP 80 | GP | Briquetting — 80 mm |
| GP 100 | GP | Briquetting — 100 mm |
| GP 150 | GP | Briquetting — 150 mm |
| GP 200 | GP | Briquetting — 200 mm |
| GP 300 S | GP | Briquetting — max output |
| GP 400 M | GP | Briquetting — rectangular |
| GAZ 600 / 62 / 82 / 82S / 102 / 102S / 152S | Seria GAZ | Single-shaft wood shredder |
| GAZK 800 / 1000 / 1500 / 2000 | Seria GAZK | Single-shaft shredder — plastics, paper, wood |
| GHZ B4 / 3–6 / T 6-13 | Seria GHZ | Horizontal shredder — long timber |
| GZ 30 / 40 / 50 | Seria GZ | Four-shaft shredder — continuous operation |

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
- Parts visibility per machine type, applied to customer pages and to ordering
- Admin PIN authentication with HttpOnly cookie session (8 hours)

### 🔲 In Progress / Pending

- **Full parts catalogue** — parts data needs to be completed for all 26 machine types
- **X-ray hotspot layout** — module positions on the machine diagram images need to be tuned per machine

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

parts           — spare parts per module, with visibility toggle
                  id, module_id, part_number, name, description,
                  price, currency, availability, lead_time_days, category, visible

machines        — registered physical machines (one row per serial number)
                  serial_number (PK), machine_type_id, client_name, client_email,
                  client_address, client_phone, installed_at, notes, created_at

orders          — customer order requests
                  id, serial_number, machine_type_id, status, customer_name,
                  customer_email, customer_phone, notes, created_at, updated_at

order_items     — line items per order
                  id, order_id, part_id, part_number, part_name,
                  quantity, unit_price, currency
```

---

## Admin Access

Visit `/admin/login` and enter the admin PIN.  
Production PIN is set via `ADMIN_PIN` in Vercel environment variables.

> ⚠️ Never commit the PIN to the repository.

---

## Deployment

Deployed automatically via **Vercel** on every push to `main`.

Required environment variables (set in Vercel dashboard):
- `POSTGRES_URL` — provided automatically by the Neon integration
- `ADMIN_PIN` — set manually
- `NEXT_PUBLIC_APP_URL` — the production address printed on QR stickers, e.g. `https://gross-service-app.vercel.app`. Without it, stickers use the address of whichever deployment generated them, so a sticker made on a preview deploy or localhost would not work once printed
