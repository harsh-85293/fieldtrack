# FieldTrack

Production-ready MERN stack application for employee attendance, GPS-based field activity tracking, store visits, product collection, and administrative reporting.

## Project Overview

FieldTrack is a full-stack web application that helps businesses track their field employees' attendance, GPS routes, store visits, and product collections. It provides a comprehensive admin dashboard for reporting and management, and a mobile-first employee interface for check-in/check-out, GPS tracking, and store visit recording.

### Key Features

- **Role-based access control** (Admin and Employee roles)
- **JWT authentication** with secure HTTP-only cookies
- **Working sessions** with multiple sessions per day
- **Real-time GPS tracking** with Haversine distance calculation
- **Store visit recording** with product line items and price snapshots
- **Offline support** with IndexedDB queuing and auto-sync
- **Admin dashboard** with summary cards, charts, and live activity
- **Comprehensive reports** with PDF, Excel, and CSV exports
- **Audit logging** for all administrative actions
- **PWA** support for mobile installation and offline access

## Architecture

```
fieldtrack/
├── src/                    # React frontend (Vite)
│   ├── src/
│   │   ├── api/            # Axios client and API services
│   │   ├── components/     # Reusable UI components
│   │   │   ├── ui/         # Generic UI components
│   │   │   ├── admin/      # Admin-specific components
│   │   │   ├── employee/   # Employee-specific components
│   │   │   └── layout/     # Layout components
│   │   ├── contexts/       # React contexts (Auth)
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Offline DB, utilities
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Admin pages
│   │   │   ├── employee/   # Employee pages
│   │   │   └── auth/       # Auth pages
│   │   └── utils/           # Format helpers
│   ├── public/             # Static assets, PWA icons
│   └── vite.config.ts      # Vite + PWA config
│
├── server/                 # Node.js/Express backend
│   ├── config/             # Database and constants
│   ├── controllers/        # Route controllers
│   ├── middleware/          # Auth, error, audit middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # Express routes
│   ├── services/           # Business logic services
│   ├── utils/              # Geo, logger, helpers
│   ├── validators/         # Input validators
│   ├── tests/              # Jest tests
│   ├── seeds/              # Database seed script
│   └── index.js            # Entry point
│
└── README.md
```

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Recharts, Leaflet, date-fns
- **Backend**: Node.js, Express.js, Mongoose, JWT, bcrypt, Helmet, CORS, express-rate-limit
- **Database**: MongoDB Atlas
- **Exports**: ExcelJS (Excel), PDFKit (PDF), CSV (native)
- **PWA**: vite-plugin-pwa with Workbox

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- npm

### 1. Install Dependencies

```bash
# Install frontend dependencies (from project root)
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Environment Variables

All environment variables live in a single `.env` file at the **project root**. The backend reads it via Node's `--env-file` flag (no dotenv package needed).

Copy `.env` and fill in your values:

```env
# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/fieldtrack?retryWrites=true&w=majority

# Backend
NODE_ENV=development
PORT=5000
JWT_SECRET=your_very_long_secure_random_jwt_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
BUSINESS_TIMEZONE=Asia/Kolkata
DEFAULT_CURRENCY=INR
STORE_VISIT_RADIUS_METERS=250
LOCATION_MAX_ACCURACY_METERS=100
LOCATION_MAX_SPEED_KMH=160
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# Frontend
VITE_API_URL=/api/v1
VITE_APP_NAME=FieldTrack
VITE_GOOGLE_CLIENT_ID=
```

### 3. MongoDB Atlas Setup

1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster (free tier is sufficient)
3. Create a database user
4. Add your IP to the IP access list
5. Get your connection string from "Connect > Connect your application"
6. Paste it into `MONGODB_URI` in your `.env`

### 4. Run the Application

Open **two terminals**:

```bash
# Terminal 1 - Start the backend server
cd server
npm run dev

