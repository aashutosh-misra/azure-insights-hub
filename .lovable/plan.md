# Restructure: Project → Core → Modules → Test Cases

## 1. Clean page headers
Remove the KPI/stat strips currently sitting at the top of every page (Test Cases, Modules, Execution, Defects, Tasks, etc.) and the count badges in the sidebar. Pages start directly with title + actions + content. The Dashboard keeps its KPIs — that is its purpose.

## 2. Projects get a Core type
Each project gains a **Core** (Symitar, DNA, Keystone, Portico, Other — editable list) plus the existing owner/status/dates. Core is shown in the Projects page, selectable when creating a project, and used to decide which central library a project can pull test cases from.

## 3. Modules = scope of a project
Modules stay the scope container and are explicitly bound to one project (project picker becomes required, list is filtered by the active project). Deleting a project warns about its modules.

## 4. Test cases live inside a project module
- Every test case must belong to a module of the active project; the module picker is filtered accordingly.
- Test cases inherit project + core from their module (no more free-floating cases).

## 5. Import from Excel/CSV with automatic header mapping
New **Import** dialog on Test Cases:
- Accepts .csv and .xlsx.
- Step 1: pick target project + module.
- Step 2: auto-detects columns. A mapping engine matches raw headers (e.g. "TC Title", "Test Scenario", "Expected Result", "Steps to reproduce", "Sev") to the app's fields using normalised synonym matching, so the predefined template *and* raw exports both work.
- Step 3: mapping preview table the user can correct per column, then import with a row-count summary.
- "Download template" link produces the predefined CSV template.

## 6. Central test case repository (COE)
New **Repository** page: a core-wise master library (Symitar / DNA / …) independent of projects.
- Browse and search library cases by core, module-area and tags.
- Multi-select → **Copy to project**: choose target project + module; copies are new, editable test cases in that project (edits never touch the master).
- Cases from a project can also be **published to the library** for the matching core.
- Library supports the same Excel/CSV import.

## 7. Execution and Dashboard by project and module
- Execution page: project selector + module selector, with per-module execution progress (executed / pass / fail / blocked) and a module summary table.
- Dashboard and Insights gain a module filter alongside the existing project scope, so all KPIs, charts and tables recompute for a single module when selected.

## Technical notes
- `Project` gains `core`; `QaModule` keeps `proj` and is validated against projects; new `libraryCases` collection (core-scoped) in the QA state, persisted in localStorage like the rest.
- Header-mapping is deterministic local logic (synonym dictionary + fuzzy match) — no backend needed and works offline. If you'd prefer an AI-model-based mapper for messy files, that needs Lovable Cloud enabled; say the word and I'll add it.
- xlsx parsing via the `xlsx` package; CSV parsed locally.
- Sidebar gains "Repository" under Test Management; stat badges removed.
