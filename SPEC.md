# Co-Captain - Technical Specification

> Student Calendar App - Syncing Google Calendar & Canvas LMS

---

## 1. Project Overview

**Project Name:** Co-Captain  
**Type:** Cross-platform Mobile/Web Application  
**Core Function:** A unified calendar app for students that aggregates events from Google Calendar and Canvas LMS, while providing GPA tracking, course management, and focus tools.

**Target Users:** College/University students using Canvas LMS and Google Calendar

---

## 2. Tech Stack

### Frontend (Web + iOS)
- **Framework:** React + React Native (Expo)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context + AsyncStorage
- **Navigation:** React Navigation

### APIs
- **Google Calendar API** - For Google Calendar events
- **Canvas LMS API** - For assignments, courses, grades

### Backend (Future)
- Supabase or Firebase for auth persistence
- Node.js middleware for API token management

---

## 3. UI/UX Specification

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Primary | #4F46E5 | Buttons, active tabs, highlights |
| Secondary | #10B981 | Success states, completed items |
| Accent | #F59E0B | Warnings, due soon indicators |
| Background | #F9FAFB | Main background |
| Surface | #FFFFFF | Cards, modals |
| Text Primary | #111827 | Headings, main text |
| Text Secondary | #6B7280 | Labels, descriptions |
| Border | #E5E7EB | Dividers, card borders |

### Typography
- **Font Family:** System default (San Francisco on iOS, Roboto on Android)
- **Headings:** 
  - H1: 28px, Bold
  - H2: 22px, SemiBold
  - H3: 18px, Medium
- **Body:** 16px, Regular
- **Caption:** 14px, Regular

### Spacing System (8pt grid)
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

---

## 4. Page Specifications

### 4.1 Home (Calendar)

**Purpose:** Combined calendar view of Google + Canvas events

**Features:**
- Calendar view with Day/Week/Month tabs
- Color-coded events (Google = Blue, Canvas = Green)
- Event details panel on right (web) / modal (mobile)
- "Add Event" floating button

**Components:**
- `CalendarHeader` - Month/year selector, view toggle
- `CalendarGrid` - The calendar days
- `EventCard` - Single event display
- `EventDetailPanel` - Event info sidebar

**Data Structure:**
```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: 'google' | 'canvas';
  color: string;
  location?: string;
  description?: string;
  courseId?: string;
}
```

---

### 4.2 Assignments Page

**Purpose:** Display Canvas assignments with due dates

**Features:**
- List of all Canvas assignments
- Sort by due date
- Filter by course
- Search functionality
- Manual add assignment option

**Components:**
- `AssignmentCard` - Individual assignment
- `AssignmentFilters` - Course filter, status filter
- `AddAssignmentModal` - Manual entry form

**Data Structure:**
```typescript
interface Assignment {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  dueDate: Date;
  points: number;
  status: 'upcoming' | 'completed' | 'overdue';
  description?: string;
}
```

---

### 4.3 GPA Page

**Purpose:** Display term and cumulative GPA from Canvas

**Features:**
- Term GPA display (large number)
- Cumulative GPA
- Credits completed
- Course-by-course grade breakdown

**Components:**
- `GPAHeader` - Big GPA numbers
- `GradeList` - Per-course grades
- `GPABreakdown` - Visual grade distribution

**Data Structure:**
```typescript
interface Grade {
  courseId: string;
  courseName: string;
  grade: string; // A, A-, B+, etc.
  points: number;
  credits: number;
}
```

---

### 4.4 Courses Page

**Purpose:** Display enrolled courses from Canvas

**Features:**
- Course cards with instructor info
- Next class time
- Current grade in course
- Credits

**Components:**
- `CourseCard` - Individual course
- `CourseList` - Scrollable list

**Data Structure:**
```typescript
interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  nextClass?: Date;
  grade?: string;
  credits: number;
  color: string;
}
```

---

### 4.5 Focus Page

**Purpose:** Pomodoro-style focus timer

**Features:**
- 25-minute focus timer (Pomodoro)
- 5-minute short break
- 15-minute long break
- Start/Pause/Reset controls

**Components:**
- `TimerDisplay` - Large countdown
- `TimerControls` - Play, pause, reset
- `SessionCounter` - Completed pomodoros

**Timer Settings:**
- Focus: 25 minutes
- Short Break: 5 minutes
- Long Break: 15 minutes
- Long break after: 4 pomodoros

---

## 5. API Integration

### 5.1 Google Calendar

**Auth:** OAuth 2.0

**Endpoints:**
- `GET /calendars/primary/events` - List events
- `POST /calendars/primary/events` - Create event

**Scopes needed:**
- `https://www.googleapis.com/auth/calendar.events.readonly`
- `https://www.googleapis.com/auth/calendar.events`

### 5.2 Canvas LMS

**Auth:** Canvas API Token (user provides)

**Base URL:** `{domain}/api/v1`

**Endpoints:**
- `GET /users/self/courses` - List enrolled courses
- `GET /courses/{id}/assignments` - List assignments
- `GET /users/self/grades` - Get grades (varies by institution)

---

## 6. Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Google    │     │   Canvas     │     │   Local     │
│  Calendar   │     │     LMS      │     │  Storage    │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │
       ▼                   ▼                    ▼
┌──────────────────────────────────────────────────────┐
│                   App State (Context)                 │
│  - events[]    - assignments[]   - courses[]         │
│  - grades{}    - settings        - auth tokens       │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │      UI        │
                  │   (React/RN)    │
                  └────────────────┘
```

---

## 7. Project Structure

```
co-captain/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Calendar/
│   │   ├── Assignments/
│   │   ├── GPA/
│   │   ├── Courses/
│   │   └── Focus/
│   ├── screens/          # Page components
│   ├── services/         # API integrations
│   │   ├── googleCalendar.ts
│   │   └── canvas.ts
│   ├── context/         # State management
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Helper functions
│   └── constants/       # App constants
├── App.tsx              # Main app entry
├── SPEC.md              # This file
└── README.md
```

---

## 8. Milestones

### Phase 1: MVP (2-3 weeks)
- [ ] Set up React + React Native project
- [ ] Implement Calendar view (local events only first)
- [ ] Build Assignments page
- [ ] Build Courses page
- [ ] Basic navigation

### Phase 2: Integrations (2-3 weeks)
- [ ] Google Calendar OAuth + API
- [ ] Canvas API token integration
- [ ] Auto-sync events/assignments

### Phase 3: Polish (1-2 weeks)
- [ ] GPA page
- [ ] Focus timer
- [ ] iOS build
- [ ] Polish UI

---

## 9. Existing Code

The project already has a prototype built in Lovable:
- GitHub: LakeMont198/co-captain
- Tech: Vite, React, TypeScript, Tailwind, shadcn-ui

**Plan:** Extend existing prototype or rebuild with React Native for mobile support.

---

*Last Updated: 2026-03-03*
*Created by: LakemontBot*
