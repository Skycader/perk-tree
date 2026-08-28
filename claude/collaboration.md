# How this user works, and what they expect

## Verify in the real usage path, not a convenient stand-in

A connector-line bug was once declared fixed after testing via the
easy-to-reach startup notes popup (`#notes-popup`) — the real bug only
showed up inside an actual perk tooltip, which the user caught immediately
with a screenshot. The simplified test passed every DOM/computed-style
check while the real one silently failed for an unrelated reason (SVG
namespace — see `gotchas.md`).

**For any UI fix**: reproduce and verify inside the actual feature's real
trigger path before reporting success, not a simpler nearby component just
because it's more convenient to script. Passing computed-style/DOM checks
is not sufficient proof — see `dev-workflow.md`'s pixel-diff technique for
when a screenshot isn't obtainable.

## An unanswered `AskUserQuestion` is not consent

Twice, a clarifying question came back with no answer, and the response
was to proceed anyway with the "(Рекомендуется)" option. The user
corrected this explicitly: "не ответил, так на паузу ставить диалог прежде
чем продолжать" (didn't answer → pause before continuing).

**If a clarifying question genuinely needs the user's input and comes back
unanswered, stop and wait** rather than picking the recommended option and
moving forward. Say what you're waiting on, then hold the turn. Only
proceed without an explicit answer if the user's own next message
resolves it in passing — never on the assumption that "recommended"
defaults are safe to auto-select.

## Communication style

Short, blunt correction messages are the norm ("No, still missing!",
"Карое плохо... плевать" — "that's bad, don't care, just do X"). When a
trade-off is stated explicitly ("at the cost of X, don't care"), take it
as final direction, not a soft preference to weigh against other concerns.
Expect the next iteration to actually resolve the issue, not another round
of the same reasoning restated.

## Memory lives in the repo now, not just locally

Claude's local per-machine memory (`~/.claude/projects/.../memory/`)
doesn't travel to another computer. Durable project facts (architecture
gotchas, lore, this file) belong in `claude/` in this repo instead, so a
fresh session on any machine has the same context. Local memory is still
fine for genuinely session-scoped or in-progress state, but anything worth
keeping long-term should end up here.
