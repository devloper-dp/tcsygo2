# TCSYGO Web Client

React web application for the TCSYGO ride-sharing platform built with Vite, React, TypeScript, and Tailwind CSS.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project set up

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Required environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_RAZORPAY_KEY_ID` - Your Razorpay key ID

3. **Start development server**:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## 📜 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## 🏗️ Tech Stack

### Core
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn UI** - Beautiful, accessible component library
- **Radix UI** - Unstyled, accessible UI primitives
- **Framer Motion** - Animation library

### State & Data
- **TanStack Query** - Data fetching and caching
- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Routing & Navigation
- **Wouter** - Lightweight client-side routing

### Maps & Location
- **Leaflet** - Interactive maps
- **OpenStreetMap** - Map tiles and routing

### Backend Integration
- **Supabase** - Authentication, database, realtime
- **Razorpay** - Payment processing

### Internationalization
- **i18next** - Multi-language support (English, Hindi, Marathi)

## 📁 Project Structure

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Shadcn UI components
│   │   └── ...          # Feature components
│   ├── pages/           # Route pages
│   │   ├── admin/       # Admin dashboard
│   │   └── ...          # Other pages
│   ├── contexts/        # React contexts (Auth, etc.)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and configurations
│   ├── types/           # TypeScript type definitions
│   ├── i18n/            # Internationalization
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tsconfig.json        # TypeScript configuration
├── tailwind.config.ts   # Tailwind CSS configuration
└── package.json         # Dependencies and scripts
```

## 🎨 Features

### For Passengers
- Search and book rides
- Real-time driver tracking
- Secure payments via Razorpay
- Rate and review drivers
- Ride history and receipts
- Multi-language support
- Saved places and favorites

### For Drivers
- Create and manage trips
- Accept/reject booking requests
- Real-time location sharing
- Earnings dashboard
- Driver verification

### For Admins
- User management
- Driver verification
- Platform analytics
- Payment monitoring
- Support ticket management

## 🔧 Configuration

### Path Aliases

The following path aliases are configured:
- `@/` - Maps to `src/`
- `@shared/` - Maps to `../shared/` (shared types)
- `@assets/` - Maps to `../attached_assets/` (generated assets)

### Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in the client code:

```typescript
// Access environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

## 🚢 Building for Production

1. **Build the application**:
```bash
npm run build
```

2. **Preview the build**:
```bash
npm run preview
```

The build output will be in `../dist/public/` directory.

## 🔐 Security

- All sensitive keys are stored in environment variables
- Supabase Row Level Security (RLS) enabled
- Client-side validation with server-side verification
- Secure payment processing via Razorpay

## 🐛 Troubleshooting

### Port already in use
If port 5173 is already in use, you can change it in `vite.config.ts`:
```typescript
server: {
  port: 3000, // Change to your preferred port
}
```

### Module not found errors
Make sure all dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors
Run type checking to see detailed errors:
```bash
npm run type-check
```

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Shadcn UI Documentation](https://ui.shadcn.com)

## 📄 License

This project is proprietary software for TCSYGO.

---

**Last Updated:** 2025-12-28
