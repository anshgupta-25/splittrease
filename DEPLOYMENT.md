# SplitEase Deployment Guide

This guide will help you deploy SplitEase to production with Firebase Authentication.

## Prerequisites

1. **Firebase Project** (already configured)
   - Project ID: `splitwise-bd5c0`
   - Make sure your Firebase project is active

2. **Netlify Account** (or any static hosting service)
   - Sign up at https://netlify.com

## Step 1: Configure Firebase for Production

### Add Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `splitwise-bd5c0`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your production domain (e.g., `your-app.netlify.app`)
5. Add localhost for testing: `localhost`

### Update OAuth Redirect URIs

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click on **Google** provider
3. Make sure your production URL is in the authorized domains list

## Step 2: Prepare for Deployment

### Environment Variables

Your `.env` file contains:
```
VITE_FIREBASE_API_KEY="AIzaSyB6hApCIm-klLA_hm5Vsyax_0Q1jooNf3s"
VITE_FIREBASE_AUTH_DOMAIN="splitwise-bd5c0.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="splitwise-bd5c0"
VITE_FIREBASE_APP_ID="1:277592669825:web:8b170c154ad942af755780"
```

**Note:** These values have fallbacks in `src/firebase.ts`, so the app will work even if environment variables aren't set.

## Step 3: Deploy to Netlify

### Option A: Deploy via Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Build your project:
```bash
npm run build
```

4. Deploy:
```bash
netlify deploy --prod
```

### Option B: Deploy via GitHub (Recommended)

1. **Push to GitHub**:
```bash
git add .
git commit -m "Production-ready build"
git push origin main
```

2. **Connect to Netlify**:
   - Go to https://app.netlify.com/
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub" and select your repository
   - Configure build settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Click "Deploy site"

3. **Set Environment Variables** (Optional - already have fallbacks):
   - Go to Site settings → Environment variables
   - Add the following:
     ```
     VITE_FIREBASE_API_KEY=AIzaSyB6hApCIm-klLA_hm5Vsyax_0Q1jooNf3s
     VITE_FIREBASE_AUTH_DOMAIN=splitwise-bd5c0.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=splitwise-bd5c0
     VITE_FIREBASE_APP_ID=1:277592669825:web:8b170c154ad942af755780
     ```

### Option C: Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard

## Step 4: Configure Firebase Authorized Domains

After deployment, you'll get a URL (e.g., `https://your-app.netlify.app`)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `splitwise-bd5c0`
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Click **Add domain**
5. Enter your production URL (without `https://`): `your-app.netlify.app`
6. Save

## Step 5: Test Authentication

1. Open your production URL
2. Click "Sign In" or "Get Started"
3. Try signing in with Google
4. The authentication popup should work correctly

## Troubleshooting

### Issue: "auth/unauthorized-domain" error

**Solution**: Add your domain to Firebase Authorized domains (see Step 4)

### Issue: Blank page after deployment

**Solution**: 
1. Check browser console for errors
2. Verify environment variables are set correctly
3. Make sure `netlify.toml` redirects are working (should already be configured)

### Issue: 404 on page refresh

**Solution**: The `netlify.toml` file already handles this with SPA redirects

### Issue: Google Sign-In popup blocked

**Solution**: 
1. The app uses popup with fallback to redirect
2. Users may need to allow popups in their browser
3. Redirect method will work as backup

## Additional Hosting Options

### Firebase Hosting

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login:
```bash
firebase login
```

3. Initialize hosting:
```bash
firebase init hosting
```
- Choose your existing project: `splitwise-bd5c0`
- Set public directory: `dist`
- Configure as single-page app: `Yes`
- Set up automatic builds: `No`

4. Build and deploy:
```bash
npm run build
firebase deploy --only hosting
```

### Other Options

- **Cloudflare Pages**: Similar to Netlify, automatic deployments from GitHub
- **AWS Amplify**: Connect your GitHub repo for automatic deployments
- **GitHub Pages**: Requires additional configuration for SPA routing

## Post-Deployment Checklist

✅ Firebase Authorized domains configured
✅ Environment variables set (or using fallbacks)
✅ Test Google Sign-In works
✅ Test page refresh doesn't break (SPA routing)
✅ Test all routes work correctly
✅ Check browser console for errors
✅ Verify build size is reasonable
✅ Test on mobile devices

## Security Notes

1. **API Keys**: The Firebase API key in the code is safe to expose (it's a public identifier, not a secret)
2. **Firebase Security Rules**: Make sure your Supabase/database has proper security rules
3. **HTTPS**: All hosting platforms use HTTPS by default
4. **Environment Variables**: While we have fallbacks, consider using environment variables for sensitive data

## Support

If you encounter issues:
1. Check Firebase Console for authentication logs
2. Check browser console for errors
3. Verify all configuration steps were completed
4. Check that your Firebase project is active and billing is enabled (if required)

## Current Configuration

- **Firebase Project**: splitwise-bd5c0
- **Authentication**: Firebase Auth with Google OAuth
- **Database**: Supabase (existing configuration)
- **Hosting**: Ready for Netlify, Vercel, or Firebase Hosting
- **Build Output**: `dist/` directory
- **Routing**: Client-side routing configured with redirects

Your app is now production-ready! 🚀
