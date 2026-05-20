# AAmusic Native Mobile App Compilation Guide

This guide describes how to compile the AAmusic Next.js application into a native mobile app for **Android** (generating an installable `.apk` or store-ready `.aab`) and **iOS** (generating an Xcode project) using **Ionic Capacitor**.

---

## 🛠 Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Node.js** (v18 or higher)
- **For Android Development**:
  - [Android Studio](https://developer.android.com/studio)
  - Android SDK (installed via Android Studio SDK Manager)
  - Java Development Kit (JDK 17 or higher)
- **For iOS Development** (Requires a Mac):
  - macOS
  - [Xcode](https://developer.apple.com/xcode/)
  - CocoaPods (`sudo gem install cocoapods`)

---

## 📡 Option A: Dynamic Live URL Wrapper (Highly Recommended)

Since AAmusic is a dynamic app connected to Supabase and utilizes Next.js routing, the most robust way to distribute it as a mobile app is to host your web app on a platform like Vercel or Netlify, and configure Capacitor to point to that hosted URL.

### 🌟 Advantages:
- **Instant Updates**: Any changes you deploy to your live website are instantly visible to mobile users without resubmitting to the Google Play Store or Apple App Store.
- **Full Backend Compatibility**: Authentication, dynamic router states, and large audio streams work seamlessly without CORS or sandboxing issues.

### 📋 Setup Steps:

1. **Deploy your Next.js App**:
   Deploy the codebase to Vercel, Netlify, or any hosting provider. Make sure your environment variables (`NEXT_PUBLIC_SUPABASE_URL`, etc.) are configured. Let's assume your URL is `https://aamusic.vercel.app`.

2. **Install Capacitor Dependencies**:
   Run the following commands in your project root directory:
   ```bash
   npm install @capacitor/core @capacitor/cli
   ```

3. **Initialize Capacitor**:
   Initialize your app configuration by running:
   ```bash
   npx cap init AAmusic com.yourname.aamusic --web-dir=out
   ```
   *(Fill in your application name and preferred bundle identifier).*

4. **Add Platforms**:
   Install the native platforms you want to build for:
   ```bash
   # Add Android support
   npm install @capacitor/android
   npx cap add android

   # Add iOS support (macOS only)
   npm install @capacitor/ios
   npx cap add ios
   ```

5. **Configure Capacitor to Load the Live URL**:
   Open `capacitor.config.json` (or `capacitor.config.ts` if created) in the root of your project and add the `server` object. It should look like this:
   ```json
   {
     "appId": "com.yourname.aamusic",
     "appName": "AAmusic",
     "webDir": "out",
     "bundledWebRuntime": false,
     "server": {
       "url": "https://aamusic.vercel.app",
       "cleartext": true
     }
   }
   ```
   *(Replace `https://aamusic.vercel.app` with your actual live production URL).*

6. **Sync Configurations**:
   Run the sync command to apply changes to the native folders:
   ```bash
   npx cap sync
   ```

---

## 📦 Option B: Static HTML Export Build

If you want the entire app code to reside fully offline inside the device without pulling files from a live server, you can compile Next.js into static HTML/CSS/JS.

### ⚠️ Limitations:
- You must change Next.js config to `output: 'export'`.
- Dynamic routes that use server components or API endpoints will fail to build unless fully configured with client-side parameters.
- Standard images and local files work fine, but you must ensure your Supabase endpoints allow native API calls from `http://localhost` (which Capacitor uses internally).

### 📋 Setup Steps:

1. **Configure Next.js for Static Export**:
   Open `next.config.ts` (or `next.config.js`) and modify it to include `output: 'export'`:
   ```typescript
   import type { NextConfig } from "next";

   const nextConfig: NextConfig = {
     output: 'export',
     images: {
       unoptimized: true // Mandatory for static HTML exports
     }
   };

   export default nextConfig;
   ```

2. **Generate the Static Build**:
   Run the Next.js compiler to generate files:
   ```bash
   npm run build
   ```
   This creates an `out/` folder in your project root containing fully static HTML, CSS, and JS.

3. **Install and Sync Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli
   npx cap init AAmusic com.yourname.aamusic --web-dir=out
   
   # Add platforms
   npm install @capacitor/android
   npx cap add android

   # Sync compiled files into Android
   npx cap sync
   ```

---

## 🚀 Building and Running on Devices

Once Capacitor is synchronized, you can build, debug, and test the native projects directly.

### 🤖 For Android:
1. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
2. Android Studio will open the directory. Allow Gradle to sync and compile the project (this may take a few minutes on first run).
3. Connect your Android phone via USB (with USB Debugging enabled in Developer Options) or start a Virtual Device Emulator.
4. Click the **Run** button (green play icon) in Android Studio to build the app and install it directly on your device.
5. To build a shareable installer (`.apk`), go to **Build > Build Bundle(s) / APK(s) > Build APK(s)** in Android Studio. The compiled APK will be located under `android/app/build/outputs/apk/debug/app-debug.apk`.

### 🍎 For iOS:
1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```
2. In Xcode, click on the **AAmusic** project in the left sidebar, go to the **Signing & Capabilities** tab, select your Apple Developer team, and configure a bundle identifier.
3. Connect your iPhone via USB or select a Simulator.
4. Click the **Run** button (play icon) in Xcode to compile and launch the app.

---

## 🎨 Asset Generation (App Icons & Splash Screen)

To automatically generate beautiful, properly sized icons and splash screens from our custom `public/icon-512.png` logo:
1. Install the Capacitor assets tool:
   ```bash
   npm install -g @capacitor/assets
   ```
2. Run the generator to automatically format and replace icons in Android and iOS resource folders:
   ```bash
   npx capacitor-assets generate --iconIconColor "#0a0a0a" --iconBackgroundColor "#0a0a0a"
   ```
   This will immediately write all required resolutions into your mobile platforms!
