# Setup Instructions

## The Issue
You're seeing auth/database errors because the required Firebase environment variables are missing.

## Solution
Create a Firebase project, enable Anonymous Auth, and set the Firebase config in `.env.local`.

### Step 1: Create a Firebase project
1. Go to the Firebase Console.
2. Create a new project (or use an existing one).
3. Add a Web app and copy the config values.

### Step 2: Enable Anonymous Auth
1. Open Authentication -> Sign-in method.
2. Enable Anonymous sign-in.

### Step 3: Create Firestore
1. Open Firestore Database.
2. Create a database (test mode is OK for local development).

### Step 4: Create `.env.local`
Create a file named `.env.local` in the project root with:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Step 5: Run the app
```bash
npm run dev
```

## Notes
- The app creates Firestore documents automatically. It uses collections named `tables`, `players`, and `hands`.
- For production, tighten Firestore rules to authenticated users instead of test mode.
