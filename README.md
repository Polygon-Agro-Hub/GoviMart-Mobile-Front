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
├── app/
│   └── App.tsx                 # Root application component & stack navigator
├── index.ts                    # Application entry point & Expo root registration
├── app.json                    # Expo configuration & app metadata
├── eas.json                    # EAS Build profiles
├── tailwind.config.js          # Tailwind CSS theme & plugin config
├── src/
│   ├── assets/                 # Images & Lottie animations
│   ├── component/              # Reusable UI components (common, home, cart, profile, order, payment)
│   ├── environment/            # Environment configurations (API URL, Shoutout key)
│   ├── screens/                # Screen modules (auth, home, cart, locations, order, complaints, account, etc.)
│   ├── services/               # API service layer (auth, customer, product, order, complaint)
│   ├── store/                  # Redux store & auth slice
│   └── types/                  # TypeScript interface & navigation parameter definitions
```

---

## 🛡 Security & Best Practices

- Secret keys are loaded dynamically via `expo-constants` / environment variables (`.env`).
- User passwords are **never** persisted in local storage.
- Authentication tokens are managed through Redux store state with automatic Axios request interceptor injection.
