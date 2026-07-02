# Next-Month Contribution Backlog

This backlog breaks future work into small, useful issues that can become focused pull requests.

## Week 1: Refactor for Maintainability

- [ ] Extract `StatsPanel` from `src/App.jsx`.
- [ ] Extract `GuidePanel` from `src/App.jsx`.
- [ ] Extract `PracticePanel` from `src/App.jsx`.
- [ ] Extract `AchievementsPanel` from `src/App.jsx`.
- [ ] Move shared panel header markup into a reusable component.

## Week 2: Accessibility and UX Polish

- [ ] Add keyboard arrow navigation for sidebar tabs.
- [ ] Add an achievement-unlocked live region announcement.
- [ ] Add reduced-motion CSS handling for animated UI elements.
- [ ] Improve focus order in the settings and shortcut dialogs.
- [ ] Add README screenshots when a browser capture tool is available.

## Week 3: Tests and Data Quality

- [ ] Add tests for `exportHistory` payload shape.
- [ ] Add tests for stored favorites and completed lessons edge cases.
- [ ] Add data validation for duplicate practice titles.
- [ ] Add data validation for achievement tier values.
- [ ] Add classifier fixture tests for commonly confused signs.

## Week 4: Performance and Learning Features

- [ ] Track lazy chunk sizes in CI output.
- [ ] Add an optional practice-session timer.
- [ ] Add a lightweight achievement unlock toast.
- [ ] Add a favorites-only count summary.
- [ ] Add a next-sign queue for active practice lessons.
