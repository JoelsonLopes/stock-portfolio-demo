# 🎨 Stock Management Demo - Portfolio Project

> **📢 PORTFOLIO DEMO VERSION** - Automotive Parts & Supplies Stock Management System

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 About This Project

This is a **sanitized portfolio version** of a production stock management system, showcasing modern web development practices and clean architecture implementation. All client-specific data and references have been removed and replaced with generic demo data.

### 🔍 Why This Project Stands Out

- ✨ **Clean Architecture** - Separation of concerns with clear domain boundaries
- 🔐 **Dual Authentication** - Custom + Supabase Auth with Row Level Security
- 📊 **Real-time Dashboard** - Live statistics and business intelligence
- 🎨 **Modern UI/UX** - Responsive design with dark mode support
- 📈 **Production-Ready** - Battle-tested in real business environment
- 🚀 **Performance Optimized** - Efficient queries and caching strategies

## 📋 Overview

A comprehensive web application built with Next.js 15 for managing automotive parts inventory. Features include:

- Complete authentication and authorization system
- Product catalog with search and filtering
- Equivalences mapping for product codes
- Order management with bulk operations
- PDF and Excel export capabilities
- CSV data import functionality
- Real-time dashboard with business metrics

## 🏗️ Architecture

This project follows **Clean Architecture** principles with clear separation of responsibilities:

```
src/
├── modules/
│   ├── auth/              # Authentication Module
│   │   ├── domain/        # Business entities & rules
│   │   ├── application/   # Use cases
│   │   └── infrastructure/# Implementations (Supabase)
│   ├── inventory/         # Inventory Module
│   │   ├── domain/        # Product entities
│   │   ├── application/   # Queries & use cases
│   │   └── infrastructure/# Supabase repositories
│   └── clients/           # Clients Module
│       └── [similar structure]
└── shared/               # Shared Code
    ├── domain/           # Base entities
    ├── infrastructure/   # Database, validation, session
    └── presentation/     # Reusable UI components
```

### 🔑 Key Architectural Decisions

1. **Domain-Driven Design**: Each module owns its business logic
2. **Dependency Inversion**: Infrastructure depends on domain, not vice versa
3. **Repository Pattern**: Abstraction over data access
4. **Use Case Pattern**: Encapsulated business operations
5. **DTOs**: Clear boundaries between layers

## 🚀 Tech Stack

### Core Technologies

