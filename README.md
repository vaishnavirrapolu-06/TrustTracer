# TrustTracer

An AI-powered fake review detector. Paste any review's text, and TrustTracer uses
Gemini to analyze it for authenticity — returning a verdict (Genuine / Suspicious / Fake),
a fake-likelihood score, and its reasoning. Every scan is saved to Firestore, with a
running history and stats dashboard.

## Stack

- **Frontend:** HTML, CSS, JavaScript (no framework)
- **Backend:** Node.js + Express
- **Database:** Firebase Firestore
- **AI:** Google Gemini API
- **Hosting:** Render

## Features

- Paste any review text and get an instant authenticity scan
- Verdict determined by a fixed fakeScore range (0–32 Genuine, 33–65 Suspicious, 66–100 Fake)
- Full scan history with clickable entries to review past results
- Live stats dashboard (total / genuine / suspicious / fake counts)

## Setup

1. Clone this repo
2. Run `npm install`
3. Create a `.env` file with:
   GEMINI_API_KEY=your_gemini_api_key_here
   FIREBASE_SERVICE_ACCOUNT_BASE64=your_base64_encoded_service_account_string
4. Run `node server.js`
5. Visit `http://localhost:3000`
