# REVIEW.md

How changes to this repo are reviewed. The `step-reviewer` agent reads this
file at every step checkpoint, and `dev-tools:code-review` reads it at the
branch-wide pass. The coding standards and the review checklist apply on top
of it; where this file speaks, it wins.

Edit any section by hand. `dev-tools:implement` appends to "Learned rules"
when the user answers a stop with `undo <n>` or `missed <what>`; the
PR diff is where those rules are approved.

## What to check

- **What a caller sees.** A changed signature, flag, file path, config key
  or output format, and every caller that still uses the old one.
- **What the step's plan line asked for.** A missing part, or a part nobody
  asked for.
- **Errors and edge cases.** An empty input, a missing file, a failed
  command, a second run over the same state.
- **A missing test**, only one the test limit in
  `~/.claude/skills/dev-tools/skills/tdd/SKILL.md` asks for. A test the
  limit does not ask for is never missing.
- **Data and state that outlive the run.** A migration, a written file, a
  deleted path, a pushed commit: anything a rerun cannot undo.
- **Secrets.** A credential, token or personal detail in code, a log line or
  a committed file.

## What to ignore

- Anything the formatter, linter or type checker enforces.
- Style the repo's own standards endorse.
- A wording preference in prose or a comment that keeps the meaning.
- A speculative risk with no input that triggers it.

## How to report

Every finding gets one class:

- **ignore**: a rule under "What to ignore", or an `ignore:` line under
  "Learned rules", drops it. It is counted, never shown.
- **fix**: one clear fix exists, whether a command confirmed it (a test, a
  grep, a render, a script on a fixture) or the reviewer judged it from the
  code against a written rule. The reviewer gives the evidence and the fix.
  The implementer makes it without asking, as its own commit.
- **decide**: the fix needs a design choice between real alternatives, in
  architecture or research design. The reviewer gives the `file:line`, the
  choice, the options and a severity. Only this class stops for the user.

A `decide` item's severity weighs what the wrong choice costs, not how large
the hunk is:

- **high**: users, data or other people's work suffer, and nothing
  downstream catches it before they do.
- **medium**: a caller or the user notices wrong behaviour, but it is
  recoverable or a later check would catch it.
- **low**: everything else. Counted, never shown.

## How to test

The commands the reviewer may run to confirm a finding, from the repo root.
The reviewer always runs `~/.claude/scripts/check.sh` on the range itself,
which detects the formatter, linter, type checker and tests; list here, one
per line, what it cannot find.

## Learned rules

One line per rule, newest last, written from the replies at a stop: `undo <n>` writes an `ignore:` rule, `missed <what>` writes a
`check:` rule. An `ignore:` line drops items like "What to ignore"; a
`check:` line is checked like "What to check". The shape is
`- <ignore|check>: <the rule> · <date> <slug> step <n> · "<the reply's
words>" · by <user | main session>`, the words being the reply for that
item and the ending who replied (`dev-tools:implement`, "Learn from the
reply").
