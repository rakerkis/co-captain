# Co-Captain - Technical Specification

> Student Productivity App — Syncing Google Calendar, Outlook Calendar & Canvas LMS

---

## 1. Project Overview

**Project Name:** Co-Captain  
**Type:** Cross-platform Mobile/Web Application  
**Core Function:** A unified calendar and productivity app for students that aggregates events from Google Calendar, Outlook Calendar, and Canvas LMS, while providing GPA tracking, course management, assignment tracking, and a focus timer.

**Target Users:** College/University students and parents (observer accounts) using Canvas LMS, Google Calendar, and/or Outlook Calendar

**Origin:** Initially prototyped in Lovable, then extended and rebuilt into a full cross-platform app.

---

## 2. Tech Stack

| Layer              | Technology                                                  |
| ------------------ | ----------------------------------------------------------- |
| **Frontend**       | React 18, TypeScript, Tailwind CSS 3, shadcn/ui (Radix UI) |
| **Build Tool**     | Vite 5                                                      |
| **Mobile**         | Capacitor 8 (iOS + Android from single codebase)            |
| **Backend**        | Supabase (Auth, PostgreSQL, Edge Functions)                  |
| **State Mgmt**     | TanStack React Query v5                                     |
| **APIs**           | Google Calendar API, Microsoft Graph API, Canvas LMS REST API |
| **Secure Storage** | Capacitor SecureStoragePlugin (Keychain on iOS, Keystore on Android) |
| **Forms**          | React Hook Form + Zod validation                            |
| **Icons**          | Lucide React                                                |

---

## 3. UI/UX Specification

### Theme

The app supports **dark** and **light** themes. Dark is the default. Theme preference is persisted in `localStorage` and applied via CSS class on `<html>`.

### Layout

- **Desktop/Web:** Sidebar navigation on the left with user profile and logout
- **Mobile (iOS/Android):** Bottom tab bar with 6 navigation items
- Platform detection via `Capacitor.isNativePlatform()` determines which layout to render

### Typography
- **Font Family:** System default (San Francisco on iOS, Roboto on Android)
- **Headings:** H1: 28px Bold, H2: 22px SemiBold, H3: 18px Medium
- **Body:** 16px Regular
- **Caption:** 14px Regular

### Spacing System (8pt grid)
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

### Toast Notifications
- Auto-dismiss after 3 seconds
- Used for sync status, connection success/failure, and save confirmations

---

## 4. Page Specifications

### 4.1 Calendar (Home Page)

**Purpose:** Unified view of all calendar sources — Google, Outlook, Canvas assignments, Canvas calendar events, and custom assignments.

**Views:** Month, Week, Day, Schedule (selectable via dropdown)

**Features:**
- Monthly grid with color-coded event dots
- Week view with hourly time slots
- Day view with hourly breakdown
- Schedule view (chronological event list)
- Tap any date in month view to drill into day view
- Pull-to-refresh on native to sync all sources
- Event detail panel on tap
- Assignment completion toggle from calendar
- Source icons (Canvas, Google, Outlook, custom)
- Course visibility filtering (via Courses page settings)

**Data Sources:**
- `useCanvasAssignments()` — unsubmitted Canvas assignments
- `useCanvasCalendarEvents()` — Canvas calendar events (3 months forward, 1 week back)
- `useGoogleCalendarEvents()` — Google Calendar events
- `useOutlookCalendarEvents()` — Outlook Calendar events
- `useCustomAssignments()` — user-created assignments/events

**Data Structure:**
```typescript
type CombinedAssignment = {
  id: number | string;
  name: string;
  due_at: string | null;
  course_name: string;
  course_code: string;
  course_id?: number;
  priority: "high" | "medium" | "low";
  html_url: string;
  completed?: boolean;
  isCustom: boolean;
  isGoogleEvent: boolean;
  isCanvasEvent: boolean;
  isOutlookEvent: boolean;
  description?: string;
};
```

---

### 4.2 Assignments Page

**Purpose:** Focused list of all assignments with creation and management.

**Features:**
- Canvas assignments synced automatically (unsubmitted only)
- Create custom assignments with title, description, due date, priority, and type
- Edit and delete custom assignments
- Mark assignments as complete (stored in Supabase `assignment_completions` table)
- Priority badges: High (red), Medium (yellow), Low (green)
- Link to open assignment in Canvas
- Type override: switch between assignment and event display
- Filters out overdue assignments older than 1 week
- Respects course visibility settings

