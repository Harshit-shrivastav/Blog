# Blog Application

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Harshit-shrivastav/Blog&env=DATABASE_URL,JWT_SECRET)

A modern, full-featured blog platform built with Next.js, featuring a public-facing blog, admin dashboard, and notes system.

## Features

### Public Site
- **Blog Posts** - Rich markdown-powered articles with code syntax highlighting, KaTeX math support, and reactions
- **Notes** - Quick posts with images and audio attachments
- **Collections** - Group related content into series
- **RSS Feed** - Subscribe to blog updates
- **Contact Form** - Visitor contact submissions
- **Dark Mode** - Automatic theme switching

### Admin Dashboard
- **Blog Manager** - Create, edit, and publish blog posts with a rich markdown editor
- **Notes Manager** - Quick notes with drag-and-drop reordering
- **Series Manager** - Organize posts into collections
- **Comment Moderation** - Approve/delete visitor comments
- **Newsletter** - Subscriber management and email broadcasts
- **Media Library** - Upload and manage images
- **Analytics** - Track views and engagement
- **Activity Log** - Monitor admin actions
- **Contact Inbox** - View and manage contact submissions

### Technical Stack
- **Next.js 16** - React framework with App Router
- **Tailwind CSS + shadcn/ui** - Modern styling
- **Prisma + PostgreSQL** - Database ORM
- **JWT (jose)** - Authentication
- **Framer Motion** - Smooth animations

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL database (local or cloud like Neon, Supabase, etc.)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Start development server
npm run dev
```

Visit `http://localhost:3000` for the public site and `http://localhost:3000/[admin-slug]` for the admin panel.

### First Setup (Local)

1. Open the admin URL (e.g., `http://localhost:3000/admin-dashboard`)
2. Create your admin account
3. Configure site settings (name, theme, accent color)
4. Start creating content!

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
| `NEXT_PUBLIC_SITE_URL` | Public URL of your site | No |

Generate a JWT secret:
```bash
openssl rand -base64 32
```

## Deploy to Vercel

### 1. Push Code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
# Create a new repository on GitHub and run:
git remote add origin https://github.com/yourusername/your-blog.git
git push -u origin main
```

### 2. Create Database

Using **Supabase**? Use the **connection pooler** to avoid "too many connections" errors:

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings → Database → Connection String
4. Use the pooler URL (port 6543), not the direct URL (port 5432):
   - `postgresql://postgres:[YOUR-PASSWORD]@pooler.[YOUR-PROJECT].supabase.co:6543/postgres`

Using **Neon**? No special setup needed:
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string

### 3. Deploy on Vercel

1. Click the **Deploy with Vercel** button above, or:
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "Add New..." → Project
4. Import your GitHub repository
5. Add environment variables:
   - `DATABASE_URL` = Your PostgreSQL connection string (use pooler for Supabase)
   - `JWT_SECRET` = Generate with `openssl rand -base64 32`
6. Click Deploy

### 4. Set Up Admin Account (Production)

1. Visit `https://your-domain.com/[admin-slug]` (the setup wizard appears if no admin exists)
2. Fill in your details:
   - Site name
   - Your name
   - Email
   - Password (min 8 characters)
   - Accent color
   - Admin URL slug
3. Click through to complete setup

## Project Structure

```
src/
├── app/
│   ├── api/          # API routes
│   └── [adminSlug]/  # Admin panel pages
├── components/
│   ├── admin/        # Admin components
│   └── ui/           # shadcn/ui components
└── lib/              # Utilities
prisma/
└── schema.prisma     # Database schema
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production (generates Prisma client + builds Next.js) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## License

MIT

---

Built by [Harshit Shrivastav](https://github.com/harshit-shrivastav)
