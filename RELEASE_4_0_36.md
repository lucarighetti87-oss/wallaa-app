# Wallaa 4.0.36 — Home rebuild from supplied React/CSS reference

## Scope
Release focused on the real Home screen. The React/CSS supplied by the customer is used as the visual reference and translated into the existing Wallaa architecture without replacing the app logic.

## Preserved behavior
- Existing account/session logic
- Existing Wallaa Button BLE state and telemetry
- Existing 3-second hold-to-SOS flow and release-to-cancel behavior
- Existing EmergencyDispatch / active alert behavior
- Existing Guardian Mode route
- Existing Contacts, Map, Safety Network and Activity routes
- Existing security test flow
- Existing notification button and side menu
- Existing backend/API behavior

## Home visual rebuild
- Dedicated isolated `w36-*` visual layer to prevent legacy CSS overrides
- Dark `#020712` canvas with cyber grid
- Holographic globe overlay with animated nodes
- Compact glass top bar
- Neon glass system and device cards
- Live status pulse
- Wallaa Button render retained and integrated into the new card
- Three animated SOS radar waves and crosshair
- Press feedback on SOS without selectable iOS text
- 2x2 premium action grid
- Dark fixed bottom dock with active cyan glow
- Entrance micro-animations and reduced-motion support

## Version
- Marketing Version: 4.0.36
- Build: 39
