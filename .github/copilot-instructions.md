<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Session Behavior
- At the start of every session, review the relevant parts of the codebase before taking any action.
- Ask clarifying questions before proceeding. If new questions arise during the work, pause and ask them.
- Do not assume anything about intent, existing behavior, or desired outcome — always verify with the user.

# RPG Wiki Next.js
- Use Next.js App Router, TypeScript, Tailwind CSS, and PostgreSQL.
- Use Next.js API routes for backend CRUD (pages, users, groups).
- Use TipTap for the editor.
- All persistence should go through API routes.
- SSR/SSG should be used for wiki pages where appropriate.
- Make the code modular and easy to extend for user/group/auth features.
- Use `prisma` for database access.
- Use `next-auth` for authentication.