# Terminal 2 - Start the frontend dev server (from project root)
npm run dev
```

The frontend runs on http://localhost:5173 and the backend on http://localhost:5000. The Vite dev server proxies `/api` requests to the backend automatically.

### 5. Seed the Database

```bash
cd server
npm run seed
```

This creates:
- 1 administrator
- 3 employees
- 5 stores
- 10 products
- Sample sessions with GPS routes and store visits for the last 3 days

### Demo Credentials (Development Only)

| Role     | Email                   | Password         |
|----------|-------------------------|------------------|
| Admin    | admin@fieldtrack.com    | Admin@12345      |
| Employee | rahul@fieldtrack.com    | Employee@123     |
| Employee | priya@fieldtrack.com    | Employee@123     |
| Employee | amit@fieldtrack.com      | Employee@123     |

**IMPORTANT**: Change all seeded passwords before any non-development use!

### 6. Run Tests

```bash
cd server
npm test
```

Tests cover:
- Haversine distance calculation
- GPS point validation (accuracy, speed, duplicates)
- Route distance calculation
- Money conversion (minor units)
- Session business rules
- Visit totals calculation
- API route protection
- Duplicate submission prevention
- Invalid GPS rejection

## How GPS Tracking Works

1. **Check-in**: Employee grants GPS permission and checks in. A new `WorkSession` is created with check-in coordinates.
2. **Tracking**: The browser Geolocation API (`watchPosition`) records GPS points approximately every 30 seconds or after 50 metres of movement.
3. **Batching**: Points are sent to the backend in small batches (max 200 per request).
4. **Offline**: If the network fails, points are queued in IndexedDB and synced when connectivity returns.
5. **Validation**: The backend validates each point using:
   - **Accuracy filter**: Points with accuracy > 100m are rejected
   - **Speed filter**: Points implying speed > 160 km/h are rejected
   - **Duplicate filter**: Identical consecutive points are rejected
6. **Distance**: Total distance is calculated server-side using the Haversine formula on valid points only.
7. **Check-out**: Tracking stops, total duration and distance are finalized.

Rejected points are retained for audit purposes but marked with a `rejected` status and reject reason.

## PWA Installation

FieldTrack is a Progressive Web App (PWA) that can be installed on mobile devices:

### Android (Chrome)
1. Open the app URL in Chrome
2. Tap the menu (three dots)
3. Select "Install app" or "Add to Home screen"

### iOS (Safari)
1. Open the app URL in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### Desktop (Chrome/Edge)
1. Open the app URL
2. Click the install icon in the address bar

The PWA caches the application shell for offline access and OpenStreetMap tiles for map viewing offline.

## Security Considerations

- **JWT in HTTP-only cookies**: Tokens are not accessible via JavaScript
- **bcrypt password hashing**: Passwords are never stored in plaintext
- **Helmet security headers**: CSP, XSS protection, frame options
- **CORS**: Configured via environment variable
- **Rate limiting**: Prevents brute-force attacks
- **Input sanitization**: express-mongo-sanitize prevents NoSQL injection
- **Input validation**: express-validator on all endpoints
- **Role-based access control**: API and route protection by role
- **Employee deactivation**: Immediately prevents future access
- **GPS data isolation**: Employees cannot see other employees' GPS data
- **No secrets in frontend**: All credentials and secrets are server-side only

## Deployment

### Frontend (Vercel/Netlify)

1. Build the client:
   ```bash
   cd client
   npm run build
   ```
2. Deploy the `dist` folder to Vercel or Netlify
3. Set environment variable `VITE_API_URL` to your backend URL

### Backend (Render/Railway)

1. Deploy the `server` directory
2. Set all environment variables (see `.env.example`)
3. Set `NODE_ENV=production`
4. Set `CLIENT_URL` to your frontend URL
5. Run `npm run seed` if needed (first deployment only)

### MongoDB Atlas

1. Create a production database in MongoDB Atlas
2. Set the `MONGODB_URI` environment variable
3. Configure IP access list for your backend host

### HTTPS

Both Vercel/Netlify and Render/Railway provide HTTPS by default. Ensure:
- `JWT_SECRET` is a long, random string
- `CLIENT_URL` uses HTTPS
- Cookie `secure` flag is enabled (automatic in production)

## Data Accuracy Rules

- All timestamps are stored in UTC
- Display dates use the configured business timezone (default: Asia/Kolkata)
- Money is stored as integer minor units (paise) to avoid floating-point errors
- Quantities and collection values are validated as non-negative
- Distance, duration, and totals are calculated on the backend
- Historical records are never permanently deleted (soft delete only)
- Product prices are snapshotted in visit items for historical accuracy

## API Structure

All APIs are under `/api/v1`:

| Route           | Description                          |
|-----------------|--------------------------------------|
| `/auth`         | Login, logout, get me, change password |
| `/employees`    | Employee CRUD, attendance, visits    |
| `/sessions`     | Check-in/out, session list, routes   |
| `/locations`    | GPS point submission                 |
| `/stores`       | Store CRUD                           |
| `/products`     | Product CRUD                         |
| `/visits`       | Store visit creation and listing    |
| `/reports`      | Employee/store/product/date reports |
| `/dashboard`    | Summary, live activity, charts      |
| `/audit-logs`   | Audit log listing                    |
| `/settings`     | App settings                         |

### Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {},
  "meta": {}
}
```

## License

This is a proprietary client project. All rights reserved.
