# Contributing to SignSpeak ASL

Thank you for improving SignSpeak ASL. This project benefits most from focused, reviewable contributions that improve reliability, accessibility, documentation, learning content, or user experience.

## Contribution Principles

- Prefer small pull requests over large mixed changes.
- Keep each branch focused on one issue or improvement.
- Run validation before committing.
- Include screenshots for visible UI changes when possible.
- Avoid committing generated build output unless explicitly requested.
- Do not edit `node_modules` or platform-generated dependency files directly.

## Branch Naming

Use short, descriptive branches:

```text
feature/practice-search
fix/history-entry-ids
docs/readme-quickstart
test/sign-smoother
refactor/sidebar-panels
a11y/sidebar-tabs
perf/lazy-learning-data
```

## Commit Messages

Use a simple conventional style:

```text
feat: add practice lesson search
fix: ignore shortcuts while typing
docs: add contributor workflow
test: cover sign smoother behavior
refactor: extract preference helpers
a11y: add tab selected state
perf: memoize history metrics
```

## Local Setup

```bash
npm install
npm run dev
```

Open the Vite dev server URL and allow browser camera permission.

## Validation Checklist

Before opening a pull request, run:

```bash
npm test
npm run build
```

For UI changes, also perform a manual smoke test:

- App loads without console errors.
- Camera permission flow still works.
- Live status text updates.
- TTS buttons still work if the browser supports speech synthesis.
- Keyboard shortcuts do not fire while typing in inputs or editable fields.
- Practice, Awards, Guide, and Stats tabs render correctly.

## Pull Request Checklist

Include the following in every PR:

- Summary of what changed.
- Why the change is useful.
- Files or areas touched.
- Testing commands run.
- Screenshots or screen recordings for visual changes when available.
- Any follow-up work that should become a future issue.

## Good First Issues

Good first contributions include:

- README improvements.
- Empty states for filtered panels.
- Keyboard shortcut documentation.
- Small accessibility improvements.
- CSS polish for mobile layouts.
- Unit tests for pure helper functions.

## Suggested Review Size

Try to keep most PRs under these limits:

- 1 to 4 files changed.
- 15 to 150 lines changed.
- One feature, fix, or documentation topic per PR.

Larger PRs are acceptable for planned refactors, but they should include a clear migration plan and testing notes.

## Accessibility Expectations

When adding interactive UI:

- Use real buttons for actions.
- Add labels for icon-only controls.
- Preserve keyboard access.
- Make focus states visible.
- Use `aria-selected` for tab-like controls where appropriate.

## Documentation Expectations

Update documentation when you change:

- Setup steps.
- Available scripts.
- Keyboard shortcuts.
- User-visible features.
- Browser or camera requirements.
- Project structure.

## Issue Template for New Work

```md
## Summary
Describe the improvement in one or two sentences.

## Motivation
Why is this useful for users or maintainers?

## Scope
- [ ] File or feature area 1
- [ ] File or feature area 2

## Acceptance Criteria
- [ ] Behavior is implemented
- [ ] Build passes
- [ ] Docs or tests updated if needed
```
