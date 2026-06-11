# SignSpeak ASL Roadmap

This roadmap keeps the next month of contributions focused on real product quality improvements.

## Good First Issues

- Add empty-state screenshots to the README.
- Add more unit tests for preference storage edge cases.
- Improve mobile spacing for the history list.
- Add additional practice lessons with unique titles and sign sets.
- Document browser support for clipboard and speech synthesis.

## Near-Term Improvements

- Split the large `App.jsx` file into focused panel components.
- Lazy-load the practice and achievement data modules when their tabs open.
- Add a richer active-practice flow with step-by-step target signs.
- Add user-visible achievement unlock notifications.
- Add generated screenshots to documentation once a browser is available in CI.

## Quality and Automation

- Keep `npm run lint`, `npm test`, and `npm run build` green for every pull request.
- Track production bundle size after large UI/data changes with `npm run build:report`.
- Prefer small pull requests with one clearly testable improvement.
