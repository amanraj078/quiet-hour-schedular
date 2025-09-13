# Study Blocks ⏰

A productivity web app to help students schedule **study blocks** and get notified via **email reminders** before the session starts.

---

## 🚀 Features

-   **User Authentication** – Supabase Auth (Email/Password & Recovery).
-   **Manage Study Blocks** – Create, update, and delete study blocks.
-   **Email Reminders** – Users get an email **10 minutes before a block starts**.
-   **Backend Logic** – Supabase Edge Functions run on a cron job to check for upcoming blocks.
-   **Database** – PostgreSQL (Supabase) stores study blocks with notification status.

---

## 🛠️ Tech Stack

-   **Frontend:** Next.js + TailwindCSS
-   **Backend:** Supabase (Database + Auth + Edge Functions + Cron)
-   **Email Service:** [Resend](https://resend.com) API
-   **Deployment:** Supabase + Vercel

---

## 📧 Email Notifications

-   A cron-triggered Supabase **Edge Function** runs every minute.
-   It checks for study blocks starting in the next **10 minutes** and notifies users.
-   Emails are sent using **Resend API**.

### ⚠️ Note on Resend Free Plan

-   Resend requires **domain verification** to send emails from a custom sender (e.g., `noreply@myapp.com`).
-   On the free plan, only **sandbox/test addresses** can receive emails.
-   This caused limitations in sending emails to arbitrary users during deployment.
-   Solution would be either:
    -   Upgrade plan and verify a domain, or
    -   Use an alternative like Supabase SMTP / SendGrid.

---

## 🧑‍💻 How It Works

1. User logs in and creates a **study block** with start time.
2. Supabase Edge Function runs (via cron).
3. If a block starts in the next 10 minutes → function triggers **Resend email API**.
4. User receives an email notification reminding them of the session.
5. The block is marked as **notified = true** to prevent duplicate emails.

---

## ✅ Current Status

-   Authentication: ✔️
-   Block CRUD: ✔️
-   Edge Function with Resend: ✔️ (tested with sandbox email)
-   Production email delivery: ⚠️ Blocked by **domain verification requirement** in Resend free plan

---

## 📌 Next Steps

-   Add **calendar view** for blocks.
-   Enable **real domain verification** for Resend or switch to another provider.
-   Polish frontend UI.

---

## 🎯 Purpose of the Project

This project was built as a **full-stack assignment** to demonstrate:

-   Authentication flow
-   Database design
-   Edge functions & cron jobs
-   Email integration with third-party APIs
