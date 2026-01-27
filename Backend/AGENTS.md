## Project Summary
FinPlay is a Financial Literacy Gamification Platform that teaches users personal finance through interactive gameplay. Users complete onboarding to set up a virtual financial profile, then progress through levels learning budgeting, saving, and investing skills without risking real money.

## Tech Stack
- **Frontend**: HTML, CSS, Vanilla JavaScript (no frameworks)
- **Backend**: FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Communication**: REST API (JSON)

## Architecture
```
/
├── main.py              # FastAPI backend with user endpoints
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables (Supabase credentials)
└── static/
    ├── index.html       # Landing page
    ├── onboarding.html  # 4-step onboarding flow
    ├── dashboard.html   # User dashboard
    └── styles.css       # Global styles
```

**Data Flow:**
1. User lands on index.html → clicks "Start"
2. Onboarding flow collects: name, knowledge level, life stage, goal
3. POST /users/onboard creates user in Supabase with calculated monthly income
4. User ID stored in localStorage, redirects to dashboard
5. Dashboard fetches user data via GET /users/{user_id}

**API Endpoints:**
- `POST /users/onboard` - Create new user
- `GET /users/{user_id}` - Fetch user profile

## User Preferences
(None yet)

## Project Guidelines
- No frontend frameworks (vanilla JS only)
- No authentication libraries
- Simple localStorage-based session management
- Mobile-first responsive design

## Common Patterns
- Radio button groups for multi-choice selection
- Step-based wizard UI for onboarding
- Card-based dashboard layout
- CSS variables for theming
