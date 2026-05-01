# ClassTrack - Deployment Guide

## Overview

ClassTrack is a university classroom management PWA built with Next.js, Prisma, and PostgreSQL.

## Quick Deploy to Vercel

### 1. Prerequisites

- Vercel account ([vercel.com](https://vercel.com))
- PostgreSQL database (Supabase, Neon, or Vercel Postgres)
- Email service (Resend recommended)

### 2. Email Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain
3. Get your API key
4. Note your verified sender email

### 3. Database Setup

Choose one:

**Option A: Vercel Postgres**
- Create database in Vercel dashboard
- Copy connection strings

**Option B: Supabase**
- Create project at [supabase.com](https://supabase.com)
- Get connection strings from project settings

**Option C: Neon**
- Create project at [neon.tech](https://neon.tech)
- Get connection strings

### 4. Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=your-random-secret
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=https://your-app.vercel.app
RESEND_API_KEY=re_xxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_TELEMETRY_DISABLED=1
```

3. Deploy! Vercel will automatically build and deploy

### 5. Post-Deployment

1. Run database migrations: `npx prisma migrate deploy`
2. Test OTP email functionality
3. Verify all features work

## Environment Variables

See `.env.example` for all required variables.

## Troubleshooting

- **Build fails**: Check database connection and Prisma schema
- **Emails not sending**: Verify Resend API key and domain verification
- **Database errors**: Ensure DATABASE_URL is correct and accessible

## Features

- Email OTP authentication
- Classroom management
- Attendance tracking
- Results management
- GPA calculator
- Announcements and polls
- Mobile-first PWA

## Support

For issues, check Vercel deployment logs and database connectivity.