# Wallaa 4.0.139

Supersedes uploaded build 138: the final audit found two UI connection/readiness checks that still restricted native H1 transport to single click. Native connection ownership now depends only on device type, continuous-mode preference and iOS capability, independently of SOS gesture. This keeps true readiness and disconnect detection when selecting double click.

Includes all 138 SOS gesture, Sentinel foreground recovery and admin compatibility changes. One new regression test covers native transport ownership and disconnected readiness for both gestures. No real SOS sent. Physical iPhone/pocket-click and battery tests remain outstanding.
