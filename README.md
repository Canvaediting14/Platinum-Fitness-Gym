# Platinum Fitness Gym — real app starter

A mobile-first gym management app based on the supplied screenshots. It includes a dashboard, members, plans, expiry status, add/edit/delete, renewals, payment records, owner login, Firestore database integration, GitHub Pages deployment, and Capacitor Android setup.

## 1. Install

```bash
npm install
npm run dev
```

If Firebase is not configured, the app runs in demo mode with sample members.

## 2. Create Firebase

1. Open Firebase Console: https://console.firebase.google.com/
2. Create a project named `platinum-fitness-gym` (or any name).
3. Add a Web App and copy its config.
4. Enable Authentication → Sign-in method → Email/Password.
5. Create Firestore Database.
6. Publish the included `firestore.rules`.
7. Create `.env` from `.env.example` and paste the Firebase Web App values.

Example `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Firebase web configuration values are intended for client-side initialization; database access is protected by Firestore Security Rules.

## 3. Run

```bash
npm run dev
```

Create an owner account from the sign-in screen. Each member/payment document is linked to that Firebase user's UID.

## Firestore structure

- `members/{memberId}`: ownerId, name, phone, plan, fee, start, expiry, createdAt, updatedAt
- `payments/{paymentId}`: ownerId, memberId, amount, date, type, createdAt
- `settings/{ownerUid}`: gymName and future gym settings

## 4. GitHub Pages

Add these GitHub repository secrets:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Then push to `main`. The included workflow builds and deploys the site.

## 5. Android APK

Install Android Studio and run:

```bash
npm run cap:add
npm run cap:open
```

For later changes:

```bash
npm run cap:sync
```

Then build an APK/AAB in Android Studio.

## Next production features

WhatsApp reminders, receipt printing, staff roles, attendance, expense tracking, analytics, automatic backups, Razorpay/UPI payment integration, and push notifications can be added on top of this structure.
