# Firebase Setup Instructions

## Overview

This project uses Firebase Firestore for data storage. Follow these steps to configure Firebase for your deployment.

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Firestore Database in your project

## 2. Configure Environment Variables

Create a `.env.local` file in the project root with your Firebase credentials:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

You can find these values in:
- Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

## 3. Deploy Firestore Indexes

The project requires composite indexes for efficient queries. These are already defined in `firestore.indexes.json`.

### Option A: Deploy via Firebase CLI (Recommended)

1. Install Firebase CLI if not already installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project (if not already done):
   ```bash
   firebase init firestore
   ```
   - Select your Firebase project
   - Use existing `firestore.rules` and `firestore.indexes.json`

4. Deploy the indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Option B: Create Indexes Manually via Firebase Console

If you see the error "The query requires an index", click the link in the error message to automatically create the required index in the Firebase Console.

Required indexes are:
- **hands** collection: `table_id` (Ascending) + `created_at` (Descending)
- **players** collection: `table_id` (Ascending) + `seat` (Ascending)
- **players** collection: `table_id` (Ascending) + `user_id` (Ascending)

## 4. Deploy Firestore Security Rules

Deploy the security rules defined in `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

Or copy the contents of `firestore.rules` and paste them in:
- Firebase Console → Firestore Database → Rules

## 5. Enable Authentication

1. Go to Firebase Console → Authentication
2. Click "Get Started"
3. Enable "Anonymous" sign-in method under Sign-in providers

## 6. Configure Authorized Domains (For Production)

If you're deploying to a custom domain (like Vercel):

1. Go to Firebase Console → Authentication → Settings
2. Under "Authorized domains", add your domain:
   - `your-domain.vercel.app`
   - Any custom domains you're using

This fixes the OAuth warning about unauthorized domains.

## 7. Verify Setup

Run the development server:
```bash
npm run dev
```

Create a table and check the browser console for any Firebase-related errors.

## Troubleshooting

### "The query requires an index" Error

This means the Firestore indexes haven't been deployed yet. Follow step 3 above to deploy them.

### "Domain not authorized for OAuth operations" Warning

Add your domain to the Authorized domains list in Firebase Authentication settings (step 6).

### Build Failures

If the build fails due to network issues (e.g., Google Fonts), this is expected in some CI/CD environments. The build will work fine when deployed to Vercel or other hosting platforms with internet access.
