# Implementation Plan - Reconstructing TaskManager, Shared State Isolation, and Mobile UI Repair

This plan outlines the design and implementation steps to fix critical architectural bugs, resolve screen layout issues on mobile devices, restore task configurations in `TaskManager.tsx`, and add the requested advanced quantum challenges.

---

## User Review Required

> [!IMPORTANT]
> **1. Isolation of Shared State between Exam and Challenges**:
> - We will isolate the `CircuitBuilder` configurations so that constraints like `allowedGates`, `lockQubits`, `lockInitialStates`, and `allowedParams` apply **only** when `appMode === 'challenges'`.
> - In `exam` (Ticket) mode, the constructor will remain fully unlocked to allow students to build and test custom solutions freely without leakage of active challenge locks.
> - We will fix potential tab rendering issues where switching mode leaves `activeTab` on an invalid state (e.g. `'simulator'` or `'results'` in challenges mode), causing blank screens.
>
> **2. Mobile Responsive Layout Fixes**:
> - The current layouts use hardcoded inline widths (e.g. `320px` sidebar) and overflow values. We will convert these layout rules to responsive, class-based styles using CSS Media Queries inside [index.css](file:///Users/alpha7en/Documents/development/quantum_app/src/index.css).
> - On mobile viewports (width < 1024px), the sidebar will transition to a collapsible menu drawer or a sleek top header navigation bar.
> - We will ensure that tab buttons, gates grid, matrices, and control panels wrap correctly and scale down to fit smaller screens (using touch-friendly padding and min-width constraints).
>
> **3. Task Definitions & Recovery**:
> - We will recover the corrupted `grover-diffuser-2` and `qft-3` tasks, restore the missing `qpe-2` and `entanglement-swapping` tasks, and add 4 new advanced educational tasks (`deutsch-jozsa-3q`, `vqe-h2-ansatz`, `qec-syndrome-measurement`, `qpe-3`).
> - We will order all challenges by difficulty (`easy` -> `medium` -> `hard` -> `extreme`) and display them grouped under headers in the sidebar.

---

## Proposed Changes

### 1. Task Recovery and Additions
#### [MODIFY] [TaskManager.tsx](file:///Users/alpha7en/Documents/development/quantum_app/src/TaskManager.tsx)
- Prune the duplicated/corrupted task definitions from line 763 onwards.
- Clean up the target generator helpers (`generateQft3Matrix`, `generateEntanglementSwappingTarget`, `generateQecTargetState`).
- Write new helpers:
  - `generateQecSyndromeTargetState()` (for phase-flip syndrome measurement).
  - `generateQpe3TargetState()` (for 3-bit QPE phase analysis).
- Add new and recovered tasks to `challengeTasks`:
  - **`deutsch-jozsa-3q` (Medium)**: 3-qubit Deutsch-Jozsa with balanced oracle.
  - **`vqe-h2-ansatz` (Hard)**: Hartree-Fock excitation ansatz state preparation.
  - **`qec-syndrome-measurement` (Hard)**: Phase flip error syndrome collection.
  - **`qpe-3` (Extreme)**: 3-bit QPE of $T$-gate phase, utilizing 3 estimation qubits and 1 target qubit.
- Order all challenges inside `challengeTasks` by difficulty.

### 2. State Isolation & Sidebar Sorting
#### [MODIFY] [App.tsx](file:///Users/alpha7en/Documents/development/quantum_app/src/App.tsx)
- Adjust the `CircuitBuilder` instantiation in `App.tsx` so that `allowedGates`, `lockQubits`, `lockInitialStates`, and `allowedParams` are passed as `undefined` when `appMode !== 'challenges'`.
- In `switchActiveItem`, make sure that when transitioning modes, the `activeTab` updates to a valid selection (`'theory'` or `'constructor'` for challenges mode, or `'theory'` for exam mode if the active tab is not valid in exam mode).
- Group challenges by difficulty and render category sections in the Sidebar.

### 3. Responsive Styling and Layouts
#### [MODIFY] [index.css](file:///Users/alpha7en/Documents/development/quantum_app/src/index.css)
- Add styling for the collapsible or mobile-friendly sidebar and main workspace layout.
- Ensure buttons, the gate list, and the quantum circuit grid scale properly on touch viewports.
- Optimize table, matrix, and Bloch sphere containers to prevent scrolling issues or content truncation.

---

## Verification Plan

### Automated Tests
- Build project using `npm run build` to verify clean TypeScript compilation.

### Manual Verification
- View the app in a web browser using mobile device simulation.
- Verify that switching modes clears locked gates in the constructor grid.
- Verify that all challenges are correctly listed and categorized.
