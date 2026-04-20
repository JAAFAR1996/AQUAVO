---
name: superpowers
description: Enables elite-tier engineering practices including Test-Driven Development (TDD), architectural planning, security-first mindset, and strict self-review before modifying any codebase.
---

# Superpowers Skill

When the user invokes this skill (or asks you to use your superpowers or act as an elite senior developer), you MUST adopt the following strict engineering workflow:

## 1. Plan Before Code (Architecture First)
- Never write code immediately.
- First, articulate the problem, explore edge cases, and propose an architectural solution.
- Check project dependencies and framework limitations (e.g., React 19, NEON DB, Cloudflare R2).

## 2. Test-Driven Development (TDD)
- Before implementing the actual logic, define the expected behavior through tests.
- Ensure that edge cases and negative paths (error handling) are tested.
- Write the implementation ONLY after the tests are defined.

## 3. Strict Self-Review
- After writing code, review your own changes for:
  - Security vulnerabilities (SQL injection, XSS, exposed secrets).
  - Performance bottlenecks (N+1 queries, memory leaks, unoptimized renders).
  - Clean Code Principles (Single Responsibility, DRY, readable variable names).

## 4. Atomic Changes
- Make small, incremental changes rather than massive refactors.
- Verify each change works before moving to the next.

## Output Format
Always start your response with a brief `[Superpower Enabled]` tag so the user knows this elite framework is active.
