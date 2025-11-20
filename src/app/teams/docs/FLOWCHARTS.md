# Teams Feature - Business Logic Flow Charts

This document provides visual flow charts for major team workflows. These flow charts serve as a reference for understanding the business logic and can be used for implementation, testing, and debugging.

## Table of Contents

1. [Team Creation Flow](#team-creation-flow)
2. [Team Joining Flow](#team-joining-flow)
3. [Roster Management Flow](#roster-management-flow)
4. [Assignment Creation Flow](#assignment-creation-flow)
5. [Stream Post Flow](#stream-post-flow)
6. [Member Invitation Flow](#member-invitation-flow)
7. [Subteam Management Flow](#subteam-management-flow)

---

## Team Creation Flow

```
┌─────────────────┐
│  User Requests  │
│  Team Creation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Input  │
│ - School name   │
│ - Division (B/C)│
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Generate Slug   │
│ from School +   │
│ Division        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check if Slug   │
│ Already Exists  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Exists? │
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │ ────► Append number to slug
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Create Team     │
│ Group Record    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate Codes  │
│ - Captain Code  │
│ - User Code     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Default  │
│ Subteam         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Add Creator as  │
│ Captain         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Team     │
│ Information     │
└─────────────────┘
```

---

## Team Joining Flow

```
┌─────────────────┐
│  User Provides  │
│  Join Code      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Code   │
│ Format          │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Find Team by    │
│ Code (Captain   │
│ or User Code)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 404 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check if User   │
│ Already Member  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Member? │
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Determine Role  │
│ - Captain Code  │
│   → Captain     │
│ - User Code     │
│   → Member      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create          │
│ Membership      │
│ Record          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Success  │
│ with Team Info  │
└─────────────────┘
```

---

## Roster Management Flow

```
┌─────────────────┐
│  Captain Updates│
│  Roster Entry   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Input  │
│ - Subteam ID    │
│ - Event Name    │
│ - Slot Index    │
│ - Student Name  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check User      │
│ Authorization   │
│ (Captain/Co-    │
│  Captain only)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Authorized?│
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 403 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check if        │
│ Student Name    │
│ Matches Team    │
│ Member          │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Match?  │
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │ ────► Link User ID
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Leave User ID null
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Upsert Roster   │
│ Entry           │
│ (ON CONFLICT    │
│  DO UPDATE)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Success  │
└─────────────────┘
```

---

## Assignment Creation Flow

```
┌─────────────────┐
│  Captain Creates│
│  Assignment     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Input  │
│ - Title         │
│ - Description   │
│ - Due Date      │
│ - Questions     │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check User      │
│ Authorization   │
│ (Captain/Co-    │
│  Captain only)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Authorized?│
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 403 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Validate All    │
│ Questions Have  │
│ Answers         │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Create          │
│ Assignment      │
│ Record          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Question │
│ Records         │
│ (if provided)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Roster   │
│ Assignment      │
│ Records         │
│ (if members     │
│  specified)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send            │
│ Notifications   │
│ to Assigned     │
│ Members         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Success  │
│ with Assignment │
│ ID              │
└─────────────────┘
```

---

## Stream Post Flow

```
┌─────────────────┐
│  Captain Creates│
│  Stream Post    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Input  │
│ - Content       │
│ - Subteam ID    │
│ - Tournament ID│
│   (optional)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check User      │
│ Authorization   │
│ (Captain/Co-    │
│  Captain only)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Authorized?│
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 403 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ If Tournament   │
│ Timer Enabled,  │
│ Validate        │
│ Tournament      │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 404 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Create Stream   │
│ Post Record     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Success  │
│ with Post ID    │
└─────────────────┘
```

---

## Member Invitation Flow

```
┌─────────────────┐
│  Captain Invites│
│  Member         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Input  │
│ - Username or   │
│   Email         │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Find User by    │
│ Username/Email  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Found?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 404 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check if User   │
│ Already Member  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Member? │
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Check for       │
│ Existing        │
│ Pending         │
│ Invitation      │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Exists? │
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Generate        │
│ Invitation Code │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create          │
│ Invitation      │
│ Record          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send            │
│ Notification    │
│ (Email/In-App)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Success  │
│ with Invitation │
│ Code            │
└─────────────────┘
```

---

## Subteam Management Flow

### Create Subteam

```
┌─────────────────┐
│  Captain Creates│
│  Subteam        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Input  │
│ - Name          │
│ - Description   │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 400 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Generate Codes  │
│ - Captain Code  │
│ - User Code     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Subteam  │
│ Record          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Success  │
│ with Subteam    │
│ Information     │
└─────────────────┘
```

### Delete Subteam

```
┌─────────────────┐
│  Captain Deletes│
│  Subteam        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check User      │
│ Authorization   │
│ (Captain/Co-    │
│  Captain only)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Authorized?│
    └────┬────┘
         │
    ┌────┴────┐
    │   No    │ ────► Return 403 Error
    └────┬────┘
         │
    ┌────┴────┐
    │  Yes    │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│ Start            │
│ Transaction     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Delete Related  │
│ Data:           │
│ - Memberships   │
│ - Roster Data   │
│ - Stream Posts  │
│ - Comments      │
│ - Timers        │
│ - Assignments   │
│ - Events        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Delete Subteam  │
│ Record          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Commit          │
│ Transaction     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return Success  │
└─────────────────┘
```

---

## Notes

- All flows include proper error handling
- Authorization checks are performed at appropriate points
- Database operations use transactions where multiple records are affected
- Validation occurs before any database operations
- All flows return appropriate HTTP status codes

