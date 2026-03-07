# 🏃 RunTracker

A GPS-powered personal running tracker built with **React Native**, **Expo**, and a custom backend hosted on **Hostinger**. Record runs via live GPS, track performance over time, set goals, earn achievements, and view rich analytics.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📍 **Live GPS Tracking** | Real-time route drawing on map with background location support |
| ⏸ **Auto-Pause** | Automatically pauses when you stop moving (< 0.5 m/s for 5s) |
| 📊 **Analytics** | Weekly distance bar chart, pace trend line, lifetime stats, and performance score |
| 🎯 **Goals System** | Weekly distance, pace targets, streak goals with progress bars |
| 🏆 **Achievements** | 10 badges (First Run, 5K Finisher, Speed Demon, Century Club, etc.) |
| 📅 **Calendar Heatmap** | Monthly view showing run days with distance-based color intensity |
| 🔥 **Streak Counter** | Tracks consecutive run days on the dashboard |
| 📋 **Run History** | Scrollable list with map thumbnails, tap for full detail view |
| 🔐 **Auth** | Email/password signup, login, profile management via custom API |
| 📶 **Offline Support** | Runs save to queue when offline, sync when back online |
| 🔊 **Audio Cues** | Km milestone announcements using expo-av |
| 🛡 **Reliability** | Jest unit tests + Granular Error Boundaries to prevent app-wide crashes |
| ⌚ **Ghost Runner** | Compete against your 5K/10K Personal Best with real-time variance |
| 💹 **Fitness Ratio** | ACWR (Acute:Chronic Workload Ratio) trend chart to prevent injury |
| 👟 **Gear Retirement** | Track shoe mileage and retire shoes to keep your list clean |
| ⚡ **Performance** | Persistent Zustand stores for instant boot and offline data access |
| 📤 **Stats Sharing** | One-tap run stat sharing with a beautiful, high-impact message |
| 🔋 **Low GPS Drift** | Drift-corrected timer and distance filtering for pro-level accuracy |
| 🗺 **Route Naming** | Personalize your routes (e.g., "Morning Lake Loop") during save flow |
| 💾 **Compressed Logs** | Google Polyline encoding for 80% smaller GPS storage footprints |
| 🚀 **API v1.0** | Versioned API routing and automated weekly stats harvesting |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo SDK 53 |
| Routing | Expo Router (file-based) |
| Styling | NativeWind (Tailwind for RN) + StyleSheet |
| State | Zustand (4 stores) + Persistence (AsyncStorage) |
| Backend | Custom Node.js/MySQL API (Hostinger) |
| Maps | react-native-maps / maplibre |
| Location | expo-location + expo-task-manager |
| Charts | victory-native v36.x |
| Storage | MMKV (Zustand) / SecureStore (Tokens) |
| GPS Filter | Kalman Smoothing + Speed Outlier Rejection |
| Auth Tokens | expo-secure-store (encrypted) |
| Testing | Jest + ts-jest (Unit tests for core logic) |
| Resilience | Error Boundaries + AbortController cancellation |

---

## 📁 Project Structure

```
runtracker/
├── app/
│   ├── _layout.tsx              # Root layout with auth guard
│   ├── error.tsx                # Global error boundary
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth stack layout
│   │   ├── welcome.tsx          # Welcome screen with logo
│   │   ├── login.tsx            # Email/password login
│   │   ├── signup.tsx           # Registration + profile creation
│   │   └── forgot-password.tsx  # Password reset
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom tabs (5 tabs)
│   │   ├── index.tsx            # Dashboard / Home
│   │   ├── history.tsx          # Run history list
│   │   ├── goals.tsx            # Goals + personal records + heatmap
│   │   ├── analytics.tsx        # Charts + lifetime stats
│   │   └── profile.tsx          # Profile + settings + achievements
│   └── run/
│       ├── live-run.tsx         # Live GPS run tracking
│       └── [id].tsx             # Run detail screen
├── components/
│   ├── ui/                      # Button, Card, StatBadge, ProgressBar,
│   │                            # LoadingSkeleton, EmptyState
│   ├── charts/                  # WeeklyBarChart, PaceTrendChart,
│   │                            # CalendarHeatmap
│   └── maps/                    # LiveRunMap, RunMap
├── store/
│   ├── useUserStore.ts          # User profile state
│   ├── useActiveRunStore.ts     # Live run state (ephemeral)
│   ├── useRunHistoryStore.ts    # Run history (with offline save)
│   └── useGoalStore.ts          # Goals CRUD
├── hooks/
│   ├── useLocation.ts           # GPS + background + auto-pause
│   ├── useRunTimer.ts           # Drift-corrected timer (useRef)
│   ├── useGoalProgress.ts       # Goal progress calculations
│   └── useAudioCues.ts          # Km milestone alerts
├── lib/
│   ├── supabase.ts              # Supabase client + secure store adapter
│   ├── types.ts                 # TypeScript types (DB schema)
│   ├── haversine.ts             # GPS distance calculation
│   ├── paceCalculator.ts        # Pace + calories (MET formula)
│   ├── douglasPeucker.ts        # Route simplification algorithm
│   ├── formatters.ts            # Distance, pace, time, date formatters
│   └── offlineQueue.ts          # MMKV offline sync queue
├── constants/
│   ├── colors.ts                # Design tokens (dark theme)
│   ├── achievements.ts          # Badge definitions + check functions
│   └── goalTypes.ts             # Goal type metadata
├── supabase/
│   └── migration.sql            # Full DB schema + RLS policies
├── tests/
│   └── calculations.test.ts      # Unit tests for pace/calories/load
├── jest.config.js                # Jest testing configuration
├── app.json                     # Expo config + permissions + plugins
├── babel.config.js              # NativeWind + Reanimated plugins
├── tailwind.config.js           # NativeWind theme config
├── tsconfig.json                # TypeScript config with path aliases
└── package.json                 # Project dependencies + test scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ installed
- **Expo CLI**: comes with `npx expo`
- A custom API backend (Node.js/MySQL recommended)

### 1. Set Up Environment

Create a `.env` file in the root directory:

```text
EXPO_PUBLIC_API_BASE_URL=https://your-api-url.com
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the App

