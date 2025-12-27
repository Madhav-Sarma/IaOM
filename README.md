# Inventory & Order Management (IaOM)

A full-stack application for managing stores, products, inventory, staff, customers, and orders with role-based access control (admin/staff/customer).

**Tech Stack:**
- **Backend:** FastAPI, SQLAlchemy ORM, Alembic migrations, MySQL
- **Frontend:** React 18+, TypeScript, Vite, Axios, React Router
- **Authentication:** JWT-based with role (admin/staff/customer) and store scoping

---

## Features

### Backend
- **Authentication:** Sign up, login, JWT tokens with role-based access
- **Store Management:** Create and manage stores; admin-only settings (stock thresholds, currency, etc.)
- **Products & Inventory:** Create products with SKU and unit price; manage per-store inventory
- **Customers:** Create, list, and search customers by contact or email
- **Orders:** Create multi-product orders via shopping cart; status tracking (pending → confirmed → shipped/cancelled)
- **Receipts:** Grouped receipt view; edit pending orders (change inventory, quantity, cancel lines)
- **Filtering:** List orders by status, date range, and customer contact
- **Staff Management:** Create and list staff; deactivation; admin-only role control
- **Profiles:** Staff/admin can view and edit their profile (name, email, address, password)

### Frontend
- **Dashboard:** Responsive navigation with role-based menu links
- **Authentication Pages:** Sign up, login
- **Products Page:** View store products and create new ones
- **Inventory Page:** Manage product units per store
- **Customers Page:** Create, edit, list customers; view individual customer details with past orders
- **Customer Detail Page:** View customer profile and past orders; filter by status/date; view and edit receipts
- **Orders Page:** Shopping cart checkout; view all orders; filter by status/date/customer; view grouped receipts; edit/cancel pending lines
- **Staff Page:** Create and list staff; deactivation
- **Store Settings:** Admin-only settings editor
- **Profile Page:** View and edit staff/admin profile

---

## Prerequisites

- **Python 3.9+** (backend)
- **Node.js 16+** (frontend)
- **MySQL 5.7+** (or compatible database)
- **Git**

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd IaOM
```

### 2. Backend Setup

#### Install Dependencies

```bash
cd server
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

#### Configure Database

Create a MySQL database and update the connection string in `server/app/core/config.py`:

```python
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://username:password@localhost:3306/iaom_db"
```

Alternatively, set the environment variable:
```bash
# Windows (PowerShell)
$env:DATABASE_URL = "mysql+pymysql://username:password@localhost:3306/iaom_db"

# macOS/Linux
export DATABASE_URL="mysql+pymysql://username:password@localhost:3306/iaom_db"
```

#### Initialize the Database

Run Alembic migrations:

```bash
alembic upgrade head
```

#### Run the Backend

```bash
cd server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at `http://localhost:8000`

### 3. Frontend Setup

#### Install Dependencies

```bash
cd client
npm install
```

#### Configure API Client (Optional)

The frontend is pre-configured to connect to `http://localhost:8000` via [client/src/api/client.ts](client/src/api/client.ts). Update the base URL if needed:

```typescript
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'
```

#### Run the Frontend

```bash
cd client
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## Usage

### Quick Start Workflow

1. **Backend Running:** `http://localhost:8000`
2. **Frontend Running:** `http://localhost:5173`
3. **Sign Up:** Create an account (admin/staff/customer)
4. **Buy Package:** Choose a store package (if admin)
5. **Add Products:** Create products with SKU and unit price
6. **Manage Inventory:** Set units available per store
7. **Create Customers:** Add customer records
8. **Create Orders:** Use shopping cart to create multi-product orders
9. **Manage Orders:** View, filter, and edit orders; view receipts
10. **Staff & Settings:** Manage staff and store-level settings (admin only)

### API Endpoints (Summary)

**Authentication**
- `POST /api/v1/auth/signup` - Register
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Current profile
- `PUT /api/v1/auth/me` - Update profile
- `GET /api/v1/auth/staff-list` - List staff (admin/staff)
- `POST /api/v1/auth/staff` - Create staff (admin only)

**Customers**
- `GET /api/v1/customers` - List customers (admin/staff)
- `GET /api/v1/customers/{contact}` - Get customer by contact (admin/staff)
- `POST /api/v1/customers` - Create customer (admin/staff)
- `PUT /api/v1/customers/{contact}` - Update customer (admin/staff)
- `GET /api/v1/customers/check` - Check if customer exists (admin/staff)

