# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive onboarding guide for Moneygate developers learning to build .NET backend services. A static SPA that walks through building two microservices (Customer Service and Document Service) using layered architecture, EF Core, Docker, and ASP.NET Core.

## No Build Process

This is a pure static site — no npm, no bundler, no compilation step. Development is just editing files and refreshing the browser. To run locally, serve the root directory with any static file server (e.g. `npx serve .` or VS Code Live Server). There are no tests.

## Architecture: Two Files + Panels

All application logic lives in two files:

- **`index.html`** — HTML structure, full CSS (design system variables, layout, components, responsive styles), and loads the JS module
- **`onboarding-sidebar.js`** — All application behavior: sidebar rendering, tab navigation, panel loading/caching, progress tracking, Firebase integration, Mermaid diagram rendering, keyboard navigation, and community notes CRUD

Content is split across **19 HTML panel files** in `./panels/`:
- `overview.html` — welcome screen
- `c1.html`–`c8.html` — Part 1: Customer Service (8 steps)
- `d1.html`–`d8.html` — Part 2: Document Service (8 steps)
- `reference.html` — reference card with architecture diagrams

## Navigation Model

Tab names (`overview`, `c1`–`c8`, `d1`–`d8`, `reference`) are the canonical identifiers used as keys in localStorage progress, Firestore document fields, and panel filenames. Adding a new step means: creating `panels/{name}.html`, adding the tab to the sidebar definition in `onboarding-sidebar.js`, and using the same key for progress tracking.

Panel switching: `switchTab(name)` → fetches `./panels/{name}.html` (cached after first load) → injects into DOM → sets up Guide/Notes tab toggle → renders Mermaid diagrams → loads community notes via Firestore.

## State: localStorage + Firebase

Two layers of persistence:

1. **localStorage** — `completedSteps` (object of `{c1: true, ...}`) and `lastActiveTab` — local to the browser
2. **Firebase Firestore** — `progress/{shared}` document for real-time cross-user progress sync; `notes/{panelId}/items/` subcollection for community notes

Firebase config is hardcoded in `onboarding-sidebar.js`. The project is `onboarding-notes`. Firestore rules are currently open (`allow read, write: if true`).

## Panel HTML Structure

Each panel follows a consistent structure:
- Header with breadcrumb, title, time estimate, and tag pills
- Expandable author's notes (hidden by default)
- Main guide content (instructions, code blocks, Mermaid diagrams)
- "Mark as complete" toggle button
- Community notes section (rendered by JS, not in panel HTML)
- Prev/Next footer navigation

## CSS Design System

All colors and spacing use CSS variables defined at the top of `index.html` (`--bg`, `--text-primary`, `--accent`, `--sidebar-width`, etc.). Use these variables for any new styles rather than hardcoded values.

## External Dependencies (CDN only)

- **Mermaid 10.x** — architecture diagram rendering
- **Firebase SDK 10.12.0** — Firestore for progress sync and community notes

Both loaded from CDN in `index.html`. No package manager involved.