```bash
npx expo start
```

### 4. Run the App

```bash
# Start Expo dev server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on iOS simulator (macOS only)
npx expo start --ios
```

### 5. GPS & Background Location (Requires Dev Build)

Background GPS tracking does **NOT** work in Expo Go. You need a development build:

```bash
# Android
npx expo run:android

# iOS (macOS only)
npx expo run:ios
```

### 6. Testing (Core Logic)

The project includes a **Jest** suite to ensure mathematical accuracy of pace, calorie, and TRIMP (Load) calculations.

```bash
# Run all unit tests
npm test
```

### 7. Optional: Audio Milestone Cue

Place a short MP3 at `assets/milestone.mp3` for km milestone audio alerts. If missing, the app will silently skip audio cues.

---

## 🏆 Development Roadmap & Milestones

This project was built over 7 intensive phases, evolving from a basic map to a production-hardened fitness AI.

| Phase | Milestone | Key Deliverables |
|---|---|---|
| **1** | **GPS Foundation** | Background tracking, Douglas-Peucker route simplification, Live Maps |
| **2** | **Rich Analytics** | Weekly Charts, Pace Trends, Calendar Heatmaps, Elevation Tracking |
| **3** | **Security First** | Custom JWT Refresh logic, Password Reset, SecureStore integration |
| **4** | **Motivation Engine** | Goals (Distance/Streak), PR Detection, Milestone Audio Cues |
| **5** | **Performance Ops** | Reanimated Worklets for route math, Haptics, Shoe Life alerts |
| **6** | **Stability & WOW** | Granular Error Boundaries, PR Animations, Codebase Audit |
| **7** | **Intelligent Assistance** | AI Ghost Pacing (Best 5K/10K), ACWR (CTL/ATL) Fitness Trends |
| **8** | **Android Hardening** | Foreground Services, MMKV Migration, Kalman GPS Smoothing, Static Maps |
| **9** | **Motivation & UX** | Goal Templates, 10+ New Achievements, Route Naming, Polyline Compression |

---

## 🛡 Security & Hardening (Final Audit)

- **JWT Resilience**: Custom interceptors handle token expiration silently. If a token expires *during* a 2-hour run, the app refreshes in the background without interrupting the session.
- **Persistent Tracking (v1.8)**: Implemented **Android Foreground Services** via `expo-location` and `expo-task-manager` to ensure tracking persists under aggressive OS power management.
- **Fail-Safe Mapping**: Each map instance is wrapped in a dedicated Error Boundary.
- **Speed-Outlier Rejection**: GPS jumps implying >43km/h are automatically rejected to prevent distance inflation.
- **MMKV Persistence**: Migrated Zustand to **MMKV** for ~5x faster state loading and near-zero latency persistence.
- **GPS Smoothing**: Integrated a **1D Kalman Filter** to reduce polyline noise and jitter in the live GPS stream.
| 211: - **Static Map Thumbs**: Replaced live maps in history lists with static previews, reducing memory usage and eliminating scroll jank.
| 212: - **Polyline Compression (v1.9)**: GPS coordinates are now encoded using the **Google Polyline algorithm**, drastically reducing database payload sizes and API latency.
| 213: - **One-Tap Save Experience**: Redesigned the post-run summary to prioritize a "SAVE RUN" action, reducing the time from finishing a run to viewing history.
| 214: - **Automated Analytics (v1.9)**: Backend now asynchronously aggregates `weekly_stats` on every run save, enabling instant distance/pace trend rendering without expensive on-the-fly SQL joins.
| 215: - **API Versioning**: Enforced `/v1` prefix across all endpoints for production stability and easy future migrations.

