# FieldTrack

Production-ready MERN stack application for employee attendance, GPS-based field activity tracking, store visits, product collection, and administrative reporting.

## Project Overview

FieldTrack is a full-stack web application that helps businesses track their field employees' attendance, GPS routes, store visits, and product collections. It provides a comprehensive admin dashboard for reporting and management, and a mobile-first employee interface for check-in/check-out, GPS tracking, and store visit recording.

### Key Features

- **Role-based access control** (Admin and Employee roles)
- **JWT authentication** with secure HTTP-only cookies
- **Google OAuth** for employee registration (admin approval required)
- **Working sessions** with multiple sessions per day
- **Real-time GPS tracking** with Haversine distance calculation
- **Store visit recording** with product line items and price snapshots
- **Offline support** with IndexedDB queuing and auto-sync
- **Admin dashboard** with summary cards, charts, and live activity
- **Comprehensive reports** with PDF, Excel, and CSV exports
- **Audit logging** for all administrative actions

## Architecture

```
fieldtrack/
├── src/                    # React frontend (Vite)
│   ├── api/                # Axios client and API services
│   ├── components/         # Reusable UI components
│   ├── contexts/           # React contexts (Auth)
│   ├── lib/                # Offline DB, utilities
│   ├── pages/              # Page components
│   └── utils/              # Format helpers
│
├── server/                 # Node.js/Express backend
│   ├── config/             # Database and constants
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Auth, error, audit middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # Express routes
│   ├── seeds/              # Database seed script
│   ├── .env.example        # Backend env template (no secrets)
│   └── index.js            # Entry point
│
└── README.md
```

## Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Recharts, Leaflet, date-fns
- **Backend**: Node.js, Express.js, Mongoose, JWT, bcrypt, Helmet, CORS, express-rate-limit
- **Database**: MongoDB Atlas
- **Exports**: ExcelJS (Excel), PDFKit (PDF), CSV (native)

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

**Never commit a real `.env` file.** It is gitignored.

1. Copy the template:
   ```bash
   cp server/.env.example .env
   ```
2. Fill in your own values locally (MongoDB URI, JWT secret, Google Client ID, etc.).
3. Frontend Vite variables use the `VITE_` prefix (see comments in `server/.env.example`).

Required categories (names only — see `server/.env.example` for the full list):

| Area | Examples (keys only) |
|------|----------------------|
| Database | `MONGODB_URI` |
| Auth | `JWT_SECRET`, `JWT_EXPIRES_IN`, `GOOGLE_CLIENT_ID` |
| App | `CLIENT_URL`, `PORT`, `NODE_ENV` |
| Frontend | `VITE_API_URL`, `VITE_APP_NAME`, `VITE_GOOGLE_CLIENT_ID` |

### 3. MongoDB Atlas Setup

1. Create a cluster in [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user and allow network access for your IP / host
3. Copy the connection string into your local `.env` as `MONGODB_URI`

### 4. Run the Application

Open **two terminals**:

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend (project root)
npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000  

Vite proxies `/api` to the backend in development.

### 5. Seed the Database (local only)

```bash
cd server
npm run seed
```

This creates sample admin/employee users, stores, products, and visits for development.

Demo login details are printed **only in your terminal** after seeding. Do not publish those credentials in docs, chats, or the repository.

Change all seeded passwords before any shared or production use.

### 6. Run Tests

```bash
cd server
npm test
```

## How GPS Tracking Works

1. **Check-in**: Employee grants GPS permission and checks in. A new `WorkSession` is created.
2. **Tracking**: The browser Geolocation API records points during an active session.
3. **Batching**: Points are uploaded in batches; failures queue to IndexedDB for later sync.
4. **Validation**: Backend rejects poor accuracy, impossible speed, and duplicate points.
5. **Distance**: Server calculates route distance with Haversine (including check-in/out anchors).
6. **Check-out**: Session duration and distance are finalized.

## Security Considerations

- JWT in HTTP-only cookies
- bcrypt password hashing
- Helmet security headers
- CORS configured via environment
- Rate limiting
- Input sanitization and validation
- Role-based API access
- Never commit `.env`, secrets, API keys, or real database URIs
- Use `server/.env.example` as the only shared env template

## Deployment

### Frontend (Vercel)

1. Import the GitHub repo
2. Build: `npm run build` · Output: `dist`
3. Set frontend env vars (e.g. `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`) in the host dashboard — not in git

### Backend (Render)

1. Root directory: `server`
2. Build: `npm install` · Start: `npm start`
3. Set backend env vars from `server/.env.example` in the host dashboard
4. Set `CLIENT_URL` to your production frontend origin
5. Seed only if you intentionally need sample data (prefer creating real admin accounts)

### Checklist

- [ ] No secrets in the repository
- [ ] Strong unique `JWT_SECRET` in production
- [ ] `CLIENT_URL` / CORS match the live frontend URL
- [ ] MongoDB network access allows the backend host
- [ ] Google OAuth origins match the live frontend domain(s)

## API Structure

All APIs are under `/api/v1`:

| Route | Description |
|-------|-------------|
| `/auth` | Login, logout, Google OAuth, profile |
| `/employees` | Employee CRUD and approvals |
| `/sessions` | Check-in/out, session list, routes |
| `/locations` | GPS point submission |
| `/stores` | Store CRUD |
| `/products` | Product CRUD |
| `/visits` | Store visit creation and listing |
| `/reports` | Employee/store/product/date reports |
| `/dashboard` | Summary, live activity, charts |
| `/audit` | Audit log listing |
| `/settings` | App settings |

### Response Format

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {}
}
```

## License

This is a proprietary client project. All rights reserved.
