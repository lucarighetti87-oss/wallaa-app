import UIKit
import Capacitor
import CoreBluetooth
import CoreLocation
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private lazy var wallaaBackgroundBLE = WallaaBackgroundBLEManager.shared
    private var wallaaStartupScheduled = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Keep launch lightweight. Release/TestFlight can be less tolerant of native
        // subsystem initialization before UIApplication has completed launch.
        // Start the native BLE monitor on the next main-loop turn instead.
        scheduleWallaaNativeStartup()
        application.applicationIconBadgeNumber = 0
        logWallaaNotificationState()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Cover the short active -> inactive -> background transition too, so a button
        // press while the user locks the phone or leaves the app is not lost.
        wallaaBackgroundBLE.enterBackgroundMode()
    }
    func applicationDidEnterBackground(_ application: UIApplication) {
        wallaaBackgroundBLE.enterBackgroundMode()
    }
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {
        wallaaBackgroundBLE.enterForegroundMode()
        application.applicationIconBadgeNumber = 0
    }
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }

    private func scheduleWallaaNativeStartup() {
        guard !wallaaStartupScheduled else { return }
        wallaaStartupScheduled = true
        NSLog("[WALLAA][BOOT] native startup scheduled")
        // Core Bluetooth state restoration works best when the restoration manager is
        // recreated as early as possible on every process launch. Defer only one run-loop
        // turn so UIKit/Capacitor can finish didFinishLaunching safely.
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            NSLog("[WALLAA][BOOT] starting background BLE manager")
            self.wallaaBackgroundBLE.start()
        }
    }

    private func logWallaaNotificationState() {
        let sirenExists = Bundle.main.url(forResource: "wallaa-guardian-siren", withExtension: "wav") != nil
        NSLog("[WALLAA][PUSH] guardian siren bundled=\(sirenExists)")
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            NSLog("[WALLAA][PUSH] authorization=\(settings.authorizationStatus.rawValue) sound=\(settings.soundSetting.rawValue) alert=\(settings.alertSetting.rawValue)")
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
}

// MARK: - Native background Wallaa Button monitor

private struct WallaaNativePermissions: Codable {
    let sosAlerts: Bool?
    let liveLocation: Bool?
    let disconnectAlerts: Bool?
}

private struct WallaaNativeContact: Codable {
    let name: String?
    let email: String?
    let phone: String?
    let role: String?
    let permissions: WallaaNativePermissions?
}

private struct WallaaNativeProfile: Codable {
    let firstName: String?
    let lastName: String?
    let name: String?
    let phone: String?
    let safetyWord: String?
    let language: String?
}

private struct WallaaNativeIdentity: Codable {
    let installationId: String?
    let authToken: String?
}

private struct WallaaNativeConfig: Codable {
    let version: Int?
    let armed: Bool
    let trigger: String
    let apiUrl: String
    let deviceId: String
    let hardwareId: String?
    let claimToken: String?
    let profile: WallaaNativeProfile
    let contacts: [WallaaNativeContact]
    let identity: WallaaNativeIdentity
}

private struct WallaaDecodedButton {
    let packetId: Int?
    let battery: Int?
    let buttonCode: Int
    let event: String
}

private final class WallaaBackgroundBLEManager: NSObject, CBCentralManagerDelegate, CLLocationManagerDelegate {
    static let shared = WallaaBackgroundBLEManager()

    private let serviceUUID = CBUUID(string: "FCD2")
    private let restoreIdentifierDefaultsKey = "wallaa.native.ble.restore.identifier"
    private let configDefaultsKey = "CapacitorStorage.wallaa.safe.background.config"
    private let nativeAlertDefaultsKey = "CapacitorStorage.wallaa.safe.native.alert"
    private let activeAlertDefaultsKey = "CapacitorStorage.wallaa.safe.active.alert"