**Data Structure:**
```typescript
interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  course_name: string;
  course_code: string;
  course_id?: number;
  priority: "high" | "medium" | "low";
  html_url: string;
  completed?: boolean;
}

interface CustomAssignment {
  id: string;
  name: string;
  due_at: string | null;
  course_name: string | null;
  description: string | null;
  links: string | null;
  priority: "high" | "medium" | "low";
  type: "assignment" | "event";
  completed: boolean;
  user_id: string;
}
```

---

### 4.3 GPA Page

**Purpose:** Display current grades from Canvas with automatic GPA calculation.

**Features:**
- Overall GPA on 4.0 scale (displayed prominently at top)
- Per-course letter grade and percentage score
- Pass/Fail toggle per course (excluded from GPA calculation)
- Supports observer (parent) accounts — detects `ObserverEnrollment` and fetches observed student's grades via `associated_user_id`
- Grade letter calculation from numeric score

**Data Structure:**
```typescript
interface CanvasCourseWithGrades {
  id: number;
  name: string;
  course_code: string;
  html_url: string;
  current_grade: string | null;
  current_score: number | null;
}
```

---

### 4.4 Courses Page

**Purpose:** Display enrolled Canvas courses with per-course display settings.

**Features:**
- Grid of course cards with color-coded indicators
- Click course to open in Canvas
- Per-course settings popover:
  - **Course Color** — pick from 12 color palette (persisted in localStorage)
  - **Show on calendar** — toggle course visibility on Calendar page
  - **Show assignments** — toggle course visibility on Assignments page
  - **Treat as event** — display assignments as calendar events instead of tasks

**Data Structure:**
```typescript
interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  html_url: string;
  current_grade?: string | null;
  current_score?: number | null;
}
```

---

### 4.5 Focus Page

**Purpose:** Built-in Pomodoro timer for productivity.

**Features:**
- 25-minute focus session (default, customizable)
- 5-minute break (default, customizable)
- Circular progress ring with countdown
- Auto-switch between focus and break
- Play/Pause/Reset controls
- Settings dialog for custom durations

---

### 4.6 Settings Page

**Purpose:** Connect and manage calendar/LMS accounts, sync settings, and appearance.

**Sections:**

#### Canvas LMS
- **Not connected:** Domain input (default: `canvas.instructure.com`) + API token input + Connect Canvas button
- **Connected:** Shows connected domain + Disconnect button + inline Test button
- QR code scanner for token input (native only, via `@capacitor/barcode-scanner`)
- Domain input: `autoCapitalize="none"`, `autoCorrect="off"` for iOS
- Token masked after save (first 6 chars + dots)

#### Google Calendar
- Connect via OAuth 2.0 (Supabase Auth with PKCE)
- Shows "Signed in as" with email when connected
- Disconnect + inline Test button
- Auto-reconnect guard: `google-calendar-disconnected` localStorage flag prevents re-auth after explicit disconnect

#### Outlook Calendar
- Connect via client-side PKCE OAuth (Microsoft identity platform)
- Shows "Signed in as" with email when connected
- Disconnect + inline Test button
- Independent of Supabase session

#### Sync Settings
- Auto-sync toggle
- Sync interval (1–60 minutes)
- Auto-saves on change (no Save button)

#### Appearance
- Dark / Light theme toggle (dark is default)

**Data Structure:**
```typescript
interface SettingsData {
  canvasDomain: string;
  canvasToken: string;
  autoSync: boolean;
  syncInterval: number;
  googleConnected: boolean;
  googleEmail: string;
  outlookConnected: boolean;
  outlookEmail: string;
}
```

---

## 5. API Integration

### 5.1 Canvas LMS

**Auth:** User-provided API token (stored in secureStorage)

**Base URL:** `https://{domain}/api/v1`

**Transport:**
- **Native (iOS/Android):** Direct API calls via `CapacitorHttp.get()` — bypasses WKWebView CORS enforcement
- **Web:** Supabase Edge Function `canvas-proxy` as CORS proxy

