# GEMINI.md - Project Context

## Project Overview
This is **Sigil**, a desktop application designed to manage role-playing game (JDR) sessions, characters, inventories, and skills. It features a multi-role system (Admin, MJ, Joueur) and provides real-time updates through Supabase.

### Main Technologies
- **Core:** Electron, Vite, React, TypeScript.
- **State Management:** Zustand (`src/store/useStore.ts`).
- **Backend:** Supabase (Database, Auth, Realtime).
- **Styling:** Tailwind CSS v4 (with dark/light mode support).
- **Key Libraries:** `@supabase/supabase-js`, `bcryptjs`, `crypto-js`.

## Architecture
The project follows a modular React architecture:
- `electron/`: Contains the main process and preload scripts for Electron.
- `src/components/`: Reusable UI components (buttons, inputs, layouts).
- `src/hooks/`: Custom React hooks for domain-specific logic (e.g., `useInventaire`, `useStats`).
- `src/pages/`: Main application screens, divided by role and functionality.
- `src/services/`: API layer for interacting with Supabase.
- `src/store/`: Centralized state and types (Single Source of Truth).
- `src/utils/`: Helper functions for dice rolls, formatting, and math.

## Building and Running
- **Development:** `npm run dev` (Starts the Vite dev server).
- **Build & Package:** `npm run build` (Compiles TS, builds Vite assets, and packages for Windows via `electron-builder`).
- **Linting:** `npm run lint`.

## Development Conventions
- **TypeScript:** Rigorous typing is expected. Key types are exported from `src/store/useStore.ts`.
- **State:** Use the Zustand store (`useStore`) for global state like user profile, active session, and controlled characters.
- **Database:** All data persistence is handled via Supabase services in `src/services/`.
- **Styling:** Use Tailwind utility classes. Modes are applied via classes on the root element (e.g., `.mode-dark` or `.mode-light`).
- **Component Style:** Functional components with React hooks.
- **File Naming:** PascalCase for components/pages, camelCase for hooks, services, and utils.

## Environment Variables
The application requires the following environment variables (typically in a `.env` file):
- `VITE_SUPABASE_URL`: Your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key.

## Key Files
- `package.json`: Project dependencies and scripts.
- `electron/main.ts`: Electron entry point and window management.
- `src/App.tsx`: Main React entry point with role-based routing.
- `src/store/useStore.ts`: Central state and shared types.
- `src/supabase.ts`: Supabase client initialization.
- `src/index.css`: Global styles and mode variable definitions.
