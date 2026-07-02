# Issue Labels

Use these labels to keep contribution work easy to triage and friendly for new contributors.

## Recommended Labels

| Label | Purpose | Example task |
| --- | --- | --- |
| `good first issue` | Small, well-scoped task for a first contribution. | Add a README screenshot or expand a utility test. |
| `help wanted` | Useful task where community input is welcome. | Add more practice lessons or browser compatibility notes. |
| `documentation` | Docs-only update. | Improve troubleshooting steps or add examples. |
| `tests` | Adds or improves automated checks. | Add edge-case tests for storage or learning utilities. |
| `accessibility` | Improves keyboard, screen reader, or contrast behavior. | Audit tab panel labels or live regions. |
| `performance` | Reduces bundle size or runtime work. | Split another large module or memoize derived values. |
| `refactor` | Improves structure without changing behavior. | Extract a panel component from `App.jsx`. |
| `bug` | Fixes broken or confusing behavior. | Correct a classifier false positive. |

## Good First Issue Template

```md
## Goal
Describe the small improvement in one sentence.

## Files to change
- `path/to/file.js`

## Acceptance criteria
- [ ] Behavior or docs are updated.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes if code changes.
- [ ] `npm run build` passes for app changes.
```
