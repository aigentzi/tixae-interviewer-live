### THIS IS USING FIREBASE FULL CAPABILITES + NEXTJS + TYPESCRIPT + TYPESAURUS FOR A TYPE SAFE FIREBASE SDK.

### THIS IS USING PRISMA FOR A TYPE SAFE SQL DATABASE.

---

When to use firebase?

- For authentication and user management.
- When you don't need to use SQL!
- for user data, workspaces, anything that needs realtime or to just be stored queried later without any complex relations.

When to use prisma and postgres?

- When you need to use a SQL database specifically for time based data, analytics, full text search, where you don't really need realtime but instead need to query the data in a complex way.
- Most of the time you'll never expose the server to the user instead the server will do queries internally to fetch complex data queries.

---

# Dashboard with Firebase Authentication

This project is a Next.js 14+ dashboard with Firebase authentication.

## Getting Started

1. **Set up Firebase**:

   - Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   - Enable Google Authentication in the Firebase Console
   - Create a web app in your Firebase project
   - Copy your Firebase configuration

2. **Environment Variables**:
   Create a `.env.local` file in the root of the project with the following variables:

   ```
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

3. **Install Dependencies**:

   ```
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

4. **Run Development Server**:

   ```
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Access the App**:
   Open [http://localhost:3000](http://localhost:3000) with your browser

## Features

- **Authentication**: Sign in with Google
- **Protected Routes**: Only authenticated users can access the dashboard
- **User Profile**: View user information and sign out
- **Theme Support**: Toggle between light and dark mode
- **Admin System**: Role-based access control with admin panel for global settings and user management

## Admin System

This project includes a comprehensive admin system with role-based access control:

- **Three user roles**: USER (default), ADMIN, and SUPER_ADMIN
- **Admin panel** at `/admin` for managing global settings
- **User management** for promoting/demoting users (Super Admin only)
- **Global configuration** for prompts, voice settings, and transcription

### Setting up the first admin

After your first user signs up, promote them to admin using the provided script:

```bash
node scripts/set-first-admin.js user@example.com
```

For complete admin setup and usage instructions, see [docs/ADMIN_SETUP.md](docs/ADMIN_SETUP.md).

## Tech Stack

- Next.js 14+ (App Router)
- Firebase Authentication
- Tailwind CSS with shadcn UI design tokens
- TypeScript