**Endpoints Used:**
- `GET /courses?enrollment_state=active&per_page=100` — List enrolled courses
- `GET /courses/{id}/assignments?per_page=100&include[]=submission` — List assignments with submission status
- `GET /users/self/enrollments?per_page=100&state[]=active` — Get enrollments with grades
- `GET /users/{id}/enrollments?per_page=100&state[]=active` — Get observed student's enrollments (observer accounts)
- `GET /calendar_events?type=event&start_date=...&end_date=...` — Calendar events

**Observer Account Support:**
- Detects all enrollments are `ObserverEnrollment` type
- Extracts `associated_user_id` from first enrollment
- Fetches observed student's `StudentEnrollment` records for grade data

### 5.2 Google Calendar

**Auth:** OAuth 2.0 via Supabase Auth (PKCE flow)

**Token Storage:** `google_calendar_tokens` table in Supabase PostgreSQL

**Flow:**
1. Supabase Auth initiates Google OAuth with `calendar.events.readonly` scope
2. Native: Opens native Safari; Web: Standard redirect
3. Callback handled by `appUrlOpen` (native) or URL params (web)
4. Provider token + refresh token stored in database
5. Token auto-refresh via Supabase Edge Function `google-calendar-auth`

**Endpoints Used:**
- `GET https://www.googleapis.com/calendar/v3/calendars/primary/events` — List events

### 5.3 Outlook Calendar

**Auth:** Client-side PKCE OAuth (Microsoft identity platform v2.0)

**Token Storage:** `secureStorage` (Keychain/Keystore on native, localStorage on web)

**Flow:**
1. Generate PKCE code verifier + challenge
2. Open Microsoft authorization URL with `Calendars.Read` scope
3. Callback: Exchange authorization code for access + refresh tokens
4. Tokens stored locally (no Supabase dependency)
5. Auto-refresh on token expiration

**Endpoints Used:**
- `GET https://graph.microsoft.com/v1.0/me/calendarView` — List events in date range
- `GET https://graph.microsoft.com/v1.0/me` — Get user profile (email)

---

## 6. Data Flow

```
┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
│   Google     │  │   Outlook    │  │   Canvas     │  │  Supabase   │
│  Calendar    │  │  Calendar    │  │     LMS      │  │  Database   │
│  (OAuth)     │  │  (PKCE)      │  │  (API Token) │  │  (Auth+DB)  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘
       │                 │                 │                  │
       ▼                 ▼                 ▼                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   TanStack React Query (Cache Layer)                 │
│                                                                      │
│  Query Keys:                                                         │
│  - canvas-assignments    - google-calendar-events                    │
│  - canvas-courses        - outlook-calendar-events                   │
│  - canvas-calendar-events - custom-assignments                       │
│                                                                      │
│  Stale Time: 5 minutes    Invalidation: pull-to-refresh, mutations   │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         React UI Layer                               │
│                                                                      │
│  Desktop: Sidebar + Content     Mobile: Content + Bottom Tab Bar     │
│  Pages: Calendar, Assignments, GPA, Courses, Focus, Settings         │
└──────────────────────────────────────────────────────────────────────┘
```

**Local Storage:**
- Theme preference, hidden courses, assignment type overrides, course event settings, pass/fail courses, custom course colors, auth debug log

**Secure Storage (Keychain/Keystore):**
- Canvas credentials (domain + token), Outlook tokens, app settings

**Supabase Database:**
- `google_calendar_tokens` — Google OAuth tokens per user
- `custom_assignments` — User-created assignments/events
- `assignment_completions` — Canvas assignment completion tracking

---

## 7. Project Structure