**Products**
- `GET /api/v1/products` - List products (admin/staff)
- `POST /api/v1/products` - Create product (admin/staff)

**Orders**
- `GET /api/v1/orders` - List orders (admin/staff; filters: status, start_date, end_date, customer_contact)
- `GET /api/v1/orders/inventory` - List inventory items (admin/staff)
- `POST /api/v1/orders` - Create order (admin/staff)
- `GET /api/v1/orders/{order_id}` - Get order (admin/staff)
- `GET /api/v1/orders/{order_id}/receipt` - Get grouped receipt (admin/staff)
- `PUT /api/v1/orders/{order_id}` - Update order (admin/staff; inventory_id or order_quantity)
- `PUT /api/v1/orders/{order_id}/status` - Update order status (admin/staff)

**Store**
- `GET /api/v1/store/settings` - Get store settings (admin/staff)
- `PUT /api/v1/store/settings` - Update store settings (admin only)

---

## Project Structure

```
IaOM/
├── server/                          # FastAPI backend
│   ├── app/
│   │   ├── main.py                  # FastAPI app initialization
│   │   ├── api/                     # API route handlers
│   │   │   ├── auth_routes.py
│   │   │   ├── customer_routes.py
│   │   │   ├── product_routes.py
│   │   │   ├── order_routes.py
│   │   │   └── store_routes.py
│   │   ├── controllers/             # Business logic
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   ├── schemas/                 # Pydantic request/response models
│   │   └── core/                    # Config, database, security
│   ├── alembic/                     # Database migrations
│   ├── requirements.txt
│   └── alembic.ini
│
├── client/                          # React + TypeScript frontend
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.tsx                  # Main router
│   │   ├── api/                     # Axios client
│   │   ├── context/                 # React context (Auth)
│   │   ├── components/              # Reusable components
│   │   ├── pages/                   # Page components
│   │   │   ├── SignupPage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ProductsPage.tsx
│   │   │   ├── CustomersPage.tsx
│   │   │   ├── CustomerDetailPage.tsx
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── StaffPage.tsx
│   │   │   ├── StoreSettingsPage.tsx
│   │   │   ├── ProfilePage.tsx
│   │   │   └── ...
│   │   └── types/                   # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── README.md                        # This file
```

---

## Database Schema

**Key Tables:**
- `user` - Users (admin/staff/customer)
- `store` - Stores with settings (currency, stock thresholds, etc.)
- `person` - Customer records
- `product` - Products (with SKU, unit_price)
- `inventory` - Product inventory per store (units available)
- `order` - Orders (single inventory_id per order, with status)

**Migrations:**
- `5c96faae6689_create_tables.py` - Initial schema
- `e04652ee7305_init_schema.py` - Schema refinement
- `a12b34c56d78_add_unique_person_contact.py` - Unique constraint on person_contact
- `k7l8m9n0p1q2_add_store_settings.py` - Store settings columns

---

## Development

### Running Tests

Backend:
```bash
cd server
pytest
```

Frontend:
```bash
cd client
npm run test
```

### Building for Production

**Backend:**
```bash
# Build Docker image or run with gunicorn
gunicorn app.main:app --workers 4
```

**Frontend:**
```bash
cd client
npm run build
# Output: dist/
```

### Linting & Formatting

**Backend:**
```bash
cd server
flake8 app/
black app/
```

**Frontend:**
```bash
cd client
npm run lint
npm run format
```

---

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running: `mysql -u username -p`
- Check connection string in `server/app/core/config.py`
- Ensure database exists: `CREATE DATABASE iaom_db;`

### CORS Errors
- Backend CORS is configured for `http://localhost:5173` and `http://127.0.0.1:5173`
- Update `server/app/main.py` if running frontend on different port

### Alembic Migration Errors
- Reset migrations: `alembic downgrade base` then `alembic upgrade head`
- Create fresh migration: `alembic revision --autogenerate -m "description"`

### Frontend Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite && npm run dev`

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "feat: description"`
3. Push: `git push origin feature/your-feature`
4. Open a pull request

---

## License

This project is provided as-is for educational and development purposes.

---

## Support

For issues, questions, or suggestions, open an issue in the repository or contact the development team.

---

**Happy ordering! 🚀**
