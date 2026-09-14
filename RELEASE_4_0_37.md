# Wallaa 4.0.37 — Home rebuilt from supplied visual assets

## Scope
This release changes the Home presentation while preserving the existing Wallaa application architecture and functional handlers.

## New supplied assets
- `public/bg-grid.png`
- `public/wallaa-button.png`
- `public/globe.png`

## Home visual changes
- perspective sci-fi grid uses the supplied background image;
- holographic globe uses the supplied globe asset with screen blending;
- Wallaa Button card uses the supplied hardware render;
- glass/neon cards and cyan border/glow system rebuilt from the supplied CSS direction;
- SOS radar waves, red core glow, hold feedback and crosshair retained as visual feedback;
- Home dock restyled to match the supplied navigation design;
- responsive rules added for smaller iPhones;
- reduced-motion support retained.

## Functional behavior preserved
- real SOS handlers remain `onSOSStart` / `onSOSCancel`;
- device state and battery remain live from Wallaa telemetry;
- Guardian Mode, contacts, map, Safety Network and security check retain the existing navigation/functions;
- top menu and notifications remain wired through the real Wallaa App shell;
- no demo `alert()` or fake navigation from the sample code was introduced.

## Version
- Marketing version: 4.0.37
- Build: 40
