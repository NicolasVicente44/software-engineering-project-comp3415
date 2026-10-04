# COMP 3415 Software Engineering Project

Course project for **COMP 3415: Software Engineering** at Lakehead University.

**Description:**
A software engineering project developed as part of COMP 3415. The project will be designed, developed, tested, and refined throughout the semester using collaborative software engineering practices.

---

## Tech Stack & Setup

This repository is bootstrapped with **Next.js** (App Router), **TypeScript**, and **Tailwind CSS**.

### Prerequisites

- Node.js 18.18+ or 20+ (Node.js 22 LTS recommended)
- npm (or yarn / pnpm / bun)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/NicolasVicente44/software-engineering-project-comp3415.git
   cd software-engineering-project-comp3415
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Available Scripts

- `npm run dev` - Starts the development server with Turbopack.
- `npm run build` - Creates an optimized production build.
- `npm run start` - Runs the production server after building.
- `npm run lint` - Runs ESLint to check for code quality and style issues.

---

## Contributing

All team members must follow the contribution workflow below to keep the repository organized and ensure changes are reviewed before being merged into `main`.

### Branches

Do not make changes directly to `main`.

Create a separate branch for each feature, bug fix, documentation update, or other task.

Use descriptive branch names following these conventions:

```text
feature/feature-name
fix/bug-name
docs/documentation-change
refactor/component-name
```

Examples:

```text
feature/syllabus-upload
feature/calendar-integration
fix/login-validation
docs/update-readme
```

### Pull Requests

All changes to `main` must go through a pull request.

Before merging:

1. Push your changes to your branch.
2. Open a pull request targeting `main`.
3. Clearly describe what was changed and why.
4. Have at least one other team member review and approve the pull request.
5. Resolve any review comments or discussions.
6. Merge only after the required approval has been received.

### General Guidelines

* Keep each branch focused on one feature, fix, or task whenever possible.
* Write clear and descriptive commit messages.
* Pull the latest changes from `main` before starting new work.
* Test your changes (`npm run build` and `npm run lint`) before requesting a review.
* Review another team member's code before approving a pull request.
* Do not push directly to `main`.
* Do not commit passwords, API keys, secrets, or sensitive `.env` files.

## Repository Workflow

```text
Create Branch
     ↓
Make Changes
     ↓
Commit Changes
     ↓
Push Branch
     ↓
Open Pull Request
     ↓
Code Review
     ↓
Approval
     ↓
Merge 
```

The `main` branch should remain stable and contain only reviewed and approved changes.