- **[Next.js 15.2.4](https://nextjs.org/)** - React framework with App Router
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[React 18](https://react.dev/)** - UI library

### Backend & Database

- **[Supabase](https://supabase.com/)** - PostgreSQL database with real-time capabilities
- **[@supabase/ssr](https://supabase.com/docs/guides/auth/server-side/nextjs)** - Server-side rendering support
- **Row Level Security (RLS)** - Database-level authorization

### UI & Styling

- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Radix UI](https://www.radix-ui.com/)** - Accessible component primitives
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful component library
- **[Lucide Icons](https://lucide.dev/)** - Modern icon library
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Dark mode support

### Forms & Validation

- **[React Hook Form](https://react-hook-form.com/)** - Performant form management
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **[@hookform/resolvers](https://react-hook-form.com/get-started#SchemaValidation)** - Integration layer

### State Management

- **[TanStack Query](https://tanstack.com/query)** (React Query) - Server state management
- **React Context** - Global application state

### Development Tools

- **[ESLint](https://eslint.org/)** - Code linting
- **[Husky](https://typicode.github.io/husky/)** - Git hooks
- **[Commitlint](https://commitlint.js.org/)** - Commit message validation
- **[PostCSS](https://postcss.org/)** - CSS processing

## ✨ Features

### 🔐 Authentication & Authorization

- ✅ Secure login/logout system
- ✅ Session management with automatic expiry
- ✅ Forced password change for first login
- ✅ User access control
- ✅ Row Level Security at database level

### 📦 Product Management

- ✅ Comprehensive product catalog
- ✅ Advanced search and filtering
- ✅ Bulk CSV import
- ✅ Stock level tracking
- ✅ Price management
- ✅ Product grouping and categorization

### 🔄 Product Equivalences

- ✅ Code equivalence mapping
- ✅ Bulk import from CSV
- ✅ Integrated search across equivalences
- ✅ Smart import with conflict resolution

### 📝 Order Management

- ✅ Create and edit orders
- ✅ **Bulk product addition** - Add multiple products at once
- ✅ Automatic discount calculation
- ✅ Real-time order totals
- ✅ Order status tracking
- ✅ Payment conditions management
- ✅ Shipping rate calculation

### 📊 Dashboard & Reports

- ✅ Real-time business metrics
- ✅ Monthly sales statistics
- ✅ Top products tracking
- ✅ Order analytics
- ✅ PDF export for orders
- ✅ Excel export for price lists

### 🎨 User Interface

- ✅ Fully responsive design
- ✅ Dark/light theme toggle
- ✅ Accessible components (WCAG compliant)
- ✅ Loading states and feedback
- ✅ Toast notifications
- ✅ Mobile-optimized navigation

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ installed
- **npm**, **pnpm**, or **yarn** package manager
- **Supabase** account (free tier works great)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/stock-portfolio-demo.git
cd stock-portfolio-demo
```

2. **Install dependencies**

```bash
npm install
# or
pnpm install
# or
yarn install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

4. **Run database migrations**

Execute the SQL files in `supabase/migrations/` in your Supabase project:

```bash
# Option 1: Using Supabase CLI
npx supabase db push

# Option 2: Manual execution
# Copy and paste SQL from migration files in Supabase SQL Editor
```

5. **Seed demo data** (Optional)

```bash
# Run the seed script (to be created)
npm run seed:demo
```

6. **Start development server**

```bash
npm run dev
```

7. **Open the application**

Navigate to [http://localhost:3000](http://localhost:3000)

### 🔑 Demo Credentials

```
Username: demo
Password: Demo123!
```

## 📁 Project Structure

```
stock-portfolio-demo/
├── .husky/                 # Git hooks configuration
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/        # Auth route group
│   │   ├── (dashboard)/   # Dashboard route group
│   │   └── api/           # API routes
│   ├── modules/           # Domain modules
│   │   ├── auth/
│   │   ├── inventory/
│   │   └── clients/
│   ├── presentation/      # UI components
│   │   ├── components/
│   │   ├── hooks/
│   │   └── providers/
│   └── shared/            # Shared code
│       ├── domain/
│       ├── infrastructure/
│       └── presentation/
├── supabase/
│   └── migrations/        # Database migrations
├── docs/                  # Documentation
├── scripts/               # Utility scripts
├── .env.example          # Environment template
├── commitlint.config.js  # Commit message rules
└── package.json
```

## 📚 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Lint code with ESLint
npm run type-check   # Run TypeScript compiler check
```

## 🗄️ Database Schema

### Main Tables

- **custom_users** - User authentication and profile
- **products** - Product catalog
- **equivalences** - Product code equivalences
- **clients** - Customer information
- **orders** - Order headers
- **order_items** - Order line items
- **discounts** - Discount rules
- **payment_conditions** - Payment terms
- **product_groups** - Product categorization

### Security Features

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Bcrypt password hashing
- ✅ Performance indexes on key columns
- ✅ Foreign key constraints for data integrity

## 🎓 Learning Highlights

This project demonstrates:

1. **Clean Architecture** in a real-world Next.js application
2. **Server-Side Rendering** with App Router and server components
3. **Database Design** with RLS and proper indexing
4. **Type Safety** throughout the stack
5. **Modern React Patterns** (hooks, context, query)
6. **Responsive Design** with mobile-first approach
7. **Performance Optimization** techniques
8. **Security Best Practices** for authentication and authorization

## 🔐 Security

- Environment variables never committed to git
- RLS policies at database level
- Bcrypt for password hashing
- Session-based authentication
- HTTPS only in production
- CORS protection
- Input validation with Zod

## 📊 Performance

- Server components for reduced client bundle
- Optimized database queries with indexes
- React Query for caching
- Lazy loading of heavy components
- Image optimization with Next.js Image

## 🤝 Contributing

This is a portfolio project, but suggestions and feedback are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit with conventional commits (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

**Portfolio Demo** - For demonstration purposes only

**Important Note:** This is a sanitized version of a production system. All client-specific data, company names, and sensitive information have been removed and replaced with generic demo data.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Components from [shadcn/ui](https://ui.shadcn.com/)
- Backend by [Supabase](https://supabase.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**⭐ If you found this project interesting, please consider giving it a star!**

Made with ❤️ for portfolio demonstration purposes.
