#!/usr/bin/env bash
set -euo pipefail

# Dump actionable project context for review or LLM-assisted refactoring.
#
# Usage:
#   ./scripts/dump-actionable.sh
#   ./scripts/dump-actionable.sh > facet-context.md
#
# Optional:
#   DUMP_INCLUDE_LOCKFILE=1 ./scripts/dump-actionable.sh
#   DUMP_INCLUDE_SCRATCH=1 ./scripts/dump-actionable.sh
#   DUMP_RUN_CHECK=1 ./scripts/dump-actionable.sh
#
# Privacy:
#   This script sanitizes common local path leaks by default.
#   It replaces $HOME with ~ and the absolute project root with <PROJECT_ROOT>.

ROOT="$(pwd)"
PROJECT_NAME="$(basename "$ROOT")"
export FACET_DUMP_ROOT="$ROOT"

include_lockfile="${DUMP_INCLUDE_LOCKFILE:-0}"
include_scratch="${DUMP_INCLUDE_SCRATCH:-0}"
run_check="${DUMP_RUN_CHECK:-0}"

sanitize_stream() {
  perl -pe '
    BEGIN {
      $home = $ENV{"HOME"} // "";
      $root = $ENV{"FACET_DUMP_ROOT"} // "";
    }

    s/\Q$root\E/<PROJECT_ROOT>/g if length $root;
    s/\Q$home\E/~/g if length $home;
  '
}

emit() {
  sanitize_stream
}

section() {
  printf '\n\n## %s\n\n' "$1"
}

subsection() {
  printf '\n\n### %s\n\n' "$1"
}

fence_for_file() {
  local file="$1"

  case "$file" in
    *.ts|*.tsx) echo "ts" ;;
    *.js|*.jsx|*.cjs|*.mjs) echo "js" ;;
    *.json) echo "json" ;;
    *.css) echo "css" ;;
    *.html) echo "html" ;;
    *.md) echo "md" ;;
    *.yml|*.yaml) echo "yaml" ;;
    *.sh) echo "bash" ;;
    .gitignore) echo "gitignore" ;;
    *) echo "txt" ;;
  esac
}

fence_file() {
  local file="$1"
  local lang

  if [ ! -f "$file" ]; then
    return 0
  fi

  lang="$(fence_for_file "$file")"

  {
    subsection "$file"
    printf '```%s\n' "$lang"
    sed 's/\r$//' "$file"
    printf '\n```\n'
  } | emit
}

