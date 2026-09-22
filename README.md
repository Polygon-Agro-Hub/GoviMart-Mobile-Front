# GoviMart Mobile — Frontend Application

React Native (Expo SDK 54) mobile application for **GoviMart / Polygon**, an agricultural produce marketplace application supporting retail and wholesale users.

---

## 🛠 Tech Stack

- **Framework**: React Native (`0.81.5`), React (`19.1.0`), Expo (`~54.0.0`)
- **Navigation**: `@react-navigation/native` & `@react-navigation/stack` (v7)
- **Styling**: NativeWind (`4.2.3`), TailwindCSS (`3.3.2`)
- **State Management**: Redux Toolkit (`@reduxjs/toolkit` `2.12.0`), React Redux (`9.3.0`)
- **Storage**: `@react-native-async-storage/async-storage`
- **HTTP Client**: Axios (`1.12.2`)
- **Icons & Animation**: `@expo/vector-icons`, `lottie-react-native`, `react-native-reanimated`

---

## 🚀 Getting Started

### 1. Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Expo Go app on iOS/Android or an emulator/simulator

### 2. Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Fill in the required environment variables:
   - `SHOUTOUT_API_KEY`: Your Shoutout SMS gateway API key.

3. Configure `API_BASE_URL` in `src/environment/environment.ts` for your target environment (Local, Dev, UAT, or Prod).

### 3. Installation

```bash
npm install
```

### 4. Running the Application

```bash
# Start Expo development server
npm run start

# Run on Android emulator/device
npm run android

# Run on iOS simulator
npm run ios
```

---

## 📂 Project Structure

```
GoviMart-Mobile-Front/
├── .expo/                      # Expo development build files
├── assets/                     # Images, icons, and animations
├── src/
│   ├── component/              # Reusable UI components
│   │   ├── common/             # Common shared components (Headers, Modals, Toasts)
│   │   ├── home/               # Marketplace home components & banners
│   │   ├── my-cart/            # Shopping cart cards & summaries
│   │   ├── order/              # Order details & summary widgets
│   │   ├── payment/            # Payment option cards & forms
│   │   └── coupon/             # Coupon cards & modals
│   ├── constants/              # System constants & user roles
│   ├── environment/            # Environment configurations (API URL, Shoutout key)
│   ├── routes/                 # Navigation stack & role-based route guarding (Routes.tsx)
│   ├── screens/                # Screen modules partitioned by user role
│   │   ├── common/             # Public & shared screens (Splash, Auth, Home, Cart, Orders, Locations)
│   │   ├── retail/             # Retail-only screens (Package review, customization, item exclusions)
│   │   └── wholesale/          # Wholesale-specific screens
│   ├── services/               # API service layer (auth, customer, product, order, notification)
│   ├── store/                  # Redux store & state slices
│   └── types/                  # TypeScript interface & navigation parameter definitions
├── app.json                    # Expo application manifest
├── eas.json                    # Expo Application Services configuration
├── package.json                # Dependency manifest
└── tsconfig.json               # TypeScript compiler configurations
```

---

## 📦 Deployment & Building

### 1. EAS Build (Cloud Build)
Make sure you have EAS CLI installed and are logged in:
```bash
npm install -g eas-cli
eas login
```

#### 📦 Build AAB (Android App Bundle for Google Play Store)
Generates an `.aab` file required for uploading/updating on Google Play Console:
```bash
eas build --platform android --profile production
```

#### 📱 Build APK (Android Package for Direct Installation / Testing)
Generates an `.apk` file for direct installation on physical Android devices for testing:
```bash
eas build --platform android --profile preview
```

---

### 2. Local Gradle Build (On Your Machine)

#### 📦 Build AAB Locally
```bash
npx expo prebuild --platform android
cd android
./gradlew bundleRelease
```
*Output path*: `android/app/build/outputs/bundle/release/app-release.aab`

#### 📱 Build APK Locally
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
*Output path*: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🛡 Security & Best Practices

- Secret keys are loaded dynamically via `expo-constants` / environment variables (`.env`).
- User passwords are **never** persisted in local storage.
- Authentication tokens are managed through Redux store state with automatic Axios request interceptor injection.

---

## 📄 License

This project is licensed under the MIT License.

Copyright (c) 2026 **Polygon Holdings Private Limited**.
