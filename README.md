# ⚙️ WedPlan — Backend API

<p align="center">
  <strong>Powering the WedPlan Wedding Planning Platform.</strong>
  <br />
  A secure REST API for wedding services, bookings, user management, and subscriptions.
</p>

<p align="center">
  <a href="https://github.com/Avijit35cse/wedplan-server">💻 Server Repository</a> •
  <a href="https://github.com/Avijit35cse/wedplan-client">🎨 Client Repository</a> •
  <a href="https://wedplan-client-avijit.vercel.app">🌐 Live Application</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-5-black?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Payments-Stripe-635BFF?logo=stripe" alt="Stripe" />
</p>

---

## ✨ Overview

The **WedPlan Backend API** is the server-side application of the WedPlan wedding planning platform.

It provides RESTful endpoints for authentication-aware user operations, wedding service management, booking workflows, administrative operations, image uploads, and Premium subscription payments.

Built with Express.js, TypeScript, and MongoDB, the API uses JWT verification and role-based authorization to protect resources and enforce access permissions.

## 🚀 Core Features

### 🔐 Authentication & Authorization
- Better Auth JWT verification.
- Token validation using JOSE.
- Role-based access control.
- Admin, Vendor, and Customer authorization.
- Blocked-account access restrictions.
- Resource ownership verification.

### 💍 Service Management
- Create and manage wedding services.
- Update and delete service listings.
- Service approval workflow.
- Vendor-specific service management.
- Admin service moderation.

### 📅 Booking Management
- Create customer booking requests.
- Retrieve booking information.
- Manage booking status.
- Vendor accept/reject operations.
- Customer booking cancellation.
- Ownership and authorization checks.

### 🛡️ Admin Operations
- User management.
- Block and unblock accounts.
- Service approval and rejection.
- Published service management.
- Platform transaction monitoring.

### 💳 Payment & Subscription
- Stripe Checkout Session creation.
- Stripe webhook signature verification.
- Verified payment event processing.
- Premium subscription activation.
- Transaction record management.

### 🖼️ Image Upload
- Authenticated image upload endpoint.
- ImgBB image hosting integration.
- Multipart form-data handling.
- Image file validation and size restrictions.

## 🧰 Technology Stack

| Category | Technologies |
|---|---|
| Runtime | Node.js |
| Backend Framework | Express.js 5 |
| Language | TypeScript |
| Database | MongoDB |
| Authentication | Better Auth JWT |
| Token Verification | JOSE |
| Payment Gateway | Stripe |
| Image Hosting | ImgBB |
| Middleware | CORS, Multer, dotenv |
| Development | tsx |
| Deployment | Vercel |

## 🏗️ Project Structure

```text
wedplan-server/
│
├── src/
│   ├── config/
│   │   └── db.ts
│   │
│   ├── middleware/
│   │   ├── authorize-role.ts
│   │   └── verify-token.ts
│   │
│   ├── routes/
│   │   ├── admin-routes.ts
│   │   ├── booking-routes.ts
│   │   ├── payment-routes.ts
│   │   ├── service-routes.ts
│   │   ├── upload-routes.ts
│   │   └── user-routes.ts
│   │
│   ├── types/
│   │   └── express.d.ts
│   │
│   └── server.ts
│
├── .gitignore
├── package.json
└── tsconfig.json
```

## ⚙️ Getting Started

### Prerequisites

- Node.js 20 or later
- npm
- MongoDB database
- Stripe test-mode account
- ImgBB API key
- Better Auth configured in the client application

### 1. Clone the Repository

```bash
git clone https://github.com/Avijit35cse/wedplan-server.git
```

### 2. Navigate to the Project

```bash
cd wedplan-server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the server project root.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string
DB_NAME=wedplan

BETTER_AUTH_URL=http://localhost:3000
CLIENT_URL=http://localhost:3000

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

IMGBB_API_KEY=your_imgbb_api_key
```

Configure any additional variables required by the actual server implementation. Replace all placeholders with your own credentials.

### 5. Start the Development Server

```bash
npm run dev
```

The backend will run at:

```text
http://localhost:5000
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Compile TypeScript |
| `npm start` | Start the production server |

## 🔐 Security Architecture

Security is enforced on the backend, not only through frontend route protection.

- JWTs are verified before accessing protected endpoints.
- User identity and role are obtained from verified token claims.
- Role-based middleware restricts protected operations.
- Blocked users are denied access to protected features.
- Resource ownership is checked before authorized modifications.
- Stripe secret credentials remain on the server.
- Webhook signatures are verified before payment processing.

## 💳 Stripe Payment Workflow

WedPlan uses Stripe Checkout for Premium Vendor subscriptions.

```text
Vendor requests Premium upgrade
             |
             v
Backend creates Checkout Session
             |
             v
Vendor completes Stripe Checkout
             |
             v
Stripe sends webhook event
             |
             v
Backend verifies webhook signature
             |
             v
Verified event updates subscription
             |
             v
Transaction record is stored
```

The backend does not rely on the frontend success page to activate Premium access.

## 🗄️ Database Collections

The application uses MongoDB for authentication and business data.

| Collection | Purpose |
|---|---|
| `user` | Better Auth user records and profile information |
| `services` | Wedding service listings |
| `bookings` | Customer booking requests |
| `transactions` | Subscription payment records |

## 🖼️ Image Upload

The backend provides an authenticated image upload endpoint.

- Uses multipart form-data.
- Accepts an image file.
- Validates image upload requests.
- Uploads images to ImgBB.
- Returns the hosted image information to the client.

## 🚀 Deployment

The backend is deployed separately from the Next.js frontend.

For production deployment:

1. Configure MongoDB connection details.
2. Configure Better Auth production URL.
3. Configure the frontend origin for CORS.
4. Add Stripe secret and webhook signing credentials.
5. Add the ImgBB API key.
6. Configure the Stripe webhook endpoint.
7. Verify the deployed API and frontend integration.

## 🔒 Environment Security

Never commit `.env` files or private credentials.

Keep the following values in environment variables:

- MongoDB connection string.
- Stripe secret key.
- Stripe webhook signing secret.
- ImgBB API key.
- Application URLs and authentication configuration.

## 🔗 Related Links

- **Client Repository:** https://github.com/Avijit35cse/wedplan-client
- **Server Repository:** https://github.com/Avijit35cse/wedplan-server
- **Live Application:** https://wedplan-client-avijit.vercel.app

## 👨‍💻 Author

**Avijit Barua**

- GitHub: [@Avijit35cse](https://github.com/Avijit35cse)
- LinkedIn: [Avijit Barua](https://linkedin.com/in/avijit-barua-dev)

---

<p align="center">
  <strong>WedPlan Backend API</strong>
  <br />
  Built with care to make wedding planning easier.
</p>
