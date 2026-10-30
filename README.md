# BuddyBot 🤖

Buddy Bot is a full-stack MERN-based AI chatbot application powered by Groq's high-speed inference API (Llama 3.3). It features threaded chat history, modern dark-themed UI, user authentication (JWT + Google OAuth), and seamless deployment support.

---

## 🚀 One-Click Hosting on Vercel

This repository is pre-configured so that you can simply **import the repository on Vercel** and it will automatically build the React (Vite) frontend and host the Express API via serverless functions.

### Base Path / Custom Domain
The project is configured with a home/root route at:
```
https://ialksng.me/work/projects/buddybot/app
```

- When deployed on Vercel or accessed directly, visiting the root `/` redirects to `/work/projects/buddybot/app`.
- All routes (`/dashboard`, `/login`, `/signup`, `/chat`) and asset requests are served under `/work/projects/buddybot/app/`.

---

## 🛠️ Vercel Deployment Instructions

1. Push this repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New..."** → **"Project"**.
3. Import your **`buddybot`** repository.
4. **Leave the Root Directory as default (`./`)**. Vercel will automatically read `vercel.json` and the root `package.json`.
5. Under **Environment Variables**, add the following variables:

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `GROQ_API_KEY` | Groq API Secret Key | `gsk_...` |
| `GROQ_MODEL` | *(Optional)* Groq Model | `llama-3.3-70b-versatile` |
| `JWT_SECRET` | Secret key for JWT auth tokens | `your_secure_random_string` |
| `SESSION_SECRET` | Session secret | `your_session_secret` |
| `CLIENT_URL` | Your frontend production URL | `https://ialksng.me/work/projects/buddybot/app` |
| `GOOGLE_CLIENT_ID` | *(Optional)* Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | *(Optional)* Google OAuth Client Secret | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | *(Optional)* Google OAuth Callback URL | `https://ialksng.me/work/projects/buddybot/app/api/auth/google/callback` |

6. Click **Deploy**. Vercel will build the frontend and deploy the serverless API.

---

## 💻 Local Development

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Setup environment variables:**
   Copy `.env.example` to `.env` in the root:
   ```bash
   cp .env.example .env
   ```

3. **Start backend:**
   ```bash
   npm run start
   ```

4. **Start frontend (in a separate terminal):**
   ```bash
   cd frontend
   npm run dev
   ```

