# GEMINI.md

## Verification before writing code

Do not write code against a function, type, or API signature from memory/training data. Confirm it first:

- Before editing a file, read the actual current contents of that file — not just the snippet pasted into the chat.
- Before calling a function or type you didn't just write, grep for its definition and other call sites in this repo. Match the signature that's actually there, not the one you'd expect.
- Before using a third-party library API, open its real type definitions or source and confirm the signature — for TS/JS check `node_modules/<pkg>/**/*.d.ts`, for JVM check the decompiled class or attached sources jar, for Python check the installed package source. Do not guess from what the API "usually" looks like.
- If files related to the one you're editing exist (types/interfaces, tests, config, callers), check them before finalizing an answer — a change that's locally correct but breaks a caller isn't correct.

## Pace

Optimize for a correct first answer, not a fast first answer. A response that's wrong costs more (multiple correction rounds) than one that took an extra tool call to verify. If you're not sure a signature/path/type is right, check it — don't ship the guess and let the user catch it.

## After editing

Re-read the diff against the surrounding code's actual conventions (naming, error handling, import style) before presenting it as done. If the edit assumes a dependency version or config value, confirm it against `package.json`/lockfile/config rather than assuming.
