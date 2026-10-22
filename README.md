# COMP 3415 Software Engineering Project

Course project for **COMP 3415: Software Engineering** at Lakehead University.

**Description:**
A software engineering project developed as part of COMP 3415. The project will be designed, developed, tested, and refined throughout the semester using collaborative software engineering practices.

---

## Tech Stack & Setup

This repository is built with:
- **Next.js** (App Router) & **TypeScript**
- **Tailwind CSS** & **`shadcn/ui`** (official UI component library for this project)
- **Supabase** (`@supabase/ssr` for authentication & backend)
- **Vitest** & **React Testing Library** (unit & component testing)

### Prerequisites

- Node.js 18.18+ or 20+ (Node.js 22 LTS recommended)
- npm (or yarn / pnpm / bun)

### Getting Started

1. Clone the repository and switch to the **`dev`** branch:
   ```bash
   git clone https://github.com/NicolasVicente44/software-engineering-project-comp3415.git
   cd software-engineering-project-comp3415
   git checkout dev
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` from the template and fill in your Supabase project values:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Available Scripts

- `npm run dev` - Starts the development server with Turbopack.
- `npm run build` - Creates an optimized production build.
- `npm run start` - Runs the production server after building.
- `npm run lint` - Runs ESLint to check for code quality and style issues.
- `npm test` - Runs the Vitest test suite once (`npm run test:watch` for watch mode).

---

## Contributing & Git Flow

All team members must follow the Git Flow workflow below to keep the repository organized and ensure all changes are reviewed and tested before reaching production.

### Branch Structure (`main` vs. `dev`)

* **`main` (Production Deployment Branch)**:
  * `main` represents the live, deployed production version of the app.
  * **Never base feature branches off `main` and never open feature PRs directly into `main`.**
  * `main` is only updated by merging `dev` into `main` when a release or milestone is ready for deployment.
* **`dev` (Development Branch)**:
  * `dev` is the active development and integration branch where all ongoing work comes together.
  * **Always base your new branches off `dev`** (`git checkout dev && git pull origin dev`, then `git checkout -b feature/your-feature`).
  * **Always open your pull requests targeting `dev`**.
* **Working Branches**:
  * Created off `dev` for individual tasks. Never push directly to `main` or `dev`.

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

### UI Components (`shadcn/ui`)

* **`shadcn/ui` MUST be used as the UI package** for all shared UI primitives and components (buttons, inputs, cards, dialogs, alerts, dropdowns, etc.) to keep the design consistent across the app.
* Existing primitives live in `src/components/ui/`.
* To add a new `shadcn/ui` component, run:
  ```bash
  npx shadcn@latest add <component-name>
  ```
* Do not install competing component libraries (e.g., Material UI, Chakra UI, Ant Design).

### Pull Requests

All changes to `dev` and `main` must go through a pull request.

* **All major changes MUST include accompanying tests** covering the new or modified behavior.
* **All major UI changes MUST include screenshots** (before/after or views of new screens/components) in the pull request description so everyone on the team can see what is happening.

Before merging a working branch into `dev`:

1. Pull the latest changes from `dev` (`git pull origin dev`) to ensure your branch is up to date.
2. Run `npm run lint`, `npm test`, and `npm run build` locally to verify everything passes.
3. Push your branch to GitHub (`git push -u origin <branch-name>`).
4. Open a pull request targeting **`dev`** (not `main`).
5. Clearly describe what was changed and why, and attach **screenshots** if the PR introduces or updates UI.
6. Ensure **tests** are included for any major feature or bug fix.
7. Have at least one other team member review and approve the pull request.
8. Resolve all review comments or discussions, then merge into `dev`.

When `dev` is stable and ready for deployment, open a release pull request from **`dev` $\rightarrow$ `main`**.

### Testing

Every change that adds or modifies a major feature **MUST** include tests covering it (Vitest + Testing Library, in the top-level `tests/` folder, mirroring the `src/` structure, e.g. `src/lib/auth/validation.ts` is tested by `tests/lib/auth/validation.test.ts`).

* New features need tests for their main behaviour, including error cases.
* Bug fixes should include a test that fails without the fix.
* All tests must pass (`npm test`) before you open or update a pull request. Do not merge with failing or skipped tests.
* Update existing tests when you change behaviour they cover.

### General Guidelines

* Base all new work off `dev` (`git checkout dev && git pull origin dev`).
* Use `shadcn/ui` (`src/components/ui/`) for UI components.
* Keep each branch focused on one feature, fix, or task whenever possible.
* Write clear and descriptive commit messages.
* Test your changes (`npm run build`, `npm run lint`, and `npm test`) before requesting a review.
* Include screenshots in PRs for all major UI changes.
* Review another team member's code before approving a pull request.
* Do not push directly to `dev` or `main`.
* Do not commit passwords, API keys, secrets, or sensitive `.env` files.

## Repository Workflow

```text
Checkout & Pull dev (Development Branch)
      ↓
Create Working Branch off dev (feature/*, fix/*, etc.)
      ↓
Make Changes (using shadcn/ui) + Write Tests
      ↓
Commit & Push Branch
      ↓
Open Pull Request → dev (include screenshots for UI changes)
      ↓
Code Review & Approval
      ↓
Merge into dev
      ↓
Release Pull Request (dev → main) for Production Deployment
```

Both `dev` and `main` are protected branches — `dev` is our active development branch, and `main` is strictly for production deployment.