---

## 📱 Screens

### Auth Flow
- **Welcome** — App logo, tagline, feature highlights, Get Started / Sign In
- **Sign Up** — Name + email + password, creates Supabase auth + user profile
- **Login** — Email + password with error handling
- **Forgot Password** — Email input, sends Supabase reset link

### Main App (5 Tabs)
- **🏠 Home** — Greeting, weekly stats, goal progress bar, streak, recent runs, Start Run FAB
- **📋 History** — FlatList of all runs with map thumbnails → detail view
- **🎯 Goals** — Active goals with progress, add goal modal, personal records, calendar heatmap
- **📊 Analytics** — Weekly distance chart, pace trend, lifetime stats, best week
- **👤 Profile** — Avatar, settings (units, weight, goal), achievements grid, sign out

### Run Screens
- **Live Run** — Full-screen map, real-time polyline, stats overlay, start/pause/stop, auto-pause banner, summary modal
- **Run Detail** — Interactive map, full stats, editable notes (auto-save), delete

---

## 🗄 Database Schema

```
users         → id, email, name, avatar_url, weekly_goal_km, preferred_unit, weight_kg, height_cm
runs          → id, user_id, started_at, ended_at, distance_km, duration_seconds, avg_pace, calories, route_coordinates (JSONB), notes
goals         → id, user_id, type, target_value, deadline, is_active
achievements  → id, user_id, badge_type, earned_at (UNIQUE on user_id + badge_type)
weekly_stats  → id, user_id, week_start, total_distance_km, total_runs, total_duration_seconds, best_pace
```

**Authorization**: All API endpoints require a valid JWT (stored in `SecureStore`). The backend ensures users can only access data where `user_id` matches their session.

---

## 🏅 Achievements

| Badge | Trigger |
|-------|---------|
| 🏃 First Steps | 1 run completed |
| 🎯 5 Runs Club | 5 runs completed |
| 🔥 10 Runs Club | 10 runs completed |
| 💎 50 Runs Club | 50 runs completed |
| 🏅 5K Finisher | Single run ≥ 5 km |
| 🥇 10K Finisher | Single run ≥ 10 km |
| 🏆 Half Marathon | Single run ≥ 21.1 km |
| ⚡ Speed Demon | Pace < 5 min/km |
| 📅 Consistent | 7-day streak |
| 💯 Century Club | 100 km total |
| 🐦 Early Bird | Run completed before 7 AM |
| 🦉 Night Owl | Run completed after 9 PM |
| 🏔 Elite Climber | Gain >100m elevation in one run |
| 🤴 Sprint King | Maintain pace < 4:15 min/km |
| 🌍 Earthbound | 1,000 km total lifetime distance |
| 🏛 Elite Centurion | 100 runs completed |
| 🛡 Persistence | 30 runs completed |
| ⚔️ Weekend Warrior | Run on both Saturday and Sunday |
| 🌀 Marathoner | Single run ≥ 42.2 km |

Achievements are checked automatically after every run save.

---

## 🔧 Architecture Notes

### GPS Tracking Pipeline
1. `expo-location` watches position every 3s (foreground)
2. `expo-task-manager` keeps GPS alive in background
3. **Accuracy Filter**: Points with `accuracy > 20m` are discarded to prevent "jitter" distance
4. `useLocation` hook filters by auto-pause (speed < 0.5 m/s)
5. `useActiveRunStore` accumulates coordinates + captures **Altitude** data
6. On stop → `douglasPeucker()` simplifies route (~80% reduction)
7. Save to API (or `offlineQueue` if offline)

### Reliability & Resilience
- **Granular Error Boundaries**: Wrap the `LiveRunMap` and history `RunMap` components. A crash in the map rendering engine will no longer kill the whole app or stop a run in progress.
- **Request Cancellation**: All API calls from `useEffect` (History, Analytics, Profile) use `AbortController` to cancel pending requests when navigating away, preventing memory leaks and state updates on unmounted components.

### Persistence Strategy
- **Zustand Persistence**: `useRunHistoryStore` and `useUserStore` are persisted via `AsyncStorage`. This enables:
  - **Instant-On**: Previous runs are visible immediately on boot while the network fetch happens in the background.
  - **Offline Resilience**: User can view their profile and history even without an active internet connection.
- **Offline Queue**: `lib/offlineQueue.ts` handles write-operations (saving runs, updating notes) when the server is unreachable.

### Timer Accuracy
- `useRunTimer` uses `useRef` for interval ID (no re-render loops)
- Drift correction via `Date.now()` delta instead of relying on `setInterval` accuracy

---

## 📝 License

This project is for personal/educational use.
