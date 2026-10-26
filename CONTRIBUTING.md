# Contributing to InnerLevel Sync

Thank you for your interest in contributing to **InnerLevel Sync**! We welcome community contributions, bug reports, and suggestions.

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/GabrielFersPin/innerlevel-sync.git
   cd innerlevel-sync
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Development build & watch mode**:
   ```bash
   npm run dev
   ```

4. **Production build**:
   ```bash
   npm run build
   ```

5. **Linter & Code Quality**:
   This project uses `eslint` and `eslint-plugin-obsidianmd` to strictly enforce Obsidian developer policies and TypeScript safety.
   ```bash
   npm run lint
   ```

## 📋 Pull Request Guidelines

- Ensure your code passes all type checks and lint rules (`npm run lint` and `npm run build`).
- Adhere to the Obsidian plugin design guidelines:
  - Do not use inline `.style` assignments; define reusable classes in `styles.css`.
  - Use Obsidian DOM helper methods (`createDiv`, `createSpan`, `createEl`).
  - Maintain sentence-case formatting for UI strings.
  - Keep frontmatter edits non-destructive via `app.fileManager.processFrontMatter`.
- Keep contributions focused on a single feature or bug fix per pull request.

## 🐛 Reporting Issues

If you find a bug or have a feature suggestion, please open an issue on GitHub:
https://github.com/GabrielFersPin/innerlevel-sync/issues

Include:
- Obsidian version and operating system.
- InnerLevel Sync version.
- Steps to reproduce the issue.
- Relevant console logs from Obsidian's Developer Tools (`Ctrl+Shift+I` or `Cmd+Option+I`).
