# SIP Management System

A full-stack Systematic Investment Plan (SIP) management app: Next.js + Tailwind frontend, Node.js/Express backend, MySQL database.

## Folder structure

```
sip-management-system/
├── backend/
│   ├── controllers/       # auth, sip, installment, transaction, dashboard, stock, bank
│   ├── routes/             # Express route files, one per resource
│   ├── middleware/         # auth.js (JWT check), validate.js (input validators)
│   ├── sql/schema.sql      # exact DB schema + sample stock data
│   ├── db.js                # MySQL connection pool (mysql2/promise)
│   ├── server.js            # Express app entry point
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── pages/
    │   ├── signup.js, login.js, dashboard.js, sip.js
    │   └── installments/[sipId].js
    ├── components/         # Navbar, StatCard
    ├── utils/               # api.js (axios instance + JWT interceptor), auth.js
    ├── styles/globals.css
    ├── tailwind.config.js
    ├── .env.local.example
    └── package.json
```

## 1. Database setup

```bash
mysql -u root -p < backend/sql/schema.sql
```

This creates the `sip_management` database with all 7 tables exactly as specified (`User`, `User_Phone`, `Bank_Account`, `Stock`, `SIP_Plan`, `Installments`, `SIP_Transaction`) and seeds 5 sample stocks.

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env   # then edit DB_PASSWORD and JWT_SECRET
npm run dev            # or: npm start
```

Runs on `http://localhost:5000`. Health check: `GET /`.

## 3. Frontend setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev
```

Runs on `http://localhost:3000`.

## API reference

### Auth (public)
- `POST /api/auth/signup` — `{ firstName, lastName, email, panNumber, dob, password, phone? }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`

All routes below require header `Authorization: Bearer <token>`.

### SIP
- `POST /api/sip/create` — `{ stockId, amount, frequency: "Monthly"|"Quarterly", startDate }` — auto-generates 12 (monthly) or 4 (quarterly) installments for the year
- `GET /api/sip/user/:userId`
- `PUT /api/sip/:id` — `{ status?, amount? }`
- `DELETE /api/sip/:id`

### Installments
- `GET /api/installments/:sipId`

### Transactions
- `POST /api/transaction/pay` — `{ installmentId, accountId }` — inserts into `SIP_Transaction` and marks the installment `Paid`

### Dashboard
- `GET /api/dashboard/:userId` → `{ totalInvested, activeSips, pendingInstallments }`

### Supporting endpoints (needed by the UI, not in the original spec but required to make SIP creation and payments functional)
- `GET /api/stocks` — list stocks for the "create SIP" dropdown
- `GET /api/bank/user/:userId`, `POST /api/bank/create` — manage bank accounts used to pay installments

## Business logic implemented

- Passwords hashed with bcrypt (10 salt rounds); JWT issued on signup/login, verified by `middleware/auth.js` on every private route.
- Creating a SIP wraps the `SIP_Plan` insert and the generated `Installments` rows in a single MySQL transaction (`db.js` pool → `conn.beginTransaction()/commit()/rollback()`).
- Paying an installment wraps the `SIP_Transaction` insert and the `Installments.Status = 'Paid'` update in a transaction, so a payment never partially succeeds.
- All user-scoped endpoints check that the authenticated JWT's `userId` owns the requested resource before returning/modifying data.

## Notes for a DBMS course submission

- Deliberately uses raw parameterized SQL via `mysql2/promise` (no ORM) so the schema and queries map 1:1 to what you'd present in a viva.
- `backend/sql/schema.sql` is the single source of truth for the schema — run it first.
- Foreign keys use `ON DELETE CASCADE` where a child row has no meaning without its parent (e.g. deleting a SIP removes its installments and transactions).