    private var central: CBCentralManager?
    private let locationManager = CLLocationManager()
    private var config: WallaaNativeConfig?
    private var lastFingerprint = ""
    private var lastFingerprintAt = Date.distantPast
    private var pendingButton: WallaaDecodedButton?
    private var pendingPeripheralId = ""
    private var locationTimeout: DispatchWorkItem?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid
    private var sending = false
    private var liveAlertId = ""
    private var livePublishing = false
    private var liveLastSentAt = Date.distantPast
    private var scanRearmWorkItem: DispatchWorkItem?
    private var lastScanStartedAt = Date.distantPast
    private var lastTargetDiscoveryAt = Date.distantPast

    private var restoreIdentifier: String {
        if let saved = UserDefaults.standard.string(forKey: restoreIdentifierDefaultsKey), !saved.isEmpty { return saved }
        // Keep a deterministic value for existing installations while also persisting it,
        // as recommended for UIScene-based apps.
        let value = "it.wallaa.safebutton.background.central.v407"
        UserDefaults.standard.set(value, forKey: restoreIdentifierDefaultsKey)
        return value
    }

    private override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
        locationManager.distanceFilter = kCLDistanceFilterNone
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.showsBackgroundLocationIndicator = false
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(userDefaultsDidChange),
            name: UserDefaults.didChangeNotification,
            object: UserDefaults.standard
        )
        // CBCentralManager is intentionally created by start(), after app launch.
        // This avoids touching Bluetooth while UIApplication/Capacitor is still bootstrapping.
    }

    @objc private func userDefaultsDidChange() {
        // Capacitor Preferences writes the active SOS alert into UserDefaults.
        // Refresh immediately so native CoreLocation starts while the app is still
        // foregrounded, before the user locks the phone or opens the Guardian link.
        DispatchQueue.main.async { [weak self] in
            self?.refreshConfiguration()
        }
    }

    func start() {
        if central == nil {
            NSLog("[WALLAA][BLE] creating CBCentralManager restore=\(restoreIdentifier)")
            central = CBCentralManager(
                delegate: self,
                queue: nil,
                options: [
                    CBCentralManagerOptionRestoreIdentifierKey: restoreIdentifier,
                    CBCentralManagerOptionShowPowerAlertKey: false
                ]
            )
        }
        refreshConfiguration()
        // Foreground scanning is owned by the established Capacitor/BTHome monitor.
        // The native central is reserved for background/restoration to avoid two scanners
        // competing for the same event stream.
        if UIApplication.shared.applicationState == .active {
            stopNativeScan(reason: "foreground-start")
        } else if central?.state == .poweredOn {
            startScanIfNeeded(forceRestart: true, reason: "background-start")
        }
    }

    func enterBackgroundMode() {
        NSLog("[WALLAA][BLE] entering background mode")
        refreshConfiguration()
        startScanIfNeeded(forceRestart: true, reason: "did-enter-background")
    }

    func enterForegroundMode() {
        NSLog("[WALLAA][BLE] entering foreground mode")
        refreshConfiguration()
        stopNativeScan(reason: "did-become-active")
    }

    func refreshConfiguration() {
        guard let raw = UserDefaults.standard.string(forKey: configDefaultsKey),
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode(WallaaNativeConfig.self, from: data) else {
            NSLog("[WALLAA][BLE] background config unavailable")
            config = nil
            stopNativeScan(reason: "missing-config")
            return
        }
        config = decoded
        refreshLiveTrackingFromDefaults()
        if UIApplication.shared.applicationState != .active, central?.state == .poweredOn {
            startScanIfNeeded(reason: "config-refresh")
        }
    }

    private func configurationAllowsBackgroundSOS() -> Bool {
        guard let config else { return false }
        return config.armed && !config.deviceId.isEmpty && !(config.identity.authToken ?? "").isEmpty
    }

    private func stopNativeScan(reason: String) {
        scanRearmWorkItem?.cancel()
        scanRearmWorkItem = nil
        guard let central, central.isScanning else { return }
        NSLog("[WALLAA][BLE] stop scan reason=\(reason)")
        central.stopScan()
    }

    private func startScanIfNeeded(forceRestart: Bool = false, reason: String = "normal") {
        guard let central else { return }
        guard UIApplication.shared.applicationState != .active else {
            stopNativeScan(reason: "foreground-guard")
            return
        }
        guard configurationAllowsBackgroundSOS() else {
            stopNativeScan(reason: "configuration-disabled")
            return
        }
        if forceRestart && central.isScanning { central.stopScan() }
        if !central.isScanning {
            NSLog("[WALLAA][BLE] start background scan reason=\(reason)")
            // iOS ignores AllowDuplicates while backgrounded. We explicitly re-arm the
            // scan after every target discovery so a later button advertisement from the
            // same peripheral can generate a fresh delegate callback.
            central.scanForPeripherals(withServices: [serviceUUID], options: nil)
            lastScanStartedAt = Date()
        }
    }

    private func rearmBackgroundScan(reason: String) {
        guard UIApplication.shared.applicationState != .active else { return }
        guard configurationAllowsBackgroundSOS() else { return }
        scanRearmWorkItem?.cancel()
        central?.stopScan()
        let work = DispatchWorkItem { [weak self] in
            guard let self else { return }
            self.startScanIfNeeded(forceRestart: false, reason: "rearm-\(reason)")
        }
        scanRearmWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.22, execute: work)
    }

    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        NSLog("[WALLAA][BLE] central state=\(central.state.rawValue)")
        if central.state == .poweredOn, UIApplication.shared.applicationState != .active {
            startScanIfNeeded(forceRestart: true, reason: "central-powered-on")
        }
    }

    func centralManager(_ central: CBCentralManager, willRestoreState dict: [String : Any]) {
        let services = dict[CBCentralManagerRestoredStateScanServicesKey] as? [CBUUID] ?? []
        let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] ?? []
        NSLog("[WALLAA][BLE] restored services=\(services.map{$0.uuidString}) peripherals=\(peripherals.map{$0.identifier.uuidString})")
        refreshConfiguration()
        if central.state == .poweredOn {
            startScanIfNeeded(forceRestart: true, reason: "state-restoration")
        }
    }

    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String : Any],
                        rssi RSSI: NSNumber) {
        // Foreground is intentionally handled by the established JS/BTHome core.
        guard UIApplication.shared.applicationState != .active else { return }
        guard let config, config.armed else { return }
        guard peripheral.identifier.uuidString.caseInsensitiveCompare(config.deviceId) == .orderedSame else { return }

        lastTargetDiscoveryAt = Date()
        // Background scans coalesce duplicate discoveries. Re-arm the scan after every
        // advertisement from the paired target, including telemetry-only advertisements,
        // otherwise a later SOS packet from the same peripheral can be swallowed by iOS.
        defer { rearmBackgroundScan(reason: "target-discovery") }

        guard let button = decodeButton(advertisementData: advertisementData) else {
            NSLog("[WALLAA][BLE] target advertisement without supported button event")
            return
        }
        guard triggerMatches(config.trigger, event: button.event) else {
            NSLog("[WALLAA][BLE] button event ignored event=\(button.event) configured=\(config.trigger)")
            return
        }

        let fingerprint = "\(peripheral.identifier.uuidString.lowercased()):\(button.packetId ?? -1):\(button.buttonCode)"
        let now = Date()
        // The prior 12-second duplicate window could suppress a second legitimate SOS if
        // a device omitted/reused packetId. Keep only a short radio-burst debounce.
        let duplicateWindow: TimeInterval = button.packetId == nil ? 1.1 : 1.8
        if fingerprint == lastFingerprint && now.timeIntervalSince(lastFingerprintAt) < duplicateWindow {
            NSLog("[WALLAA][BLE] duplicate burst ignored fingerprint=\(fingerprint)")
            return
        }
        lastFingerprint = fingerprint
        lastFingerprintAt = now
        NSLog("[WALLAA][BLE] BACKGROUND SOS event=\(button.event) packet=\(button.packetId ?? -1) rssi=\(RSSI)")

        triggerBackgroundAlert(button: button, peripheralId: peripheral.identifier.uuidString)
    }

    private func decodeButton(advertisementData: [String: Any]) -> WallaaDecodedButton? {
        guard let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data] else { return nil }
        guard let data = serviceData.first(where: { $0.key.uuidString.uppercased().contains("FCD2") })?.value else { return nil }
        let bytes = [UInt8](data)
        guard bytes.count >= 2 else { return nil }
        if (bytes[0] & 0x01) != 0 { return nil } // encrypted BTHome not supported by current hardware core

        var packetId: Int?
        var battery: Int?
        var buttonCode: Int?
        var i = 1
        while i < bytes.count - 1 {
            let objectId = bytes[i]
            let value = Int(bytes[i + 1])
            if objectId == 0x00 { packetId = value; i += 2; continue }
            if objectId == 0x01 { battery = value; i += 2; continue }
            if objectId == 0x3A { buttonCode = value; i += 2; continue }
            i += 1
        }
        guard let code = buttonCode, let event = eventName(for: code) else { return nil }
        return WallaaDecodedButton(packetId: packetId, battery: battery, buttonCode: code, event: event)
    }

    private func eventName(for code: Int) -> String? {
        switch code {
        case 0x01: return "press"
        case 0x02: return "double_press"
        case 0x03: return "triple_press"
        case 0x04: return "long_press"
        case 0x05: return "long_double_press"
        case 0x06: return "long_triple_press"
        case 0x80, 0xFE: return "hold_press"
        default: return nil
        }
    }

    private func triggerMatches(_ configured: String, event: String) -> Bool {
        if configured == "any_press" {
            return ["press", "double_press", "triple_press", "long_press", "long_double_press", "long_triple_press", "hold_press"].contains(event)
        }
        return configured == event
    }

    private func triggerBackgroundAlert(button: WallaaDecodedButton, peripheralId: String) {
        guard !sending else {
            NSLog("[WALLAA][SOS] background send already in progress; ignoring duplicate burst")
            return
        }
        NSLog("[WALLAA][SOS] preparing native background alert event=\(button.event)")
        sending = true
        pendingButton = button
        pendingPeripheralId = peripheralId
        beginBackgroundTime()

        // Use a recent native location immediately when available. Otherwise request one,
        // but never block the SOS for more than 1.5 seconds.
        if let location = locationManager.location,
           abs(location.timestamp.timeIntervalSinceNow) < 300,
           location.horizontalAccuracy >= 0 {
            sendAlert(location: location)
            return
        }

        let status = locationManager.authorizationStatus
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            locationManager.requestLocation()
            let timeout = DispatchWorkItem { [weak self] in
                guard let self, self.sending else { return }
                self.sendAlert(location: nil)
            }
            locationTimeout = timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: timeout)
        } else {
            sendAlert(location: nil)
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        if sending {
            locationTimeout?.cancel()
            locationTimeout = nil
            sendAlert(location: location)
            return
        }
        if !liveAlertId.isEmpty {
            publishLiveLocation(location)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if sending {
            locationTimeout?.cancel()
            locationTimeout = nil
            sendAlert(location: nil)
        }
    }

    private func sendAlert(location: CLLocation?) {
        guard sending, let config, let button = pendingButton else { finishBackgroundSend(); return }
        locationTimeout?.cancel()
        locationTimeout = nil

        let fullName = [config.profile.firstName, config.profile.lastName]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " ")
        var payload: [String: Any] = [
            "userName": fullName.isEmpty ? (config.profile.name ?? "Utente Wallaa Safe Button") : fullName,
            "userPhone": config.profile.phone ?? "",
            "safetyWord": config.profile.safetyWord ?? "",
            "language": config.profile.language ?? "en",
            "trigger": button.event,
            "device": [
                "name": "Wallaa Button",
                "id": pendingPeripheralId,
                "hardwareId": config.hardwareId ?? "",
                "claimToken": config.claimToken ?? ""
            ],
            "contacts": config.contacts.map { contact in
                [
                    "name": contact.name ?? "",
                    "email": contact.email ?? "",
                    "phone": contact.phone ?? "",
                    "role": contact.role ?? "guardian",
                    "permissions": [
                        "sosAlerts": contact.permissions?.sosAlerts ?? true,
                        "liveLocation": contact.permissions?.liveLocation ?? true,
                        "disconnectAlerts": contact.permissions?.disconnectAlerts ?? true
                    ]
                ] as [String : Any]
            }
        ]
        if let packetId = button.packetId { payload["eventPacketId"] = packetId }
        if let location {
            payload["location"] = [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "accuracy": location.horizontalAccuracy >= 0 ? NSNumber(value: Int(location.horizontalAccuracy.rounded())) : NSNull(),
                "capturedAt": ISO8601DateFormatter().string(from: location.timestamp)
            ]
        } else {
            payload["location"] = NSNull()
        }

        guard let url = URL(string: config.apiUrl),
              let body = try? JSONSerialization.data(withJSONObject: payload) else {
            finishBackgroundSend(); return
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let installationId = config.identity.installationId, !installationId.isEmpty {
            request.setValue(installationId, forHTTPHeaderField: "x-wallaa-installation-id")
        }
        if let token = config.identity.authToken, !token.isEmpty {
            request.setValue(token, forHTTPHeaderField: "x-wallaa-install-token")
        }
        request.httpBody = body

        performAlertRequest(request, button: button, location: location, attempt: 1)
    }

    private func performAlertRequest(_ request: URLRequest, button: WallaaDecodedButton, location: CLLocation?, attempt: Int) {
        NSLog("[WALLAA][SOS] native request attempt=\(attempt)")
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self else { return }
            let http = response as? HTTPURLResponse
            let success = http.map { (200..<300).contains($0.statusCode) } ?? false
            if !success {
                if let error { NSLog("[WALLAA][SOS] native request error=\(error.localizedDescription)") }
                if let http { NSLog("[WALLAA][SOS] native request HTTP=\(http.statusCode)") }
                // eventPacketId makes these retries idempotent on the Wallaa backend.
                // If a device provides no packet id we avoid blind retry duplicates.
                let canRetry = button.packetId != nil && attempt < 3 && UIApplication.shared.backgroundTimeRemaining > 4
                if canRetry {
                    let delay = attempt == 1 ? 0.9 : 1.8
                    NSLog("[WALLAA][SOS] scheduling retry in \(delay)s")
                    DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                        self?.performAlertRequest(request, button: button, location: location, attempt: attempt + 1)
                    }
                } else {
                    DispatchQueue.main.async { self.finishBackgroundSend() }
                }
                return
            }
            guard let http, let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                DispatchQueue.main.async { self.finishBackgroundSend() }
                return
            }
            NSLog("[WALLAA][SOS] native background alert accepted HTTP=\(http.statusCode)")
            let alertId = json["alertId"] as? String ?? ""
            guard !alertId.isEmpty else {
                DispatchQueue.main.async { self.finishBackgroundSend() }
                return
            }
            var restored: [String: Any] = [
                "id": alertId,
                "at": ISO8601DateFormatter().string(from: Date()),
                "trigger": button.event,
                "liveToken": json["liveToken"] as? String ?? "",
                "liveUrl": json["liveUrl"] as? String ?? "",
                "delivered": json["delivered"] as? [[String: Any]] ?? [],
                "failed": json["failed"] as? [[String: Any]] ?? [],
                "pushDelivered": json["pushDelivered"] as? [[String: Any]] ?? [],
                "pushFailed": json["pushFailed"] as? [[String: Any]] ?? [],
                "active": true,
                "source": "native-background"
            ]
            if let packetId = button.packetId { restored["packetId"] = packetId }
            if let location {
                restored["location"] = [
                    "latitude": location.coordinate.latitude,
                    "longitude": location.coordinate.longitude,
                    "accuracy": location.horizontalAccuracy >= 0 ? NSNumber(value: Int(location.horizontalAccuracy.rounded())) : NSNull(),
                    "mapsUrl": "https://www.google.com/maps?q=\(location.coordinate.latitude),\(location.coordinate.longitude)",
                    "capturedAt": ISO8601DateFormatter().string(from: location.timestamp)
                ]
            }
            if let encoded = try? JSONSerialization.data(withJSONObject: restored),
               let string = String(data: encoded, encoding: .utf8) {
                UserDefaults.standard.set(string, forKey: self.nativeAlertDefaultsKey)
            }
            if (json["liveTracking"] as? Bool) == true {
                DispatchQueue.main.async { self.startLiveTracking(alertId: alertId) }
            }
            DispatchQueue.main.async { self.finishBackgroundSend() }
        }.resume()
    }

    private func refreshLiveTrackingFromDefaults() {
        guard let raw = UserDefaults.standard.string(forKey: activeAlertDefaultsKey),
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              (json["active"] as? Bool) == true,
              let alertId = json["id"] as? String,
              !alertId.isEmpty else {
            if !liveAlertId.isEmpty { stopLiveTracking() }
            return
        }
        if liveAlertId != alertId { startLiveTracking(alertId: alertId) }
    }

    private func startLiveTracking(alertId: String) {
        guard !alertId.isEmpty else { return }
        liveAlertId = alertId
        liveLastSentAt = Date.distantPast
        NSLog("[WALLAA][LIVE] start alert=\(alertId) auth=\(locationManager.authorizationStatus.rawValue)")
        let status = locationManager.authorizationStatus
        guard status == .authorizedAlways || status == .authorizedWhenInUse else { return }
        locationManager.startUpdatingLocation()
        if let recent = locationManager.location,
           recent.horizontalAccuracy >= 0,
           abs(recent.timestamp.timeIntervalSinceNow) < 60 {
            publishLiveLocation(recent, force: true)
        }
    }

    private func stopLiveTracking() {
        if !liveAlertId.isEmpty { NSLog("[WALLAA][LIVE] stop alert=\(liveAlertId)") }
        liveAlertId = ""
        livePublishing = false
        locationManager.stopUpdatingLocation()
    }

    private func publishLiveLocation(_ location: CLLocation, force: Bool = false) {
        guard !liveAlertId.isEmpty, !livePublishing, location.horizontalAccuracy >= 0, let config else { return }
        let now = Date()
        if !force && now.timeIntervalSince(liveLastSentAt) < 2 { return }
        guard var base = URL(string: config.apiUrl) else { return }
        // apiUrl is normally .../api/alert. Build .../api/alerts/{id}/location.
        base.deleteLastPathComponent()
        let url = base.appendingPathComponent("alerts").appendingPathComponent(liveAlertId).appendingPathComponent("location")
        let payload: [String: Any] = [
            "location": [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "accuracy": NSNumber(value: Int(location.horizontalAccuracy.rounded())),
                "capturedAt": ISO8601DateFormatter().string(from: location.timestamp)
            ]
        ]
        guard let body = try? JSONSerialization.data(withJSONObject: payload) else { return }
        livePublishing = true
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let installationId = config.identity.installationId, !installationId.isEmpty {
            request.setValue(installationId, forHTTPHeaderField: "x-wallaa-installation-id")
        }
        if let token = config.identity.authToken, !token.isEmpty {
            request.setValue(token, forHTTPHeaderField: "x-wallaa-install-token")
        }
        request.httpBody = body
        URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            guard let self else { return }
            DispatchQueue.main.async {
                self.livePublishing = false
                if let http = response as? HTTPURLResponse {
                    if (200..<300).contains(http.statusCode) {
                        self.liveLastSentAt = now
                        NSLog("[WALLAA][LIVE] uploaded alert=\(self.liveAlertId) lat=\(location.coordinate.latitude) lng=\(location.coordinate.longitude) accuracy=\(Int(location.horizontalAccuracy.rounded()))")
                    } else {
                        NSLog("[WALLAA][LIVE] upload failed alert=\(self.liveAlertId) status=\(http.statusCode)")
                        if [401, 403, 404].contains(http.statusCode) { self.stopLiveTracking() }
                    }
                } else {
                    NSLog("[WALLAA][LIVE] upload failed alert=\(self.liveAlertId) no-http-response")
                }
            }
        }.resume()
    }

    private func beginBackgroundTime() {
        guard backgroundTask == .invalid else { return }
        backgroundTask = UIApplication.shared.beginBackgroundTask(withName: "WallaaHardwareSOS") { [weak self] in
            self?.finishBackgroundSend()
        }
    }

    private func finishBackgroundSend() {
        sending = false
        pendingButton = nil
        pendingPeripheralId = ""
        locationTimeout?.cancel()
        locationTimeout = nil
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
    }
}
