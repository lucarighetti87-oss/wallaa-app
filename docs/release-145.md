# App 4.0.145 — adaptive Sentinel energy and map key

Ordinary Sentinel in background no longer retains CLBackgroundActivitySession or starts continuous standard location updates. Significant-change monitoring remains active only with explicit availability and Always permission; entry into standby requests one moderate fix. Repeated configuration reconciliation cannot restart it. Foreground ordinary updates use 100m desired accuracy/distance and automatic pauses. System movement callbacks and opportunistic timer ticks share a five-minute upload budget; missing fixes are requested at most every five minutes while iOS grants execution. Visible membership/GPS polling also uses five-minute cadence. No wall-clock background delivery guarantee is made, especially while stationary or after force quit.

The existing 25-second SOS push refresh, 60-second wake cooldown, fresh accurate GPS gate and precise accepted-intervention/own-SOS mode remain intact. Only emergency/wake may retain a background activity session. Ending them restores standby; opt-out and permission loss stop monitoring. No coordinates or capture times are fabricated.

Requires backend 4.0.89 for consistent ten-minute map/admin readiness. Assignment/acceptance freshness stays at the existing 90-second default and bounded stale-candidate refresh remains unchanged. A green map reference is approximate readiness, not an accepted intervention or guaranteed present location. Stationary devices may still become unconfirmed if iOS sends no event; reopening the app or an actually delivered refresh can update them.

Map now includes a collapsible illustrated key: colored/green means recently confirmed availability; gray/dim means last-known unconfirmed. Decorative pulses do not mean rescue acceptance. Help uses the same explanations.

Validation: 86 unit tests; 6 WebKit map/legend checks; actual Swift policy/heartbeat/wake harnesses including standby idempotence, emergency recovery and session release. Signed iOS archive succeeds. Battery savings and hour-long locked movement require physical energy measurement; no reduction percentage is asserted. Not yet published or uploaded.
