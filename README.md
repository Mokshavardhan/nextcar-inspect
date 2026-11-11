# NextCar Inspect — Vehicle Inspection Booking & Management Platform

A full-stack, production-ready Vehicle Inspection Booking & Management Platform built with **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **Prisma ORM**, **Supabase (PostgreSQL)**, and **PDFKit**.

All pricing and transactions operate in **Indian Rupees (INR / ₹)**, and the database seeds only clean master data (service packages, availability slots, 26-point digital inspection checklist, and role accounts) with **zero fake bookings or synthetic revenue**.

---

## Core Capabilities

### 1. Public Customer Website
- **Homepage (`/`)**: Hero showcase (*"Know Your Vehicle Before You Make Your Move."*), dynamic inspection packages from Supabase, 5-step verification overview, Why Choose Us, testimonials, interactive FAQ accordion, and contact callout.
- **Services Page (`/services`)**: Detailed service cards (`Full Vehicle Inspection ₹2,499`, `Pre-Purchase Vehicle Inspection ₹1,999`, `Used Car Inspection ₹1,499`, `Basic Vehicle Inspection ₹999`) with duration, checklist summaries, and direct booking links.
- **About Us (`/about`)**, **Contact (`/contact`)** (with live inquiry persistence + admin notifications), **Privacy Policy (`/privacy`)**, and **Terms of Service (`/terms`)**.

### 2. 7-Step Customer Booking Wizard (`/book`)
1. **Select Inspection Service**: Live active services & INR pricing.
2. **Vehicle Information**: Vehicle type (`CAR`, `SUV`, `BIKE`), manufacturer, model, year, registration number (`KA-01-MJ-4029`), fuel type, transmission, notes, or choose from saved vehicles.
3. **Customer Information**: Full name, email, mobile number, WhatsApp number, plus inline customer sign-in or instant customer account creation.
4. **Inspection Location**: Interactive **Leaflet Map** picker with search, GPS detection, draggable pin, and address fields.
5. **Schedule Inspection**: Real-time slot capacity validation (`GET /api/availability?date=YYYY-MM-DD`) and transactional double-booking prevention.
6. **Payment**: Supports **Full Payment**, **Partial Advance Deposit**, or **Pay Later** governed by Admin `PlatformSettings`, with server-side HMAC-verified Sandbox Card checkout or live **Stripe Checkout (INR)** integration.
7. **Confirmation**: Generates unique Booking ID (`NCI-YYYY-XXXXXX`) and triggers Email, WhatsApp, and In-App notifications.

### 3. Role-Based Dashboards & Permissions
- **Customer Portal (`/dashboard/customer`)**: View upcoming/previous bookings, full lifecycle status tracker & activity log, assigned technician details, balance payments in INR, policy-enforced rescheduling & cancellation, profile/password updates, and downloading **Admin-Approved PDF Inspection Reports**.
- **Technician Portal (`/dashboard/technician`)**: Mobile-first interface with today's/upcoming/pending/completed overview, availability status toggle, map directions, and the **Digital Vehicle Inspection Module** (`/dashboard/technician/inspections/[bookingId]`) covering all **5 categories (26 checklist items)**:
  1. Exterior Inspection (6 items)
  2. Interior Inspection (6 items)
  3. Engine Inspection (5 items)
  4. Mechanical Inspection (5 items)
  5. Documents Verification (4 items)
  Includes `Good`, `Needs Attention`, `Critical`, `Not Applicable` ratings, mobile camera photo capture, multi-photo & document uploads, draft saving, and confirmation modal before moving to `Under Review`.
- **Administrator Console (`/dashboard/admin`)**:
  - **KPIs & Analytics**: Total Bookings, Pending, Confirmed, Assigned, Completed, Total Revenue (`₹`), 7-day volume trend, status breakdown, technician performance, overdue inspection alerts.
  - **Booking Management**: Search by Booking ID (case-insensitive PostgreSQL search), filter by date/customer/vehicle/status, confirm/reject/reschedule/cancel/complete, direct status transitions, and full activity audit history.
  - **Manual Technician Assignment**: Dedicated assignment view showing technician availability, contact info, specialties, and active workload.
  - **Inspection Review & PDF Report Generation (`/dashboard/admin/reviews/[bookingId]`)**: Audit checklist ratings, zoom uploaded photos, request technician corrections (`REVISION_REQUESTED`), reject, or approve & issue stamped **PDF Inspection Reports** (`RPT-YYYY-XXXXXX`) via **PDFKit** with color-coded Green/Orange/Red visual ratings and embedded inspection photographs.
  - **Service, Payment & Policy Management**: Create/edit/toggle services & INR pricing, process full/partial INR refunds, manage time slots & blocked dates, configure payment options & policy windows, and audit Email/WhatsApp notification logs & contact inquiries.

---

## Supabase & Local Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Supabase PostgreSQL in `.env`**:
   In your **Supabase Dashboard → Project Settings → Database → Connection string**, copy both connection strings into `c:\nextcar\.env`:
   ```env
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
   AUTH_SECRET="nextcar-inspect-local-dev-secret-change-in-production-2026"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

3. **Push Prisma schema to Supabase & Seed Master Data**:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. **Build & Run Locally**:
   ```bash
   npm run typecheck
   npm run build
   npm run start
   ```

Visit `http://localhost:3000`.

---

## Demo Accounts (Seeded — Zero Fake Bookings)

| Role | Email | Password | Portal |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@nextcarinspect.com` | `Admin@1234` | `/dashboard/admin` |
| **Technician 1** | `marcus.tech@nextcarinspect.com` | `Tech@1234` | `/dashboard/technician` |
| **Technician 2** | `priya.tech@nextcarinspect.com` | `Tech@1234` | `/dashboard/technician` |
| **Customer** | `alex.customer@example.com` | `Customer@1234` | `/dashboard/customer` |

*(Quick demo login buttons are also available on `/login` for local evaluation.)*

---

## External Services & Optional Credentials

- **Supabase PostgreSQL**: `DATABASE_URL` (pooler) and `DIRECT_URL` (direct port 5432 for `prisma db push`).
- **Stripe (INR Payments)**: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` (uses built-in HMAC-verified Sandbox Card Checkout when unset).
- **Email Notifications (SMTP via Nodemailer)**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- **WhatsApp Notifications**: Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`) or Meta Cloud API (`WHATSAPP_CLOUD_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`).