is_scratch_file() {
  local file="$1"

  case "$file" in
    scripts/tmp.sh|scripts/*.tmp.sh|tmp/*|*.tmp)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

print_tree() {
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files \
      ':!:node_modules' \
      ':!:dist' \
      ':!:coverage' \
      ':!:.git' \
      ':!:*.log' \
      | sort
    git ls-files --others --exclude-standard \
      ':!:node_modules' \
      ':!:dist' \
      ':!:coverage' \
      ':!:.git' \
      ':!:*.log' \
      | sort
    return 0
  fi

  find . \
    \( -path './node_modules' -o -path './dist' -o -path './coverage' -o -path './.git' \) -prune \
    -o -type f -print \
    | sed 's#^\./##' \
    | sort
}

tracked_or_relevant_files() {
  {
    if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
      git ls-files \
        ':!:node_modules' \
        ':!:dist' \
        ':!:coverage' \
        ':!:.git' \
        ':!:*.log'
      git ls-files --others --exclude-standard \
        ':!:node_modules' \
        ':!:dist' \
        ':!:coverage' \
        ':!:.git' \
        ':!:*.log'
    else
      find . \
        \( -path './node_modules' -o -path './dist' -o -path './coverage' -o -path './.git' \) -prune \
        -o -type f -print \
        | sed 's#^\./##'
    fi
  } | sort -u | while IFS= read -r file; do
    if is_scratch_file "$file" && [ "$include_scratch" != "1" ]; then
      continue
    fi

    case "$file" in
      package-lock.json|pnpm-lock.yaml|yarn.lock)
        if [ "$include_lockfile" = "1" ]; then
          printf '%s\n' "$file"
        fi
        ;;
      node_modules/*|dist/*|coverage/*|.git/*|*.log)
        ;;
      *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.html|*.md|*.yml|*.yaml|*.sh|.gitignore)
        printf '%s\n' "$file"
        ;;
    esac
  done
}

{
  echo "# Actionable project dump: ${PROJECT_NAME}"
  echo
  echo "Generated at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo
  echo "Project root: <PROJECT_ROOT>"
  echo
  echo "Purpose: give a reviewer enough context to extend and refactor this project without needing hidden assumptions."
  echo
  echo "Recommended use:"
  echo
  echo '```bash'
  echo "./scripts/dump-actionable.sh > facet-context.md"
  echo '```'
} | emit

section "Project intent" | emit

cat <<'INTENT' | emit
Facet is a TypeScript toolkit for building interactive UI denotationally.

Design stance:
- Facet is a toolkit, not a full application framework.
- The core should define an abstract UI algebra, not commit users to one representation.
- Concrete representations and platform interpreters live outside the core.
- Views should be pure denotations.
- App meaning, state transitions, effects, routing, data fetching, forms, styling systems, and animation should remain outside the core unless deliberately added as separate packages/layers.
- The current implementation is intentionally simple and law-oriented.
INTENT

section "Architecture map" | emit

cat <<'ARCH' | emit
Expected conceptual layers:

1. Meaning layer
   Domain model, business concepts, invariants, workflows.
   Facet should not own this.

2. Interaction/application layer
   State transitions, update functions, event interpretation, commands/effects.
   Facet should not own this in core.

3. Representation layer
   Pure projection from meaning/state to interactive UI denotation.
   Facet provides the UI ADT used here.

4. Representation implementation
   One concrete implementation of the abstract UI algebra.
   Current implementation: immutable tree.

5. Platform interpreter
   Interprets a UI denotation into a concrete target.
   Current implementation: DOM renderer.

6. Tooling ecosystem
   Possible future packages: forms, resources, router, animation, devtools, server renderer, diffing DOM renderer.
ARCH

section "Privacy note" | emit

cat <<'PRIVACY' | emit
This dump is intended to be shareable with an LLM or reviewer.

The script attempts to sanitize:
- the user's home directory
- the absolute project root

Still review before sharing. Source files may contain secrets, names, paths, URLs, tokens, or other sensitive data that a generic sanitizer cannot safely infer.
PRIVACY

section "Current file tree" | emit

{
  printf '```txt\n'
  print_tree | while IFS= read -r file; do
    if is_scratch_file "$file" && [ "$include_scratch" != "1" ]; then
      continue
    fi

    case "$file" in
      package-lock.json|pnpm-lock.yaml|yarn.lock)
        if [ "$include_lockfile" = "1" ]; then
          printf '%s\n' "$file"
        fi
        ;;
      *)
        printf '%s\n' "$file"
        ;;
    esac
  done
  printf '```\n'
} | emit

section "Package metadata" | emit

fence_file package.json
fence_file tsconfig.json
fence_file vite.config.ts
fence_file vitest.config.ts
fence_file index.html
fence_file .gitignore
fence_file README.md
fence_file CONTRIBUTING.md

section "Source files" | emit

tracked_or_relevant_files | while IFS= read -r file; do
  case "$file" in
    src/*)
      fence_file "$file"
      ;;
  esac
done

section "Test files" | emit

tracked_or_relevant_files | while IFS= read -r file; do
  case "$file" in
    test/*|tests/*|__tests__/*)
      fence_file "$file"
      ;;
  esac
done

section "Script files" | emit

tracked_or_relevant_files | while IFS= read -r file; do
  case "$file" in
    scripts/*)
      fence_file "$file"
      ;;
  esac
done

section "Git status" | emit

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  {
    printf '```txt\n'
    git status --short
    printf '```\n'
  } | emit
else
  echo "Not a git repository, or git is unavailable." | emit
fi

section "Available npm scripts" | emit

if command -v npm >/dev/null 2>&1; then
  {
    printf '```txt\n'
    npm run 2>/dev/null || true
    printf '```\n'
  } | emit
else
  echo "npm is unavailable." | emit
fi

section "Dependency summary" | emit

if command -v npm >/dev/null 2>&1 && [ -f package.json ]; then
  {
    printf '```txt\n'
    npm ls --depth=0 2>/dev/null || true
    printf '```\n'
  } | emit
else
  echo "npm/package.json unavailable." | emit
fi

section "Tool versions" | emit

{
  printf '```txt\n'

  if [ -x ./node_modules/.bin/tsc ]; then
    printf 'typescript: '
    ./node_modules/.bin/tsc --version
  else
    echo "typescript: not found at ./node_modules/.bin/tsc"
  fi

  if [ -x ./node_modules/.bin/vitest ]; then
    printf 'vitest: '
    ./node_modules/.bin/vitest --version
  else
    echo "vitest: not found at ./node_modules/.bin/vitest"
  fi

  if [ -x ./node_modules/.bin/vite ]; then
    printf 'vite: '
    ./node_modules/.bin/vite --version
  else
    echo "vite: not found at ./node_modules/.bin/vite"
  fi

  if command -v node >/dev/null 2>&1; then
    printf 'node: '
    node --version
  fi

  if command -v npm >/dev/null 2>&1; then
    printf 'npm: '
    npm --version
  fi

  printf '```\n'
} | emit

if [ "$run_check" = "1" ]; then
  section "Current check output" | emit

  {
    printf '```txt\n'
    npm run check
    printf '```\n'
  } 2>&1 | emit
fi

section "Actionable refactor guidance" | emit

cat <<'GUIDANCE' | emit
When extending or refactoring Facet, preserve these constraints unless intentionally changing the design:

- Keep `src/core` representation-agnostic.
- Do not import from `src/tree` or `src/dom` inside `src/core`.
- Keep app state and update functions outside the Facet core.
- Prefer adding laws/tests before optimizing implementation.
- Treat the tree representation as one model, not the definition of the toolkit.
- Treat the DOM renderer as an interpreter, not as the semantic source of truth.
- Avoid adding JSX, hooks, resources, routing, or effects to core prematurely.
- If adding a feature, first ask which layer owns it:
  - core ADT
  - concrete representation
  - interpreter
  - example app shell
  - separate toolkit package
- If optimizing patch/diffing, preserve observable equivalence with the simple remounting renderer, except where explicit identity laws promise preservation.
GUIDANCE

section "Suggested next tasks" | emit

cat <<'TASKS' | emit
High-value next tasks:
1. Add a test renderer that produces a normalized textual or JSON view.
2. Add more ADT laws:
   - keyed does not alter emitted events
   - patch preserves same-tag identity where promised
   - patch replaces different-tag identity
3. Expand the DOM reconciler:
   - keyed child reconciliation
   - better attribute/property removal semantics
   - more selection/cursor preservation tests
4. Add event delegation so large lists do not create one listener per node.
5. Add a semantic representation layer above concrete UI:
   - action
   - field
   - region
   - collection
6. Initialize git and commit the v0 scaffold.
7. Consider splitting packages after the seams stabilize:
   - @facet/core
   - @facet/tree
   - @facet/dom
   - @facet/test
TASKS

section "End" | emit
echo "End of actionable project dump." | emit
