# Refactoring Plan

## Phase 1: Remove Dead Code (Low Risk)

- Delete `compareOfferSizes()` method and test code
- Remove unused `controlsTimer` and `controlsVisible` properties
- Clean up commented CSS and code

## Phase 2: Extract Constants & Configuration

- Create `CONFIG` object for all magic numbers
- Extract icon SVGs into separate constants
- Centralize error messages

## Phase 3: Modular Refactoring (High Impact)

Split monolithic class into:

- **`ConnectionManager`**: WebRTC peer connection logic
- **`QRCodeService`**: QR generation/decoding
- **`UIController`**: DOM manipulation and state
- **`StateManager`**: App state machine

## Phase 4: Fix Bugs & Improve Reliability

- Add connection cleanup on errors
- Increase ICE timeout, add retry logic
- Fix browser history handling
- Add debouncing to button handlers

## Phase 5: Code Quality Improvements

- Add TypeScript (optional, high effort)
- Extract duplicate media PC setup into shared method
- Standardize error handling pattern
- Add JSDoc comments

## Phase 6: Performance & UX

- Lazy-load QR libraries
- Add connection quality indicators
- Improve error messages with recovery actions
- Add retry mechanisms

**Recommended order: 1 → 2 → 4 → 3 → 5 → 6** (quick wins first, then structural changes)
