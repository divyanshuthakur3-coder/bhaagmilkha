# 🏃 RunTracker

A GPS-powered personal running tracker built with **React Native**, **Expo**, and **Supabase**. Record runs via live GPS, track performance over time, set goals, earn achievements, and view rich analytics.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📍 **Live GPS Tracking** | Real-time route drawing on map with background location support |
| ⏸ **Auto-Pause** | Automatically pauses when you stop moving (< 0.5 m/s for 5s) |
| 📊 **Analytics** | Weekly distance bar chart, pace trend line, lifetime stats |
| 🎯 **Goals System** | Weekly distance, pace targets, streak goals with progress bars |
| 🏆 **Achievements** | 10 badges (First Run, 5K Finisher, Speed Demon, Century Club, etc.) |
| 📅 **Calendar Heatmap** | Monthly view showing run days with distance-based color intensity |
| 🔥 **Streak Counter** | Tracks consecutive run days on the dashboard |
| 📋 **Run History** | Scrollable list with map thumbnails, tap for full detail view |
| 🔐 **Auth** | Email/password signup, login, forgot password via Supabase Auth |
| 📶 **Offline Support** | Runs save to MMKV queue when offline, sync when back online |
| 🔊 **Audio Cues** | Km milestone announcements using expo-av |
| 📳 **Haptic Feedback** | Tactile feedback on run start, pause, stop |
| 🌙 **Dark Mode First** | #0F0F0F background with electric blue (#3B82F6) accent |
| 📐 **Unit Conversion** | Supports km and miles throughout the entire app |
| 🔥 **Calories** | MET-based formula: `MET × weight_kg × duration_hours` |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native + Expo SDK 55 |
| Routing | Expo Router (file-based) |
| Styling | NativeWind (Tailwind for RN) + StyleSheet |
| State | Zustand (4 stores) |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Maps | react-native-maps |
| Location | expo-location + expo-task-manager |
| Charts | victory-native v36.x |
| Storage | react-native-mmkv (offline queue) |
| Auth Tokens | expo-secure-store (encrypted) |
| Audio | expo-av |
| Haptics | expo-haptics |

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
├── app.json                     # Expo config + permissions + plugins
├── babel.config.js              # NativeWind + Reanimated plugins
├── tailwind.config.js           # NativeWind theme config
└── tsconfig.json                # TypeScript config with path aliases
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ installed
- **Expo CLI**: comes with `npx expo`
- A **Supabase** project ([supabase.com](https://supabase.com))
- For GPS testing: a **physical device** with Expo dev build

### 1. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of [`supabase/migration.sql`](supabase/migration.sql)
3. This creates all 5 tables with indexes, RLS policies, and realtime

### 2. Add Your Credentials

Open `lib/supabase.ts` and replace the placeholders:

```typescript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOi...your-anon-key';
```

You can find these in your Supabase dashboard under **Settings → API**.

### 3. Install Dependencies

```bash
npm install --legacy-peer-deps
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

### 6. Optional: Audio Milestone Cue

Place a short MP3 at `assets/milestone.mp3` for km milestone audio alerts. If missing, the app will silently skip audio cues.

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

**RLS**: All tables enforce `auth.uid() = user_id` — users can only access their own data.

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

Achievements are checked automatically after every run save.

---

## 🔧 Architecture Notes

### GPS Tracking Pipeline
1. `expo-location` watches position every 3s (foreground)
2. `expo-task-manager` keeps GPS alive in background
3. `useLocation` hook filters by auto-pause (speed < 0.5 m/s)
4. `useActiveRunStore` accumulates coordinates + calculates distance via Haversine
5. On stop → `douglasPeucker()` simplifies route (~80% reduction)
6. Save to Supabase (or `offlineQueue` if offline)

### Offline Strategy
- `lib/offlineQueue.ts` uses MMKV to persist pending Supabase operations
- Operations are retried on reconnection (max 5 retries)
- Run data is added to local store immediately for instant UI feedback

### Timer Accuracy
- `useRunTimer` uses `useRef` for interval ID (no re-render loops)
- Drift correction via `Date.now()` delta instead of relying on `setInterval` accuracy

---

## 📝 License

This project is for personal/educational use.
