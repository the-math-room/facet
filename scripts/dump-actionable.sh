#!/usr/bin/env bash
set -euo pipefail

# Dump project code and official repository docs for review.
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

print_files() {
  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    {
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
    } | sort -u
    return 0
  fi

  find . \
    \( -path './node_modules' -o -path './dist' -o -path './coverage' -o -path './.git' \) -prune \
    -o -type f -print \
    | sed 's#^\./##' \
    | sort -u
}

included_files() {
  print_files | while IFS= read -r file; do
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
      *.ts|*.tsx|*.js|*.jsx|*.cjs|*.mjs|*.json|*.css|*.html|*.md|*.yml|*.yaml|*.sh|.gitignore)
        printf '%s\n' "$file"
        ;;
    esac
  done
}

{
  echo "# Project dump: ${PROJECT_NAME}"
  echo
  echo "Generated at: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  echo
  echo "Project root: <PROJECT_ROOT>"
  echo
  echo "Usage:"
  echo
  echo '```bash'
  echo "./scripts/dump-actionable.sh > ${PROJECT_NAME}-context.md"
  echo '```'
} | emit

section "File tree" | emit

{
  printf '```txt\n'
  included_files
  printf '```\n'
} | emit

section "Package and config files" | emit

for file in \
  package.json \
  tsconfig.json \
  vite.config.ts \
  vitest.config.ts \
  index.html \
  .gitignore
do
  fence_file "$file"
done

if [ "$include_lockfile" = "1" ]; then
  for file in package-lock.json pnpm-lock.yaml yarn.lock; do
    fence_file "$file"
  done
fi

section "Official repository docs" | emit

for file in \
  README.md \
  CONTRIBUTING.md \
  CHANGELOG.md \
  LICENSE \
  LICENSE.md \
  CODE_OF_CONDUCT.md \
  SECURITY.md
do
  fence_file "$file"
done

section "Source files" | emit

included_files | while IFS= read -r file; do
  case "$file" in
    src/*)
      fence_file "$file"
      ;;
  esac
done

section "Test files" | emit

included_files | while IFS= read -r file; do
  case "$file" in
    test/*|tests/*|__tests__/*)
      fence_file "$file"
      ;;
  esac
done

section "Script files" | emit

included_files | while IFS= read -r file; do
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

section "NPM scripts" | emit

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

section "End" | emit
echo "End of project dump." | emit
