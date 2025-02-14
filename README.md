# Restaurant Supply Chain Management

A web application for managing restaurant supply chains, built with React, TypeScript, and Supabase.

## Features

- **User Authentication**: Secure login and signup for restaurants and suppliers
- **Supplier Management**: View and manage supplier profiles
- **Product Catalog**: Browse products from different suppliers
- **Order Management**: Place and track orders
- **Real-time Updates**: Live order status updates

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Components**: Tailwind CSS + Shadcn/ui
- **Backend**: Supabase (PostgreSQL + Authentication)
- **State Management**: Zustand
- **Type Safety**: Generated types from Supabase schema

## Setup

1. Clone the repository
2. Remove the existing node_modules and package-lock.json if they exist:
   ```bash
   rm -rf node_modules package-lock.json
   ```
3. Install dependencies with a clean npm install:
   ```bash
   npm install
   ```
4. Create a `.env` file with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

## Common Issues

If you encounter the error `import createLucideIcon from "/node_modules/lucide-react/dist/esm/createLucideIcon.js"`, try these steps:

1. Delete node_modules and package-lock.json
2. Clear npm cache:
   ```bash
   npm cache clean --force
   ```
3. Reinstall dependencies:
   ```bash
   npm install
   ```
4. Rebuild the project:
   ```bash
   npm run build
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Database Setup

1. Create a new Supabase project
2. Run the migrations in the `supabase/migrations` folder
3. Set up Row Level Security (RLS) policies as defined in the migrations

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase project's anon/public key

## Project Structure

```
project/
├── src/
│   ├── components/     # Reusable UI components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and configurations
│   ├── pages/         # Page components
│   ├── services/      # API service functions
│   └── store/         # State management
├── supabase/
│   └── migrations/    # Database migrations
└── ...configuration files
```

## Security

- Environment variables are not committed to the repository
- Row Level Security (RLS) policies restrict data access
- Authentication tokens are securely managed by Supabase

## License

Private repository - All rights reserved
