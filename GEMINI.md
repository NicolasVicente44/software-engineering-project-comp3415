# Project Rules & Antigravity Configuration

## Overview
This repository is the course project for **COMP 3415: Software Engineering** at Lakehead University.

## Tech Stack
- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Runtime**: Node.js 22 LTS / npm

## Development Workflow & Commands
- `npm run dev`: Start local development server with Turbopack.
- `npm run build`: Verify TypeScript compilation and build production assets.
- `npm run lint`: Run ESLint checks.

Always verify your changes by running `npm run build` or `npm run lint` before committing or submitting code.

## Git & Collaboration Rules
All team members and AI assistants MUST adhere to the following:
1. **Branch Protection**: Never commit or push directly to `main`.
2. **Branch Naming**:
   - Features: `feature/<feature-name>`
   - Bug fixes: `fix/<bug-name>`
   - Documentation: `docs/<description>`
   - Refactoring: `refactor/<component-name>`
3. **Pull Requests**:
   - All changes to `main` must go through a pull request.
   - PRs must describe what changed and why.
   - Code reviews and peer approval are required before merging.
4. **Security**:
   - Never commit API keys, passwords, secrets, or `.env` files.