```
co-captain/
├── src/
│   ├── App.tsx                    # Routing, auth, OAuth callbacks, sync logic
│   ├── main.tsx                   # Vite entry point, theme initialization
│   ├── components/
│   │   ├── AuthForm.tsx           # Google OAuth sign-in form
│   │   ├── Sidebar.tsx            # Desktop navigation + user profile
│   │   ├── MobileTabBar.tsx       # Mobile bottom tab bar
│   │   └── ui/                    # 50+ shadcn/ui components (Radix UI based)
│   ├── pages/
│   │   ├── Index.tsx              # Calendar (multi-view: month/week/day/schedule)
│   │   ├── Assignments.tsx        # Assignment list + custom assignment CRUD
│   │   ├── GPA.tsx                # GPA calculator with pass/fail
│   │   ├── Courses.tsx            # Course grid with color/visibility settings
│   │   ├── Focus.tsx              # Pomodoro timer
│   │   └── Settings.tsx           # Canvas/Google/Outlook auth, sync, theme
│   ├── hooks/
│   │   ├── useCanvasAssignments.ts     # Canvas assignment fetching + completion toggle
│   │   ├── useCanvasCourses.ts         # Canvas courses with grades
│   │   ├── useCanvasCalendarEvents.ts  # Canvas calendar events
│   │   ├── useCustomAssignments.ts     # Custom assignment CRUD (Supabase)
│   │   ├── useGoogleCalendar.ts        # Google Calendar auth + events
│   │   ├── useOutlookCalendar.ts       # Outlook Calendar auth + events
│   │   ├── useHiddenCourses.ts         # Course visibility toggles
│   │   ├── useAssignmentTypes.ts       # Assignment/event type overrides
│   │   ├── useCourseEventSettings.ts   # Treat course as events
│   │   ├── usePullToRefresh.ts         # Native pull-to-refresh gesture
│   │   ├── useTheme.ts                 # Dark/light mode
│   │   └── use-platform.ts             # Platform detection (iOS/Android/web)
│   ├── integrations/
│   │   ├── canvasApi.ts                # Canvas REST API client (native + web proxy)
│   │   ├── googleCalendar.ts           # Google Calendar OAuth + API
│   │   ├── outlookCalendar.ts          # Outlook Calendar PKCE OAuth + Graph API
│   │   ├── secureStorage.ts            # Keychain/Keystore abstraction
│   │   ├── storage.ts                  # Simple localStorage wrapper
│   │   └── supabase/
│   │       ├── client.ts               # Supabase JS client
│   │       └── types.ts                # Generated database types
│   └── lib/
│       ├── courseColors.ts             # Deterministic course color assignment
│       ├── utils.ts                    # Utility functions (cn, etc.)
│       └── version.ts                  # App version constant
├── supabase/
│   └── functions/                      # Supabase Edge Functions
│       ├── canvas-proxy/               # CORS proxy for Canvas API (web only)
│       └── google-calendar-auth/       # Google token refresh
├── ios/                                # Capacitor iOS project (Xcode)
├── android/                            # Capacitor Android project (Gradle)
├── .env                                # Supabase credentials (with setup guide)
├── capacitor.config.ts                 # Capacitor config (appId, webDir)
├── vite.config.ts                      # Vite config (port 8080, @ alias)
├── SPEC.md                             # This file
├── README.md                           # User-facing documentation
└── devlog/                             # Development logs
```

---

## 8. Milestones

### Phase 1: MVP (Completed)
- [x] Set up React project (originally prototyped in Lovable)
- [x] Settings page (Canvas token storage)
- [x] Calendar view (month/week/day/schedule)
- [x] Assignments page with Canvas sync
- [x] Courses page
- [x] Basic navigation (sidebar + mobile tab bar)

### Phase 2: Integrations (Completed)
- [x] Canvas API integration (assignments, courses, grades)
- [x] Google Calendar OAuth + event sync
- [x] Outlook Calendar PKCE OAuth + event sync
- [x] Auto-sync with configurable interval
- [x] Supabase backend (auth, database, edge functions)

### Phase 3: Mobile & Polish (Completed)
- [x] GPA calculator with observer account support
- [x] Focus timer (Pomodoro)
- [x] Capacitor iOS build
- [x] Capacitor Android build
- [x] Dark/light theme toggle
- [x] Pull-to-refresh on native
- [x] QR code scanner for Canvas token
- [x] Custom assignments (Supabase-backed)
- [x] Course color customization
- [x] Course visibility toggles
- [x] Secure credential storage (Keychain/Keystore)
- [x] Canvas API performance (CapacitorHttp + parallel fetching)

---

## 9. History

The project was originally prototyped in **Lovable** (GitHub: LakeMont198/co-captain) using Vite, React, TypeScript, Tailwind, and shadcn-ui. It was then extended into a full cross-platform app with Capacitor for native iOS/Android support, Supabase for backend services, and integrations with Google Calendar, Outlook Calendar, and Canvas LMS.

---

*Last Updated: 2026-04-15*
*App Version: v26*
