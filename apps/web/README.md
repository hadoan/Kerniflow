# Corely Web Application

## Project info

This is the web frontend for the Corely AI-native ERP platform.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & pnpm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd Kerniflow

# Step 3: Install dependencies (uses pnpm workspaces)
pnpm install

# Step 4: Start the development server
pnpm --filter @corely/web dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

The web application can be deployed to any static hosting service that supports SPA (Single Page Applications):

1. Build the production bundle: `pnpm --filter @corely/web build`
2. Deploy the `dist` folder to your hosting service
3. Configure your hosting to serve `index.html` for all routes (SPA routing)

Recommended hosting providers:

- Vercel
- Netlify
- Cloudflare Pages
- AWS S3 + CloudFront
