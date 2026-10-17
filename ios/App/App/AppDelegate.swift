import StoreKit
import UIKit
import Capacitor
import CoreBluetooth
import CoreLocation
import UserNotifications
import Security
import AccessorySetupKit
import CoreMotion
import CryptoKit
import AVFoundation
import AudioToolbox

#if DEBUG
private func wallaaDiagnosticRecord(_ kind: String, details: [String: Any] = [:]) {
    guard let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return }
    try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let url = folder.appendingPathComponent("wallaa-diagnostic-events.json")
    var events = (try? Data(contentsOf: url)).flatMap { try? JSONSerialization.jsonObject(with: $0) as? [[String: Any]] } ?? []
    var entry = details
    entry["kind"] = kind
    entry["at"] = ISO8601DateFormatter().string(from: Date())
    events.append(entry)
    if let data = try? JSONSerialization.data(withJSONObject: Array(events.suffix(64))) { try? data.write(to: url, options: .atomic) }
}
#endif

// The icon badge acknowledges delivered pushes, independently of SOS/Health state.
enum WallaaIconBadge {
    static func clear() {
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(0) { error in
                if let error {NSLog("[WALLAA][BADGE] clear failed: \(error.localizedDescription)")}
            }
        } else {UIApplication.shared.applicationIconBadgeNumber = 0}
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private lazy var wallaaBackgroundBLE = WallaaBackgroundBLEManager.shared
    private var wallaaStartupScheduled = false

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        #if DEBUG
        wallaaDiagnosticRecord("launch", details: ["bluetoothRestoration": launchOptions?[.bluetoothCentrals] != nil])
        #endif
        // Keep launch lightweight. Release/TestFlight can be less tolerant of native
        // subsystem initialization before UIApplication has completed launch.
        // Start the native BLE monitor on the next main-loop turn instead.
        scheduleWallaaNativeStartup()
        WallaaIconBadge.clear()
        logWallaaNotificationState()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        guard WallaaAccessoryBootstrap.shared.ready else { return }
        // Cover the short active -> inactive -> background transition too, so a button
        // press while the user locks the phone or leaves the app is not lost.
        wallaaBackgroundBLE.enterBackgroundMode()
    }
    func applicationDidEnterBackground(_ application: UIApplication) {
        guard WallaaAccessoryBootstrap.shared.ready else { return }
        wallaaBackgroundBLE.enterBackgroundMode()
    }
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {
        WallaaAccessoryBootstrap.shared.presentMigrationIfNeeded()
        guard WallaaAccessoryBootstrap.shared.ready else { return }
        wallaaBackgroundBLE.enterForegroundMode()
        WallaaIconBadge.clear()
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
            WallaaAccessoryBootstrap.shared.prepare {
                self.wallaaBackgroundBLE.start()
            }
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

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        let type = (userInfo["type"] as? String)
            ?? (userInfo["data"] as? [String: Any])?["type"] as? String
            ?? ""

        if type == "wallaa_health_resolved" {wallaaBackgroundBLE.clearHealthNotifications(cycleId:userInfo["healthCycleId"] as? String);completionHandler(.newData);return}
        guard type == "wallaa_location_request" else {
            completionHandler(.noData)
            return
        }

        NSLog("[WALLAA][LOCATION][ADMIN] native location request received")
        wallaaBackgroundBLE.handleAdminLocationRequest(completion: completionHandler)
    }
}

// New installations must select an accessory in Apple's picker before CoreBluetooth can use it.
@available(iOS 18.0, *)
final class WallaaAccessoryPairing {
    static let shared=WallaaAccessoryPairing()
    private var session:ASAccessorySession?
    private var completion:((Result<String,Error>)->Void)?
    private var selected:UUID?
    private var watchdog:DispatchWorkItem?
    private var requiredID:UUID?
    private var removing=false
    private var reuseAuthorized=true
    private func error(_ text:String)->NSError { NSError(domain:"WallaaAccessoryPairing",code:1,userInfo:[NSLocalizedDescriptionKey:text]) }
    func authorize(existingID:String?,remove:Bool=false,reuse:Bool=true,completion:@escaping(Result<String,Error>)->Void){
        guard self.completion == nil else { completion(.failure(error("Una richiesta Apple è già aperta. Chiudila prima di riprovare.")));return }
        let previous=session;session=nil;previous?.invalidate()
        self.completion=completion;selected=nil;requiredID=existingID.flatMap(UUID.init(uuidString:));removing=remove;reuseAuthorized=reuse
        let session=ASAccessorySession();self.session=session
        let timeout=DispatchWorkItem{[weak self] in guard let self else{return};self.finish(.failure(self.error("La richiesta Apple non si è conclusa. Ripeti il collegamento.")));session.invalidate()}
        watchdog=timeout;DispatchQueue.main.asyncAfter(deadline:.now()+120,execute:timeout)
        session.activate(on:.main){[weak self] event in
            guard let self,self.session === session,self.completion != nil else{return}
            switch event.eventType {
            case .activated:
                if self.removing {
                    guard let identifier=self.requiredID else {self.finish(.failure(self.error("Identificativo Apple del pulsante non disponibile.")));return}
                    guard let accessory=session.accessories.first(where:{$0.bluetoothIdentifier==identifier}) else {self.finish(.success(identifier.uuidString));return}
                    session.removeAccessory(accessory){[weak self] error in if let error{self?.finish(.failure(error))}else{self?.finish(.success(identifier.uuidString))}}
                    return
                }
                if let identifier=self.requiredID,session.accessories.contains(where:{$0.bluetoothIdentifier==identifier && $0.state == .authorized}) {
                    self.finish(.success(identifier.uuidString));return
                }
                let authorized=session.accessories.filter{$0.state == .authorized && $0.bluetoothIdentifier != nil}
                if self.requiredID == nil,self.reuseAuthorized,!authorized.isEmpty {
                    // Resume an interrupted first setup. With several authorized buttons,
                    // the existing physical-discovery UI still requires an explicit selection.
                    self.finish(.success(authorized.count == 1 ? authorized[0].bluetoothIdentifier!.uuidString : ""));return
                }
                let image=Bundle.main.url(forResource:"wallaa-button",withExtension:"png",subdirectory:"public").flatMap{UIImage(contentsOfFile:$0.path)} ?? UIImage(systemName:"button.programmable")!
                let items=["AA00","EA00","FEE0"].map{uuid->ASPickerDisplayItem in
                    let descriptor=ASDiscoveryDescriptor();descriptor.bluetoothServiceUUID=CBUUID(string:uuid)
                    return ASPickerDisplayItem(name:"Wallaa Button WB-001",productImage:image,descriptor:descriptor)
                }
                session.showPicker(for:items){[weak self] error in if let error {self?.finish(.failure(error))}}
            case .accessoryAdded:
                self.selected=event.accessory?.bluetoothIdentifier
            case .pickerDidDismiss:
                guard let identifier=self.selected,session.accessories.contains(where:{$0.bluetoothIdentifier==identifier && $0.state == .authorized}) else {
                    self.finish(.failure(self.error("Collegamento Apple annullato. Seleziona il tuo Wallaa Button per continuare.")));return
                }
                if let expected=self.requiredID,expected != identifier {
                    self.finish(.failure(self.error("Hai selezionato un altro pulsante. Ripeti il collegamento scegliendo il tuo WB-001.")));return
                }
                self.finish(.success(identifier.uuidString))
            case .invalidated:
                self.finish(.failure(event.error ?? self.error("Autorizzazione Apple interrotta. Ripeti il collegamento.")))
            default:break
            }
        }
    }
    func cancel(){let old=session;finish(.failure(error("Associazione annullata.")));old?.invalidate();session=nil}
    private func finish(_ result:Result<String,Error>){watchdog?.cancel();watchdog=nil;let callback=completion;completion=nil;callback?(result)}
}

// Migration must finish before *any* CoreBluetooth central is created, including
// the web plugins. SceneDelegate keeps the web bridge unloaded during this step.
final class WallaaAccessoryBootstrap {
    static let shared = WallaaAccessoryBootstrap()
    private(set) var ready = false
    private var started = false
    private var callbacks: [() -> Void] = []
    private var accessorySession: AnyObject?
    private var peripheralID: UUID?
    private var activated = false
    private var pickerPresented = false

    func prepare(_ completion: @escaping () -> Void) {
        if ready { completion(); return }
        callbacks.append(completion)
        guard !started else { return }
        started = true
        guard #available(iOS 26.0, *),
              let raw = UserDefaults.standard.string(forKey: "CapacitorStorage.wallaa.safe.background.config"),
              let data = raw.data(using: .utf8),
              let config = try? JSONDecoder().decode(WallaaNativeConfig.self, from: data),
              config.armed, config.hardwareId?.hasPrefix("MOKO:") == true,
              let identifier = UUID(uuidString: config.deviceId) else { finish(); return }
        peripheralID = identifier
        let session = ASAccessorySession()
        accessorySession = session
        session.activate(on: .main) { [weak self] event in
            guard let self else { return }
            NSLog("[WALLAA][ACCESSORY] event=\(event.eventType.rawValue) error=\(event.error?.localizedDescription ?? "none")")
            #if DEBUG
            wallaaDiagnosticRecord("accessory", details: ["event": event.eventType.rawValue, "failed": event.error != nil])
            #endif
            switch event.eventType {
            case .activated:
                self.activated = true
                if session.accessories.contains(where: { $0.bluetoothIdentifier == identifier && $0.state == .authorized }) {
                    NSLog("[WALLAA][ACCESSORY] WB-001 already authorized")
                    self.finish()
                } else { self.presentMigrationIfNeeded() }
            case .pickerDidDismiss:
                let authorized = session.accessories.contains { $0.bluetoothIdentifier == identifier && $0.state == .authorized }
                NSLog("[WALLAA][ACCESSORY] picker finished authorized=\(authorized)")
                self.finish()
            case .migrationComplete:
                // Migration of an already paired device can finish without a picker
                // dismissal event. Release both the web bridge and BLE startup here.
                self.finish()
            case .invalidated:
                self.finish()
            default: break
            }
        }
    }

    func presentMigrationIfNeeded() {
        let foregroundScene = UIApplication.shared.connectedScenes.contains {
            $0.activationState == .foregroundActive || $0.activationState == .foregroundInactive
        }
        NSLog("[WALLAA][ACCESSORY] check picker ready=\(ready) activated=\(activated) shown=\(pickerPresented) foregroundScene=\(foregroundScene) appState=\(UIApplication.shared.applicationState.rawValue)")
        guard #available(iOS 26.0, *), !ready, activated, !pickerPresented,
              foregroundScene,
              let session = accessorySession as? ASAccessorySession, let identifier = peripheralID else { return }
        pickerPresented = true
        let descriptor = ASDiscoveryDescriptor()
        descriptor.bluetoothServiceUUID = CBUUID(string: "AA00")
        descriptor.bluetoothNameSubstring = "MK Button"
        let image = Bundle.main.url(forResource: "wallaa-button", withExtension: "png", subdirectory: "public")
            .flatMap { UIImage(contentsOfFile: $0.path) } ?? UIImage(systemName: "button.programmable")!
        let item = ASMigrationDisplayItem(name: "WB-001", productImage: image, descriptor: descriptor)
        item.peripheralIdentifier = identifier
        NSLog("[WALLAA][ACCESSORY] presenting existing WB-001 migration")
        session.showPicker(for: [item]) { [weak self] error in
            if let error {
                NSLog("[WALLAA][ACCESSORY] migration error=\(error.localizedDescription)")
                self?.finish()
            }
        }
    }

    func skipMigration() { finish() }

    private func finish() {
        guard !ready else { return }
        ready = true
        let pending = callbacks
        callbacks.removeAll()
        for callback in pending { callback() }
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
    let liveProtectionEnabled: Bool?
    let sosLocationEnabled: Bool?
    let plan: String?
    let networkObserverEnabled: Bool?
}

private struct WallaaNativeIdentity: Codable {
    let installationId: String?
    let authToken: String?
}

private struct WallaaNativeConnectionGuard:Codable { let enabled:Bool?;let delaySeconds:Int? }

private struct WallaaNativeNightMode:Codable {
    let enabled:Bool
    let start:String
    let end:String
    let timeZone:String
    var active:Bool {
        guard enabled,let zone=TimeZone(identifier:timeZone) else{return false}
        var calendar=Calendar(identifier:.gregorian);calendar.timeZone=zone
        let now=calendar.dateComponents([.hour,.minute],from:Date())
        let parse:(String)->Int?={value in let parts=value.split(separator:":");guard parts.count==2,let h=Int(parts[0]),let m=Int(parts[1]),(0...23).contains(h),(0...59).contains(m) else{return nil};return h*60+m}
        guard let from=parse(start),let to=parse(end),from != to else{return false}
        let current=(now.hour ?? 0)*60+(now.minute ?? 0)
        return from<to ? current>=from && current<to : current>=from || current<to
    }
}
private struct WallaaNativeHealthCheck: Codable {
    let enabled:Bool
    let thresholdMinutes:Int?
    let nightMode:WallaaNativeNightMode?
}

private struct WallaaNativeConfig: Codable {
    let version: Int?
    let armed: Bool
    let trigger: String
    let apiUrl: String
    let deviceId: String
    let hardwareId: String?
    let claimToken: String?
    let healthCheck:WallaaNativeHealthCheck?
    let connectionGuard:WallaaNativeConnectionGuard?
    let profile: WallaaNativeProfile
    let contacts: [WallaaNativeContact]
    let identity: WallaaNativeIdentity
}

private struct WallaaNativeSentinelState: Codable {
    let active: Bool?
    let available: Bool?
    let status: String?
    let syncedAt: String?
}

private struct WallaaDecodedButton {
    let packetId: Int?
    let battery: Int?
    let buttonCode: Int
    let event: String
    var fingerprint: String? = nil
}

private final class WallaaBackgroundBLEManager: NSObject, CBCentralManagerDelegate, CLLocationManagerDelegate, CBPeripheralDelegate {
    static let shared = WallaaBackgroundBLEManager()

    private let scanServices = [CBUUID(string: "FCD2"), CBUUID(string: "FEE0"), CBUUID(string: "EA00")]
    private let restoreIdentifierDefaultsKey = "wallaa.native.ble.restore.identifier"
    private let configDefaultsKey = "CapacitorStorage.wallaa.safe.background.config"
    private let nativeAlertDefaultsKey = "CapacitorStorage.wallaa.safe.native.alert"
    private let activeAlertDefaultsKey = "CapacitorStorage.wallaa.safe.active.alert"


    private let sentinelDefaultsKey = "CapacitorStorage.wallaa.safe.sentinel.native"
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
    private var adminLocationRequestPending = false
    private var adminLocationCompletion: ((UIBackgroundFetchResult) -> Void)?
    private var adminLocationTimeout: DispatchWorkItem?
    private var liveAlertId = ""
    private var livePublishing = false
    private var liveLastSentAt = Date.distantPast

    private var nativeSentinelState: WallaaNativeSentinelState?
    private var sentinelPublishing = false
    private var sentinelLastSentAt = Date.distantPast
    private var sentinelLastAttemptAt = Date.distantPast
    private var sentinelLastLocationRequestAt = Date.distantPast
    private var sentinelHeartbeatTimer:DispatchSourceTimer?
    private var sentinelRefreshTimeout:DispatchWorkItem?
    private var sentinelTask:UIBackgroundTaskIdentifier = .invalid
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

    private var observedConfigurationValues:[String?]?
    @objc private func userDefaultsDidChange() {
        // Capacitor Preferences writes the active SOS alert into UserDefaults.
        // Refresh immediately so native CoreLocation starts while the app is still
        // foregrounded, before the user locks the phone or opens the Guardian link.
        DispatchQueue.main.async { [weak self] in
            guard let self else{return}
            let values=[self.configDefaultsKey,self.activeAlertDefaultsKey,self.sentinelDefaultsKey].map{UserDefaults.standard.string(forKey:$0)}
            guard values != self.observedConfigurationValues else{return}
            self.observedConfigurationValues=values
            self.refreshConfiguration()
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
        if !mokoAuthenticated && !mokoAuthenticationBlocked {mokoRetry?.cancel();mokoRetryAt = .distantPast}
        refreshConfiguration()
        stopNativeScan(reason: "did-become-active")
    }

    private var communityMacs: [UUID: String] = [:]
    private var communityPending: [String: (rssi: Int, at: Date, moving:Bool?)] = [:]
    private var communityLastSent: [String: Date] = [:]
    private var communityTask: UIBackgroundTaskIdentifier = .invalid
    private var communityLocationTimeout: DispatchWorkItem?
    private var communityPublishing = false
    private var communityPaused = false
    private var communityLastDetectedAt:Date?
    private var communityLastReportAt:Date?
    private var communityLastResponseCode:Int?
    private var communityLastError=""
    private var communityLastFailureAt:Date?
    private var communityNextAttempt = Date.distantPast
    private var communityRequestedAlways = false
    private var communityEnabled: Bool {
        !communityPaused && config?.profile.networkObserverEnabled == true && !(config?.identity.authToken ?? "").isEmpty
    }

    private func beginCommunityTask() {
        guard UIApplication.shared.applicationState != .active, communityTask == .invalid else {return}
        communityTask=UIApplication.shared.beginBackgroundTask(withName:"WallaaNetworkSighting") {[weak self] in
            self?.communityPending.removeAll();self?.endCommunityTask()
        }
    }
    private func endCommunityTask() {
        communityLocationTimeout?.cancel();communityLocationTimeout=nil
        if communityTask != .invalid {UIApplication.shared.endBackgroundTask(communityTask);communityTask = .invalid}
    }

    private func observeCommunityTag(_ peripheral: CBPeripheral, advertisement: [String: Any], rssi: NSNumber) {
        guard communityEnabled else { return }
        let now=Date()
        communityPending=communityPending.filter {now.timeIntervalSince($0.value.at)<60}
        if let services=advertisement[CBAdvertisementDataServiceDataKey] as? [CBUUID:Data],
           let info=services[CBUUID(string:"EA00")], info.count==21, info.first==0 {
            let raw=[UInt8](info.suffix(6))
            if !raw.allSatisfy({$0==0}) && !raw.allSatisfy({$0==255}) {
                let mac=raw.map {String(format:"%02X",$0)}.joined()
                communityMacs[peripheral.identifier]="MOKO:\(mac)"
            }
        }
        let serviceData=advertisement[CBAdvertisementDataServiceDataKey] as? [CBUUID:Data]
        let moving=serviceData?[CBUUID(string:"FEE0")].flatMap{WallaaMokoGATT.movementFlag($0)}
        guard let hardwareId=communityMacs[peripheral.identifier], hardwareId != config?.hardwareId,
              (-127...20).contains(rssi.intValue),
              now.timeIntervalSince(communityLastSent[hardwareId] ?? .distantPast)>=WallaaMokoGATT.observationInterval(moving:moving) else {return}
        if communityMacs.count>256 {communityMacs=[peripheral.identifier:hardwareId]}
        if communityPending.count>=20 && communityPending[hardwareId]==nil {return}
        communityLastDetectedAt=now
        communityPending[hardwareId]=(rssi:rssi.intValue,at:now,moving:moving)
        guard now>=communityNextAttempt else {return}
        beginCommunityTask()
        if let location=locationManager.location, location.horizontalAccuracy>=0,
           location.horizontalAccuracy<=100, abs(location.timestamp.timeIntervalSinceNow)<15 {
            publishCommunityObservations(location)
        } else if locationManager.authorizationStatus == .authorizedAlways && !sending && !adminLocationRequestPending && !communityPublishing && communityLocationTimeout == nil {
            locationManager.requestLocation()
            communityLocationTimeout?.cancel()
            let timeout=DispatchWorkItem {[weak self] in
                self?.communityNextAttempt=Date().addingTimeInterval(30)
                self?.communityLastFailureAt=Date();self?.communityLastResponseCode = -1;self?.communityLastError="Il telefono non ha ottenuto una posizione recente entro il tempo previsto. Invio da riprovare."
                self?.communityPending.removeAll();self?.endCommunityTask()
            }
            communityLocationTimeout=timeout
            DispatchQueue.main.asyncAfter(deadline:.now()+8,execute:timeout)
        } else if !communityPublishing {endCommunityTask()}
    }

    private func publishCommunityObservations(_ location: CLLocation) {
        guard communityEnabled, !communityPublishing, Date()>=communityNextAttempt, location.horizontalAccuracy>=0, location.horizontalAccuracy<=100,
              abs(location.timestamp.timeIntervalSinceNow)<15, let config,
              let token=config.identity.authToken, !token.isEmpty, var base=URL(string:config.apiUrl) else {return}
        let now=Date()
        communityPending=communityPending.filter {now.timeIntervalSince($0.value.at)<60 && abs(location.timestamp.timeIntervalSince($0.value.at))<=15}
        let items=Array(communityPending.prefix(10))
        guard !items.isEmpty else {return}
        base.deleteLastPathComponent()
        let url=base.appendingPathComponent("device-network").appendingPathComponent("observations")
        let observations=items.map {item -> [String:Any] in
            ["hardwareId":item.key,"rssi":item.value.rssi,"observedAt":ISO8601DateFormatter().string(from:item.value.at)]
        }
        let payload:[String:Any]=["observations":observations,"location":["latitude":location.coordinate.latitude,
            "longitude":location.coordinate.longitude,"accuracy":location.horizontalAccuracy,
            "capturedAt":ISO8601DateFormatter().string(from:location.timestamp)]]
        guard let data=try? JSONSerialization.data(withJSONObject:payload) else {return}
        var request=URLRequest(url:url);request.httpMethod="POST";request.httpBody=data;request.timeoutInterval=10
        request.setValue("application/json",forHTTPHeaderField:"Content-Type")
        request.setValue(config.identity.installationId ?? "",forHTTPHeaderField:"x-wallaa-installation-id")
        request.setValue(token,forHTTPHeaderField:"x-wallaa-install-token")
        communityLocationTimeout?.cancel();communityLocationTimeout=nil
        communityPublishing=true
        URLSession.shared.dataTask(with:request) {[weak self] data,response,error in
            let serviceError=data.flatMap{try? JSONSerialization.jsonObject(with:$0) as? [String:Any]}?["error"] as? String
            DispatchQueue.main.async {
                guard let self else {return}
                self.communityPublishing=false
                self.endCommunityTask()
                let code=(response as? HTTPURLResponse)?.statusCode ?? 0
                self.communityLastResponseCode=code
                self.communityLastError=serviceError ?? (error == nil ? "HTTP \(code)" : "Il servizio non ha risposto al tentativo di invio. Il telefono riproverà.")
                if WallaaMokoGATT.shouldPauseCommunity(statusCode:code) {self.communityPaused=true;self.communityLastFailureAt=Date();self.communityPending.removeAll();return}
                if code==403 {self.communityLastFailureAt=Date();self.communityNextAttempt=Date().addingTimeInterval(WallaaMokoGATT.communityRetryDelay(statusCode:code));return}
                if (200..<300).contains(code) {
                    self.communityLastReportAt=Date();self.communityLastFailureAt=nil;self.communityLastError=""
                    for item in items {
                        self.communityLastSent[item.key]=now
                        if self.communityPending[item.key]?.at==item.value.at {self.communityPending.removeValue(forKey:item.key)}
                    }
                } else {self.communityLastFailureAt=Date();self.communityNextAttempt=Date().addingTimeInterval(30)}
            }
        }.resume()
    }

    private var mokoSetupInProgress = false
    private var mokoSetupConnectionPaused = false
    private var mokoSetupWatchdog: DispatchWorkItem?
    private var mokoPeripheral: CBPeripheral?
    private var mokoControlCharacteristics: [CBCharacteristic] = []
    private var mokoAuthenticationSent = false
    private var mokoPasswordCharacteristic: CBCharacteristic?
    private var mokoEventsCharacteristic: CBCharacteristic?
    private var mokoAuthenticated = false
    private var mokoAuthenticationBlocked = false
    private var mokoStatus = "disabled"
    private var mokoLastCount: Int?
    private var mokoLastEventAt = Date.distantPast
    private var mokoStreamStartedAt = Date.distantPast
    private var mokoStreamReady: DispatchWorkItem?
    private var mokoResetInFlight = false
    private var mokoLastLoggedStatus = ""
    private var mokoMotionCharacteristic:CBCharacteristic?
    private var healthMotionAnchor:[String:Int]?
    private var healthPreviousAxes:[String:Int]?
    private var healthMotionSamples:[[String:Int]]=[]
    private let healthPhoneMotion = CMMotionManager()
    private var healthPhoneMotionStreak = 0
    private var healthPhoneLastMoving:Bool?
    private var healthPhoneActivityAt = Date.distantPast
    private var healthPhonePublishing = false
    private var healthMovementPending=false
    private var healthPublishing=false
    private var healthLastPublish=Date.distantPast
    private var healthSampleHardware=""
    private var guardScheduledKey=""
    private var disconnectFirstCheckAt:Date?
    private var disconnectCheckKey=""
    private var disconnectConfirmed=false
    private var disconnectCheckedAt:Date?
    private var disconnectCheckWork:DispatchWorkItem?
    private var disconnectCheckTask:UIBackgroundTaskIdentifier = .invalid
    private var morningMotion=WallaaMorningMotion()
    private var morningMotionHardware=""
    private var motionTelemetrySavedAt=Date.distantPast
    // Use existing BLE sensor notifications: no GPS requests or movement polling.
    private var nativeMorningEnabled:Bool { mokoConnectionWanted && !mokoSetupInProgress }

    private var nativeHealthEnabled:Bool { config?.healthCheck?.enabled == true && config?.armed == true && config?.profile.plan == "pro" }

    private var mokoMotionWantedUntil=Date.distantPast
    private var mokoMotionTimeout:DispatchWorkItem?
    private var mokoMotionSampleCount=0
    private var mokoMotionPrevious:[String:Int]?
    private var mokoMotionPeakDelta=0
    private var mokoMotionCaptureAt=Date.distantPast
    private var mokoTelemetry: [String:Any] = [:]
    private var mokoTelemetryHardwareId = ""
    private var mokoTelemetryAt = Date.distantPast
    private var mokoTelemetryQueue: [UInt8] = []
    private var mokoTelemetryCommand: UInt8?
    private var mokoTelemetryTimeout: DispatchWorkItem?
    private var mokoConnectTimeout: DispatchWorkItem?
    private var mokoRetry: DispatchWorkItem?
    private var mokoRetryAt=Date.distantPast
    private var mokoRetryFailures=0
    private var mokoHandshakeTimeout: DispatchWorkItem?
    private var mokoLastRssiAt = Date.distantPast
    private var mokoRssi: Int?
    private var mokoRssiMeasuredAt:Date?
    private var mokoDisconnectReason=""
    private var mokoDisconnectedAt: Date?
    private var guardianLastLocationAt = Date.distantPast
    private var guardianPublishing = false

    private var mokoConnectionWanted: Bool {
        guard !mokoSetupConnectionPaused, let config, config.armed, !(config.identity.authToken ?? "").isEmpty,
              let hardwareId = config.hardwareId, hardwareId.hasPrefix("MOKO:"),
              ["press", "any_press"].contains(config.trigger) else { return false }
        return UserDefaults.standard.bool(forKey: "wallaa.moko.continuous.\(hardwareId)")
    }

    var canStartMokoSetup: Bool { return !sending }

    func beginMokoSetup(completion: @escaping (Bool) -> Void) {
        let previous = mokoPeripheral
        setMokoSetupInProgress(true)
        let deadline = Date().addingTimeInterval(5)
        func waitForDisconnect() {
            if previous == nil || previous?.state == .disconnected { completion(true); return }
            if Date() >= deadline { setMokoSetupInProgress(false); completion(false); return }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { waitForDisconnect() }
        }
        waitForDisconnect()
    }

    func setMokoSetupInProgress(_ active: Bool, allowConnection: Bool = false) {
        mokoSetupWatchdog?.cancel()
        mokoSetupInProgress = active
        mokoSetupConnectionPaused = active && !allowConnection
        if active {
            let timeout = DispatchWorkItem { [weak self] in self?.setMokoSetupInProgress(false) }
            mokoSetupWatchdog = timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + 180, execute: timeout)
        }
        refreshConfiguration()
        reconcileMokoConnection()
    }

    func configureMokoConnection(hardwareId: String, enabled: Bool) {
        UserDefaults.standard.set(enabled, forKey: "wallaa.moko.continuous.\(hardwareId)")
        mokoAuthenticationBlocked = false
        mokoRetry?.cancel();mokoRetryAt = .distantPast;mokoRetryFailures=0
        start()
        reconcileMokoConnection()
    }

    func safetyPermissionStatus()->[String:Any] {
        let location:String
        switch locationManager.authorizationStatus {case .authorizedAlways:location="always";case .authorizedWhenInUse:location="when-in-use";case .denied:location="denied";case .restricted:location="restricted";default:location="not-determined"}
        let authorization:String
        switch CBManager.authorization {case .allowedAlways:authorization="allowed";case .denied:authorization="denied";case .restricted:authorization="restricted";default:authorization="not-determined"}
        return ["location":location,"bluetooth":central?.state == .poweredOn,"bluetoothPoweredOn":central?.state == .poweredOn,"bluetoothAuthorization":authorization,"backgroundRefresh":UIApplication.shared.backgroundRefreshStatus == .available,"lowPower":ProcessInfo.processInfo.isLowPowerModeEnabled]
    }
    func requestSafetyLocation() {
        guard UIApplication.shared.applicationState == .active else { return }
        if locationManager.authorizationStatus == .notDetermined { locationManager.requestWhenInUseAuthorization() }
        else if locationManager.authorizationStatus == .authorizedWhenInUse { locationManager.requestAlwaysAuthorization() }
    }

    func mokoConnectionStatus(refresh:Bool=false) -> [String: Any] {
        if refresh {
            mokoTelemetryAt = .distantPast;mokoLastRssiAt = .distantPast;mokoMotionWantedUntil=Date().addingTimeInterval(8)
            if !mokoAuthenticated && !mokoAuthenticationBlocked {mokoRetry?.cancel();mokoRetryAt = .distantPast;mokoRetryFailures=0}
        }
        refreshConfiguration()
        if mokoAuthenticated, let peripheral = mokoPeripheral, peripheral.state == .connected,
           Date().timeIntervalSince(mokoLastRssiAt) >= 15 {
            mokoLastRssiAt = Date()
            peripheral.readRSSI()
        }
        refreshMokoTelemetryIfNeeded()
        requestMokoMotionSample()
        var network:[String:Any]=["paused":communityPaused,"lastStatusCode":communityLastResponseCode ?? 0,"error":communityLastError,"waiting":communityPending.count]
        if let at=communityLastDetectedAt {network["lastDetectedAt"]=ISO8601DateFormatter().string(from:at)}
        if let at=communityLastReportAt {network["lastReportAt"]=ISO8601DateFormatter().string(from:at)}
        if let at=communityLastFailureAt {network["lastFailureAt"]=ISO8601DateFormatter().string(from:at)}
        var result: [String: Any] = ["network":network,"telemetry":mokoTelemetry,"state": mokoStatus,
            "connected": mokoAuthenticated && mokoPeripheral?.state == .connected && mokoEventsCharacteristic?.isNotifying == true && mokoStatus == "ready",
            "morningNotice":UserDefaults.standard.dictionary(forKey:morningNoticeKey) ?? [:], "disconnectConfirmed":disconnectConfirmed, "disconnectCheckedAt":disconnectCheckedAt.map{ISO8601DateFormatter().string(from:$0)} ?? "",
            "ready": mokoStatus == "ready", "disconnectReason":mokoDisconnectReason,"rssi": NSNull(), "disconnectedAt": NSNull()]
        #if DEBUG
        result["diagnostic"] = true
        #endif
        if let rssi=mokoRssi,let at=mokoRssiMeasuredAt,Date().timeIntervalSince(at)<=45 {result["rssi"]=rssi;result["rssiSampledAt"]=ISO8601DateFormatter().string(from:at)}
        if let at = mokoDisconnectedAt { result["disconnectedAt"] = ISO8601DateFormatter().string(from: at) }
        if mokoLastLoggedStatus != mokoStatus {
            mokoLastLoggedStatus = mokoStatus
            NSLog("[WALLAA][MOKO] status=\(mokoStatus) wanted=\(mokoConnectionWanted) authenticated=\(mokoAuthenticated)")
            UserDefaults.standard.set(result.filter { !($0.value is NSNull) },forKey:"wallaa.moko.diagnostic.status")
        }
        return result
    }

    private func refreshMokoTelemetryIfNeeded() {
        guard mokoStatus == "ready", mokoAuthenticated, mokoConnectionWanted, let hardwareId=config?.hardwareId else { return }
        if mokoTelemetryHardwareId != hardwareId { mokoTelemetry=[:];mokoTelemetryAt = .distantPast;mokoTelemetryHardwareId=hardwareId;mokoRssi=nil;mokoRssiMeasuredAt=nil;mokoLastRssiAt = .distantPast }
        guard mokoTelemetryCommand == nil, mokoTelemetryQueue.isEmpty, Date().timeIntervalSince(mokoTelemetryAt)>=60 else { return }
        mokoTelemetryAt=Date();mokoTelemetryQueue=[0x62,0x4a,0x4f,0x2d,0x2e,0x5a];readNextMokoTelemetry()
    }
    private func readNextMokoTelemetry() {
        mokoTelemetryTimeout?.cancel();mokoTelemetryCommand=nil
        guard mokoStatus == "ready", mokoConnectionWanted, let peripheral=mokoPeripheral,
              peripheral.state == .connected, let custom=mokoControlCharacteristics.first(where:{$0.uuid==CBUUID(string:"AA01")}), !mokoTelemetryQueue.isEmpty else { mokoTelemetryQueue=[];return }
        let command=mokoTelemetryQueue.removeFirst();mokoTelemetryCommand=command
        peripheral.writeValue(Data([0xea,0,command,0]),for:custom,type:.withResponse)
        let timeout=DispatchWorkItem{[weak self] in self?.readNextMokoTelemetry()}
        mokoTelemetryTimeout=timeout;DispatchQueue.main.asyncAfter(deadline:.now()+2,execute:timeout)
    }
    private func receiveMokoTelemetry(_ value:Data) {
        guard let command=mokoTelemetryCommand, let parsed=WallaaMokoGATT.telemetryReply(value,command:command) else { return }
        for (key,value) in parsed { mokoTelemetry[key]=value }
        if !parsed.isEmpty { mokoTelemetry["sampledAt"]=ISO8601DateFormatter().string(from:Date());UserDefaults.standard.set(mokoTelemetry,forKey:"wallaa.moko.telemetry") }
        if command==0x4f { requestMokoMotionSample() }
        readNextMokoTelemetry()
    }

    private func requestMokoMotionSample(){
        guard mokoAuthenticated,mokoStatus=="ready",(Date()<mokoMotionWantedUntil || nativeHealthEnabled || nativeMorningEnabled),mokoTelemetry["threeAxisAvailable"] as? Bool == true,let peripheral=mokoPeripheral,let characteristic=mokoMotionCharacteristic,characteristic.properties.contains(.notify),!characteristic.isNotifying else{return}
        mokoMotionSampleCount=0;mokoMotionPrevious=nil;mokoMotionPeakDelta=0;mokoMotionCaptureAt=Date()
        peripheral.setNotifyValue(true,for:characteristic)
        mokoMotionTimeout?.cancel()
        if nativeHealthEnabled || nativeMorningEnabled { return }
        let timeout=DispatchWorkItem{[weak self,weak peripheral] in guard let self,let peripheral else{return};if characteristic.isNotifying {peripheral.setNotifyValue(false,for:characteristic)}}
        mokoMotionTimeout=timeout;DispatchQueue.main.asyncAfter(deadline:.now()+8,execute:timeout)
    }

    private var morningNoticeKey:String {
        let identity=config?.identity.authToken ?? ""
        let scope=SHA256.hash(data:Data(identity.utf8)).map{String(format:"%02x",$0)}.joined()
        return "wallaa.morning.notice.\(scope)"
    }

    private func observeMorningMotion(_ axes:[String:Int]) {
        guard nativeMorningEnabled,mokoAuthenticated,mokoStatus == "ready",mokoPeripheral?.state == .connected,
              mokoEventsCharacteristic?.isNotifying == true,let config,let hardwareId=config.hardwareId else{return}
        if morningMotionHardware != hardwareId {morningMotionHardware=hardwareId;morningMotion=WallaaMorningMotion()}
        let now=Date()
        guard morningMotion.observe(axes,at:now) else{return}
        let day=WallaaMorningMotion.day(at:now)
        let noticeKey=morningNoticeKey
        guard (UserDefaults.standard.dictionary(forKey:noticeKey)?["day"] as? String) != day else{return}
        let name=(config.profile.firstName ?? config.profile.name ?? "").trimmingCharacters(in:.whitespacesAndNewlines)
        let english=config.profile.language == "en"
        let title=(english ? "Good morning" : "Buongiorno") + (name.isEmpty ? "" : " \(name)")
        let body=english ? "Safety system activated" : "Sistema di sicurezza attivato"
        let notice:[String:Any]=["id":"morning-\(noticeKey.suffix(16))-\(day)","day":day,"at":ISO8601DateFormatter().string(from:now),"title":title,"detail":body,"hardwareId":hardwareId]
        UserDefaults.standard.set(notice,forKey:noticeKey)
        let content=UNMutableNotificationContent();content.title=title;content.body=body
        content.sound=UNNotificationSound(named:UNNotificationSoundName("wallaa-soft-chime.wav"))
        content.userInfo=["type":"wallaa_morning","hardwareId":hardwareId]
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier:"wallaa-morning-\(day)",content:content,trigger:UNTimeIntervalNotificationTrigger(timeInterval:1,repeats:false))){error in
            if error != nil,UserDefaults.standard.dictionary(forKey:noticeKey)?["day"] as? String == day {UserDefaults.standard.removeObject(forKey:noticeKey)}
        }
    }

    private func observeHealthMotion(_ axes:[String:Int]) {
        if config?.healthCheck?.nightMode?.active == true {healthMotionAnchor=nil;healthPreviousAxes=nil;healthMotionSamples=[];healthMovementPending=false;return}
        guard nativeHealthEnabled,mokoAuthenticated,mokoStatus == "ready",let config,let hardwareId=config.hardwareId else{return}
        if healthSampleHardware != hardwareId {healthSampleHardware=hardwareId;healthMotionAnchor=nil;healthPreviousAxes=nil;healthMotionSamples=[];healthLastPublish = .distantPast;healthMovementPending=false}
        healthMotionSamples.append(axes)
        if healthMotionSamples.count > 5 { healthMotionSamples.removeFirst() }
        guard let filtered = WallaaMokoGATT.medianAcceleration(healthMotionSamples) else { return }
        if healthMotionAnchor == nil {healthMotionAnchor=filtered}
        if let previous=healthPreviousAxes,let anchor=healthMotionAnchor {
            if WallaaMokoGATT.accelerationDelta(previous,filtered)>=40 || WallaaMokoGATT.accelerationDelta(anchor,filtered)>=60 {healthMovementPending=true;healthMotionAnchor=filtered}
        }
        healthPreviousAxes=filtered
        guard !healthPublishing,(healthMovementPending && Date().timeIntervalSince(healthLastPublish)>=2) || Date().timeIntervalSince(healthLastPublish)>=20,
              let token=config.identity.authToken,!token.isEmpty,var base=URL(string:config.apiUrl) else{return}
        base.deleteLastPathComponent();let url=base.appendingPathComponent("health-check").appendingPathComponent("observation")
        let moving=healthMovementPending
        let formatter=ISO8601DateFormatter();formatter.formatOptions=[.withInternetDateTime,.withFractionalSeconds]
        let payload:[String:Any]=["device":["hardwareId":hardwareId,"claimToken":config.claimToken ?? ""],"sampledAt":formatter.string(from:Date()),"sensorAvailable":true,"moving":moving]
        guard let data=try? JSONSerialization.data(withJSONObject:payload) else{return}
        var request=URLRequest(url:url);request.httpMethod="POST";request.httpBody=data;request.timeoutInterval=10
        request.setValue("application/json",forHTTPHeaderField:"Content-Type");request.setValue(config.identity.installationId ?? "",forHTTPHeaderField:"x-wallaa-installation-id");request.setValue(token,forHTTPHeaderField:"x-wallaa-install-token")
        healthPublishing=true;healthLastPublish=Date();if moving {healthMovementPending=false}
        URLSession.shared.dataTask(with:request){[weak self] data,response,error in
            let reply=data.flatMap{try? JSONSerialization.jsonObject(with:$0) as? [String:Any]}
            DispatchQueue.main.async {guard let self else{return};self.healthPublishing=false
                if error == nil, (response as? HTTPURLResponse)?.statusCode == 200,
                   self.config?.identity.authToken == token, let cycle = reply?["cycle"] as? [String:Any],
                   cycle["needsAcknowledgement"] as? Bool == true, let cycleId = cycle["id"] as? String {
                    if !self.healthNoticeWasCleared(notificationAt:cycle["notificationAt"] as? String,serverClearedAt:reply?["notificationsClearedAt"] as? String) {
                        self.showHealthReceipt(cycleId:cycleId)
                    }
                }
                if error != nil || !((response as? HTTPURLResponse).map{(200...299).contains($0.statusCode)} ?? false) {if moving {self.healthMovementPending=true}}
                else if moving && reply?["ignored"] as? Bool != true && (reply?["cycle"] as? [String:Any])?["needsAcknowledgement"] as? Bool != true && self.config?.identity.authToken == token && self.config?.hardwareId == hardwareId {self.clearHealthNotifications()}
            }
        }.resume()
    }

    private func showHealthReceipt(cycleId:String) {
        let key="wallaa.health.receipt.notifiedCycle"
        guard UserDefaults.standard.string(forKey:key) != cycleId else { return }
        UserDefaults.standard.set(cycleId,forKey:key)
        let content=UNMutableNotificationContent()
        content.title="Wallaa Health Check"
        content.body=config?.profile.language == "en" ? "Your Guardian Pro contacts were notified because your check-in was missed. Open Wallaa to confirm you are okay." : "I Guardian Pro sono stati avvisati per la mancata conferma. Apri Wallaa per confermare che stai bene."
        content.sound=UNNotificationSound(named:UNNotificationSoundName("wallaa-soft-chime.wav"))
        content.userInfo=["type":"wallaa_health_check","healthCycleId":cycleId]
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier:"wallaa-health-receipt-\(cycleId)",content:content,trigger:UNTimeIntervalNotificationTrigger(timeInterval:1,repeats:false))) { error in
            if error != nil { UserDefaults.standard.removeObject(forKey:key) }
        }
    }

    private var healthNotificationClearKey:String? {
        guard let token=config?.identity.authToken,!token.isEmpty else{return nil}
        return "wallaa.health.notifications.clear."+SHA256.hash(data:Data(token.utf8)).map{String(format:"%02x",$0)}.joined()
    }
    func recordHealthNotificationClear(_ at:String?) {
        if let at,let key=healthNotificationClearKey {UserDefaults.standard.set(at,forKey:key)}
    }
    private func healthNoticeWasCleared(notificationAt:String?,serverClearedAt:String?)->Bool {
        let local=healthNotificationClearKey.flatMap{UserDefaults.standard.string(forKey:$0)}
        let raw=[local,serverClearedAt].compactMap{$0}.max()
        guard let raw,let notificationAt else{return false}
        let formatter=ISO8601DateFormatter();formatter.formatOptions=[.withInternetDateTime,.withFractionalSeconds]
        guard let cutoff=formatter.date(from:raw),let notice=formatter.date(from:notificationAt) else{return false}
        return notice<=cutoff
    }

    private func reconcileHealthPhoneMotion() {
        let wanted = nativeHealthEnabled && config?.healthCheck?.nightMode?.active != true
        guard wanted else {
            healthPhoneMotion.stopDeviceMotionUpdates(); healthPhoneMotionStreak = 0
            return
        }
        guard healthPhoneMotion.isDeviceMotionAvailable, !healthPhoneMotion.isDeviceMotionActive else { return }
        healthPhoneMotion.deviceMotionUpdateInterval = 0.2
        healthPhoneMotion.startDeviceMotionUpdates(to: .main) { [weak self] sample, error in
            guard let self, let sample, error == nil else { return }
            let a = sample.userAcceleration, r = sample.rotationRate
            guard [a.x,a.y,a.z,r.x,r.y,r.z].allSatisfy({$0.isFinite}) else {return}
            let moving = WallaaMokoGATT.phoneMoving(acceleration: [a.x,a.y,a.z], rotation: [r.x,r.y,r.z])
            self.healthPhoneMotionStreak = moving ? self.healthPhoneMotionStreak + 1 : 0
            self.publishHealthPhoneActivity(moving:self.healthPhoneMotionStreak >= 3)
        }
    }

    private func publishHealthPhoneActivity(moving:Bool) {
        guard nativeHealthEnabled, !healthPhonePublishing,
              (Date().timeIntervalSince(healthPhoneActivityAt) >= 15 || (moving && healthPhoneLastMoving != true)),
              config?.healthCheck?.nightMode?.active != true,
              let config, let hardwareId = config.hardwareId,
              let token = config.identity.authToken, !token.isEmpty, var base = URL(string: config.apiUrl) else { return }
        base.deleteLastPathComponent()
        let payload: [String:Any] = ["device":["hardwareId":hardwareId,"claimToken":config.claimToken ?? ""],
                                   "sampledAt":ISO8601DateFormatter().string(from:Date()),"moving":moving,"buttonConnected":mokoAuthenticated && mokoStatus == "ready"]
        guard let data = try? JSONSerialization.data(withJSONObject:payload) else { return }
        var request = URLRequest(url:base.appendingPathComponent("health-check").appendingPathComponent("phone-observation"))
        request.httpMethod="POST";request.httpBody=data;request.timeoutInterval=10
        request.setValue("application/json",forHTTPHeaderField:"Content-Type")
        request.setValue(config.identity.installationId ?? "",forHTTPHeaderField:"x-wallaa-installation-id")
        request.setValue(token,forHTTPHeaderField:"x-wallaa-install-token")
        healthPhonePublishing=true;healthPhoneActivityAt=Date();healthPhoneLastMoving=moving
        URLSession.shared.dataTask(with:request){[weak self] data,response,error in
            let reply=data.flatMap{try? JSONSerialization.jsonObject(with:$0) as? [String:Any]}
            DispatchQueue.main.async {
                guard let self else { return };self.healthPhonePublishing=false
                if moving, error == nil, (response as? HTTPURLResponse)?.statusCode == 200,
                   reply?["ignored"] as? Bool != true, reply?["needsAcknowledgement"] as? Bool != true, self.config?.identity.authToken == token {
                    self.clearHealthNotifications()
                }
            }
        }.resume()
    }
    private let connectionGuardQueue=DispatchQueue(label:"it.wallaa.connection-notifications",qos:.utility)
    private func finishDisconnectCheck(){
        disconnectCheckWork?.cancel();disconnectCheckWork=nil
        if disconnectCheckTask != .invalid {UIApplication.shared.endBackgroundTask(disconnectCheckTask);disconnectCheckTask = .invalid}
    }

    private func scheduleDisconnectConfirmation(){
        if UIApplication.shared.applicationState != .active,disconnectCheckTask == .invalid {
            disconnectCheckTask=UIApplication.shared.beginBackgroundTask(withName:"WallaaConfirmDisconnect"){[weak self] in self?.finishDisconnectCheck()}
        }
        guard disconnectCheckWork == nil else{return}
        let work=DispatchWorkItem{[weak self] in
            guard let self else{return}
            self.disconnectCheckWork=nil
            self.updateNativeConnectionGuard()
            if self.disconnectConfirmed {self.finishDisconnectCheck()}
        }
        disconnectCheckWork=work;DispatchQueue.main.asyncAfter(deadline:.now()+5,execute:work)
    }

    private func updateNativeConnectionGuard(){
        let center=UNUserNotificationCenter.current(),identifiers=["1746060","1746061","1746062"]
        let savedKey="wallaa.disconnect.reminder-plan"
        // Restored iOS subscriptions can become ready without the normal handshake callback.
        if mokoAuthenticated,mokoStatus == "ready",mokoPeripheral?.state == .connected,mokoEventsCharacteristic?.isNotifying == true {mokoDisconnectedAt=nil}
        guard let config else {finishDisconnectCheck();return}
        guard config.armed,config.connectionGuard?.enabled != false,mokoConnectionWanted,let detectedAt=mokoDisconnectedAt else {
            disconnectFirstCheckAt=nil;disconnectCheckKey="";disconnectConfirmed=false;disconnectCheckedAt=nil;finishDisconnectCheck()
            if guardScheduledKey != "inactive" {
                guardScheduledKey="inactive"
                connectionGuardQueue.async {center.removePendingNotificationRequests(withIdentifiers:identifiers);center.removeDeliveredNotifications(withIdentifiers:identifiers)}
            }
            // A verified reconnection or explicit opt-out ends this disconnect episode.
            if (mokoStatus == "ready" || !config.armed || config.connectionGuard?.enabled == false),UserDefaults.standard.object(forKey:savedKey) != nil {
                UserDefaults.standard.removeObject(forKey:savedKey)
            }
            return
        }
        let hardwareId=config.hardwareId ?? ""
        let saved=UserDefaults.standard.dictionary(forKey:savedKey)
        let sameEpisode=saved?["hardwareId"] as? String == hardwareId
        let at=sameEpisode ? Date(timeIntervalSince1970:saved?["at"] as? Double ?? detectedAt.timeIntervalSince1970) : detectedAt
        mokoDisconnectedAt=at
        let episode="\(hardwareId)-\(at.timeIntervalSince1970)"
        if disconnectCheckKey != episode {
            finishDisconnectCheck();disconnectCheckKey=episode;disconnectFirstCheckAt=Date();disconnectConfirmed=false
        }
        // Repeated config polls within five seconds are still the first check.
        disconnectConfirmed=Date().timeIntervalSince(disconnectFirstCheckAt ?? Date()) >= 5
        guard disconnectConfirmed else {scheduleDisconnectConfirmation();return}
        disconnectCheckedAt=Date()
        finishDisconnectCheck()
        let delay=max(30,config.connectionGuard?.delaySeconds ?? 60),language=config.profile.language ?? "it"
        let key="\(hardwareId)-\(at.timeIntervalSince1970)-\(delay)-\(language)"
        guard key != guardScheduledKey else { return };guardScheduledKey=key
        // iOS retains scheduled notifications while the app is suspended/relaunched.
        // Do not restart an existing three-reminder sequence on every configuration refresh.
        if sameEpisode,saved?["key"] as? String == key { return }
        var requests:[UNNotificationRequest]=[]
        let now=Date()
        for index in 0..<3 {
            let due=at.addingTimeInterval(Double(delay+index*300))
            if sameEpisode,due <= now { continue }
            let content=UNMutableNotificationContent()
            content.title=language=="en" ? "Your Wallaa Button is no longer with you" : "Wallaa Button non è più con te"
            content.body=language=="en" ? "Check that you have it with you and that Bluetooth is on." : "Controlla di averlo con te e che il Bluetooth sia attivo."
            content.sound=UNNotificationSound(named:UNNotificationSoundName("wallaa-soft-chime.wav"))
            content.userInfo=["type":"wallaa_disconnect","reminder":index+1,"hardwareId":hardwareId]
            let trigger=UNTimeIntervalNotificationTrigger(timeInterval:max(1,due.timeIntervalSince(now)),repeats:false)
            requests.append(UNNotificationRequest(identifier:identifiers[index],content:content,trigger:trigger))
        }
        let pending=requests
        connectionGuardQueue.async {
            center.removePendingNotificationRequests(withIdentifiers:identifiers)
            for request in pending {center.add(request)}
        }
        UserDefaults.standard.set(["hardwareId":hardwareId,"at":at.timeIntervalSince1970,"key":key],forKey:savedKey)
    }

    func clearHealthNotifications(cycleId:String?=nil){
        func matches(_ request:UNNotificationRequest)->Bool {
            let data=request.content.userInfo,nested=data["data"] as? [String:Any] ?? [:]
            let type=data["type"] as? String ?? nested["type"] as? String ?? ""
            let id=data["healthCycleId"] as? String ?? nested["healthCycleId"] as? String ?? ""
            return type=="wallaa_health_check" && (cycleId == nil || cycleId == id)
        }
        UNUserNotificationCenter.current().getPendingNotificationRequests{requests in
            UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers:requests.filter(matches).map{$0.identifier})
        }
        UNUserNotificationCenter.current().getDeliveredNotifications{notifications in
            let ids=notifications.filter{matches($0.request)}.map{$0.request.identifier}
            UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers:ids)
        }
    }

    private func reconcileMokoConnection() {
        guard mokoConnectionWanted else {
            mokoTelemetryTimeout?.cancel();mokoTelemetryCommand=nil;mokoTelemetryQueue=[]
            mokoConnectTimeout?.cancel();mokoRetry?.cancel(); mokoHandshakeTimeout?.cancel()
            if let peripheral = mokoPeripheral { central?.cancelPeripheralConnection(peripheral) }
            mokoPeripheral = nil; mokoAuthenticated = false; mokoDisconnectedAt = nil; mokoStatus = "disabled"
            return
        }
        guard Date() >= mokoRetryAt else {return}
        guard !mokoAuthenticationBlocked, let central, central.state == .poweredOn,
              let raw = config?.deviceId, let uuid = UUID(uuidString: raw) else { return }
        if let peripheral = mokoPeripheral, peripheral.identifier != uuid {
            central.cancelPeripheralConnection(peripheral)
            mokoPeripheral = nil; mokoAuthenticated = false
        }
        if let peripheral = mokoPeripheral, peripheral.state == .connected {
            if WallaaMokoGATT.shouldStartHandshake(connected:true,authenticated:mokoAuthenticated,phase:mokoStatus) { beginMokoAuthentication(peripheral) }
            return
        }
        if let peripheral = mokoPeripheral, peripheral.state == .connecting || peripheral.state == .disconnecting { return }
        if let peripheral = central.retrievePeripherals(withIdentifiers: [uuid]).first {
            connectMoko(peripheral)
        } else {
            mokoStatus = "searching"
            startScanIfNeeded(reason: "moko-discovery")
        }
    }

    private func connectMoko(_ peripheral: CBPeripheral) {
        guard mokoConnectionWanted, !mokoAuthenticationBlocked else { return }
        mokoPeripheral = peripheral
        peripheral.delegate = self
        if peripheral.state == .connected { beginMokoAuthentication(peripheral);return }
        mokoStatus = "connecting"
        central?.connect(peripheral, options: nil)
        mokoConnectTimeout?.cancel()
        mokoStreamReady?.cancel()
        let timeout=DispatchWorkItem { [weak self,weak peripheral] in
            guard let self,let peripheral,self.mokoPeripheral==peripheral,peripheral.state == .connecting else { return }
            self.mokoStatus="disconnected"
            if self.mokoDisconnectedAt == nil { self.mokoDisconnectedAt=Date() }
            self.central?.cancelPeripheralConnection(peripheral)
            self.scheduleMokoReconnect()
        }
        mokoConnectTimeout=timeout;DispatchQueue.main.asyncAfter(deadline:.now()+20,execute:timeout)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        guard peripheral.identifier.uuidString.caseInsensitiveCompare(config?.deviceId ?? "") == .orderedSame,
              mokoConnectionWanted else { central.cancelPeripheralConnection(peripheral); return }
        beginMokoAuthentication(peripheral)
    }

    private func beginMokoAuthentication(_ peripheral: CBPeripheral) {
        guard central?.state == .poweredOn, mokoConnectionWanted else { return }
        mokoConnectTimeout?.cancel()
        mokoStreamReady?.cancel()
        mokoResetInFlight = false
        mokoPeripheral = peripheral; peripheral.delegate = self
        mokoRetry?.cancel();mokoRetryAt = .distantPast
        mokoAuthenticated = false; mokoStatus = "authenticating"
        healthMotionAnchor=nil;healthPreviousAxes=nil;healthMotionSamples=[];healthMovementPending=false
        morningMotion=WallaaMorningMotion()
        NSLog("[WALLAA][MOKO] connected, authenticating")
        mokoPasswordCharacteristic = nil; mokoEventsCharacteristic = nil; mokoControlCharacteristics = []; mokoAuthenticationSent = false
        peripheral.discoverServices([CBUUID(string: "AA00")])
        mokoHandshakeTimeout?.cancel()
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.mokoPeripheral == peripheral, self.mokoStatus != "ready" else { return }
            self.mokoStatus = "connection_failed"
            self.central?.cancelPeripheralConnection(peripheral)
        }
        mokoHandshakeTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: timeout)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard peripheral == mokoPeripheral else { return }
        guard error == nil, let service = peripheral.services?.first(where: { $0.uuid == CBUUID(string: "AA00") }) else {
            mokoStatus = "connection_failed"; mokoAuthenticationBlocked = false
            central?.cancelPeripheralConnection(peripheral); return
        }
        NSLog("[WALLAA][MOKO] service AA00 found")
        peripheral.discoverCharacteristics([CBUUID(string: "AA01"), CBUUID(string: "AA02"), CBUUID(string: "AA06"), CBUUID(string: "AA07"), CBUUID(string: "AA08")], for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard peripheral == mokoPeripheral, service.uuid == CBUUID(string: "AA00") else { return }
        guard error == nil,
              let password = service.characteristics?.first(where: { $0.uuid == CBUUID(string: "AA07") }),
              let events = service.characteristics?.first(where: { $0.uuid == CBUUID(string: "AA08") }) else {
            mokoStatus = "connection_failed"; mokoAuthenticationBlocked = false
            central?.cancelPeripheralConnection(peripheral); return
        }
        mokoPasswordCharacteristic = password; mokoEventsCharacteristic = events
        mokoMotionCharacteristic=service.characteristics?.first(where:{$0.uuid==CBUUID(string:"AA06")})
        mokoControlCharacteristics = (service.characteristics ?? []).filter { [CBUUID(string:"AA01"),CBUUID(string:"AA02"),CBUUID(string:"AA07")].contains($0.uuid) }
        guard mokoControlCharacteristics.count == 3 else { mokoStatus = "connection_failed"; central?.cancelPeripheralConnection(peripheral); return }
        NSLog("[WALLAA][MOKO] subscribing control channels")
        for channel in mokoControlCharacteristics where !channel.isNotifying { peripheral.setNotifyValue(true, for:channel) }
        authenticateMokoIfReady(peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) {
        if peripheral==mokoPeripheral,characteristic.uuid==CBUUID(string:"AA06"){return}
        guard peripheral == mokoPeripheral, [CBUUID(string:"AA01"),CBUUID(string:"AA02"),CBUUID(string:"AA07"),CBUUID(string:"AA08")].contains(characteristic.uuid) else { return }
        guard error == nil, characteristic.isNotifying else {
            mokoStatus = "connection_failed"; central?.cancelPeripheralConnection(peripheral); return
        }
        NSLog("[WALLAA][MOKO] notification enabled: \(characteristic.uuid.uuidString)")
        if characteristic.uuid != CBUUID(string:"AA08") {
            authenticateMokoIfReady(peripheral)
        } else if characteristic.uuid == CBUUID(string: "AA08") {
            synchronizeMokoEventStream()
        }
    }

    private func synchronizeMokoEventStream() {
        mokoStatus = "synchronizing"
        // The vendor's dismiss command clears the latched click quantity and
        // produces an AA08 zero. Wait for that actual baseline, not a time guess.
        acknowledgeMokoPress()
    }

    private func acknowledgeMokoPress() {
        guard !mokoResetInFlight, mokoAuthenticated, let peripheral = mokoPeripheral,
              peripheral.state == .connected,
              let custom = mokoControlCharacteristics.first(where: { $0.uuid == CBUUID(string: "AA01") }) else { return }
        mokoResetInFlight = true
        peripheral.writeValue(WallaaMokoGATT.dismissAlarmCommand(), for: custom, type: .withResponse)
        NSLog("[WALLAA][MOKO] acknowledging stored click")
    }

    private func authenticateMokoIfReady(_ peripheral: CBPeripheral) {
            guard !mokoAuthenticationSent, mokoControlCharacteristics.count == 3, WallaaMokoGATT.controlChannelsReady(Set(mokoControlCharacteristics.filter{$0.isNotifying}.map{$0.uuid.uuidString})) else { return }
            guard let passwordChannel = mokoPasswordCharacteristic else { return }
            guard let hardwareId = config?.hardwareId, let password = WallaaMokoKeychain.read(hardwareId),
                  let command = WallaaMokoGATT.authenticationCommand(password) else {
                mokoStatus = "password_required"; mokoAuthenticationBlocked = true
                central?.cancelPeripheralConnection(peripheral); return
            }
            mokoAuthenticationSent = true
            NSLog("[WALLAA][MOKO] authenticating after control subscriptions")
            peripheral.writeValue(command, for: passwordChannel, type: .withResponse)
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        guard peripheral == mokoPeripheral, error != nil else { return }
        if characteristic.uuid==CBUUID(string:"AA01") { readNextMokoTelemetry();return }
        mokoStatus = "connection_failed"; central?.cancelPeripheralConnection(peripheral)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard peripheral == mokoPeripheral else { return }
        if let error { NSLog("[WALLAA][MOKO] characteristic update error: \(error.localizedDescription)"); return }
        guard let value = characteristic.value else { return }
        #if DEBUG
        if characteristic.uuid == CBUUID(string:"AA08") {
            let hex = value.map { String(format: "%02X", $0) }.joined()
            NSLog("[WALLAA][DIAGNOSTIC] AA08 bytes=\(hex) authenticated=\(mokoAuthenticated) setup=\(mokoSetupInProgress) armed=\(config?.armed == true)")
        }
        #endif
        if characteristic.uuid==CBUUID(string:"AA06") {
            if let axes=WallaaMokoGATT.acceleration(value){
                // Health Check keeps notifications open. A peak from hours ago
                // must not leave the live diagnostic permanently marked moving.
                if (nativeHealthEnabled || nativeMorningEnabled) && Date().timeIntervalSince(mokoMotionCaptureAt)>=3 {
                    mokoMotionCaptureAt=Date();mokoMotionPeakDelta=0;mokoMotionSampleCount=0
                    mokoTelemetry["motionObserved"]=false
                }
                if let previous=mokoMotionPrevious {mokoMotionPeakDelta=max(mokoMotionPeakDelta,WallaaMokoGATT.accelerationDelta(previous,axes))}
                mokoMotionPrevious=axes;mokoMotionSampleCount+=1;mokoTelemetry["acceleration"]=axes;mokoTelemetry["motionSampledAt"]=ISO8601DateFormatter().string(from:Date())
                if mokoMotionSampleCount>=2 {mokoTelemetry["motionObserved"]=mokoMotionPeakDelta>=150}
                if Date().timeIntervalSince(motionTelemetrySavedAt)>=3 {motionTelemetrySavedAt=Date();UserDefaults.standard.set(mokoTelemetry,forKey:"wallaa.moko.telemetry")}
                observeMorningMotion(axes)
                observeHealthMotion(axes)
            }
            if !nativeHealthEnabled && !nativeMorningEnabled && (mokoMotionSampleCount>=6 || Date().timeIntervalSince(mokoMotionCaptureAt)>=3) {
                mokoMotionWantedUntil = .distantPast;mokoMotionTimeout?.cancel();peripheral.setNotifyValue(false,for:characteristic)
                if mokoMotionPeakDelta>=150 {peripheral.readRSSI()}
            }
            return
        }
        if characteristic.uuid==CBUUID(string:"AA01") {
            if let accepted = WallaaMokoGATT.dismissAlarmReply(value) {
                NSLog("[WALLAA][MOKO] click acknowledgement accepted=\(accepted)")
                if !accepted {
                    mokoResetInFlight = false
                    if mokoStatus == "synchronizing" { central?.cancelPeripheralConnection(peripheral) }
                }
            } else { receiveMokoTelemetry(value) }
            return
        }
        if characteristic.uuid == CBUUID(string:"AA02") { NSLog("[WALLAA][MOKO] device disconnect code=\(value.count > 4 ? Int(value[4]) : -1)");return }
        if characteristic.uuid == CBUUID(string: "AA07") {
            guard let accepted = WallaaMokoGATT.authenticationReply(value) else { return }
            guard accepted else {
                mokoStatus = "password_error"; mokoAuthenticationBlocked = true
                central?.cancelPeripheralConnection(peripheral); return
            }
            NSLog("[WALLAA][MOKO] authentication accepted")
            mokoAuthenticated = true
            mokoStreamStartedAt = Date()
            mokoLastEventAt = .distantPast
            mokoStatus = "synchronizing"
            if let hardwareId = config?.hardwareId {
                mokoLastCount = UserDefaults.standard.object(forKey: "wallaa.moko.gatt.counter.\(hardwareId)") as? Int
            }
            // Official MOKO SDK monitors AA08 notifications. The setup flow has
            // already persisted a confirmed counter; no speculative GATT read
            // may consume the first physical SOS or break the connection.
            if let events = mokoEventsCharacteristic {
                if events.isNotifying { synchronizeMokoEventStream() }
                else { peripheral.setNotifyValue(true, for: events) }
            }
            reconcileHealthPhoneMotion()
            reconcileLocationTracking()
            return
        }
        guard characteristic.uuid == CBUUID(string: "AA08"), mokoAuthenticated,
              let count = WallaaMokoGATT.connectionCount(value),
              let hardwareId = config?.hardwareId else { return }
        let previous = mokoLastCount
        let synchronizing = mokoStatus != "ready"
        let now = Date()
        let quietGap = now.timeIntervalSince(mokoLastEventAt)
        mokoLastEventAt = now
        mokoLastCount = count
        UserDefaults.standard.set(count, forKey: "wallaa.moko.gatt.counter.\(hardwareId)")
        if count == 0 {
            mokoResetInFlight = false
            mokoRetryFailures=0;mokoRetryAt = .distantPast;mokoRetry?.cancel()
            mokoStatus = "ready"; mokoHandshakeTimeout?.cancel()
            mokoDisconnectedAt = nil; updateNativeConnectionGuard()
            requestMokoMotionSample()
            reconcileHealthPhoneMotion()
            NSLog("[WALLAA][MOKO] click baseline cleared, stream ready")
            return
        }
        if synchronizing { synchronizeMokoEventStream(); return }
        mokoRetryFailures=0;mokoRetryAt = .distantPast
        mokoStatus = "ready"; mokoHandshakeTimeout?.cancel(); mokoDisconnectedAt = nil;updateNativeConnectionGuard()
        NSLog("[WALLAA][MOKO] event count=\(count) previous=\(previous.map(String.init) ?? "none") setup=\(mokoSetupInProgress)")
        guard WallaaMokoGATT.shouldEmit(previous: previous, count: count, initialRead: false, quietGap: quietGap), mokoConnectionWanted,
              let config, triggerMatches(config.trigger, event: "press") else { return }
        // AA08 is a click quantity, NOT a unique lifetime event counter. Allocate
        // a separate id so two later single presses are not deduplicated by the API.
        let sequenceKey = "wallaa.moko.gatt.sequence.\(hardwareId)"
        let sequence = (UserDefaults.standard.integer(forKey: sequenceKey) % 65535) + 1
        UserDefaults.standard.set(sequence, forKey: sequenceKey)
        triggerBackgroundAlert(button: WallaaDecodedButton(packetId: sequence, battery: nil, buttonCode: 1,
                              event: "press", fingerprint: "moko-gatt:\(count)"), peripheralId: peripheral.identifier.uuidString)
    }

    func peripheral(_ peripheral: CBPeripheral, didReadRSSI RSSI: NSNumber, error: Error?) {
        if peripheral == mokoPeripheral, error == nil, (-127...0).contains(RSSI.intValue) { mokoRssi = RSSI.intValue;mokoRssiMeasuredAt=Date();UserDefaults.standard.set(["rssi":RSSI.intValue,"sampledAt":ISO8601DateFormatter().string(from:Date())],forKey:"wallaa.moko.radio") }
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        guard peripheral == mokoPeripheral else { return }
        mokoStatus = "disconnected"; if mokoDisconnectedAt == nil { mokoDisconnectedAt = Date() }; updateNativeConnectionGuard();scheduleMokoReconnect()
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        guard peripheral == mokoPeripheral else { return }
        mokoAuthenticated = false; mokoRssi=nil;mokoRssiMeasuredAt=nil;mokoHandshakeTimeout?.cancel()
        mokoDisconnectReason=error?.localizedDescription ?? "Il collegamento Bluetooth è stato interrotto. Wallaa riprova automaticamente."
        healthPhoneMotionStreak=0
        mokoStreamReady?.cancel()
        NSLog("[WALLAA][MOKO] disconnected: \(error?.localizedDescription ?? "no error")")
        if mokoConnectionWanted && !mokoAuthenticationBlocked {
            mokoStatus = "disconnected"; if mokoDisconnectedAt == nil { mokoDisconnectedAt = Date() }; updateNativeConnectionGuard();scheduleMokoReconnect()
        }
        reconcileHealthPhoneMotion()
        reconcileLocationTracking()
    }

    private func scheduleMokoReconnect() {
        guard mokoConnectionWanted, !mokoAuthenticationBlocked else { return }
        mokoRetry?.cancel()
        let delay=WallaaMokoGATT.reconnectDelay(failures:mokoRetryFailures)
        mokoRetryFailures+=1;mokoRetryAt=Date().addingTimeInterval(delay)
        let retry = DispatchWorkItem { [weak self] in self?.reconcileMokoConnection() }
        mokoRetry = retry
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: retry)
    }

    private var nativeGuardianShouldTrack: Bool {
        mokoAuthenticated && config?.profile.liveProtectionEnabled == true && config?.profile.plan == "pro"
    }

    private func publishGuardianLocation(_ location: CLLocation) {
        guard nativeGuardianShouldTrack, !guardianPublishing, location.horizontalAccuracy >= 0,
              abs(location.timestamp.timeIntervalSinceNow) < 60,
              Date().timeIntervalSince(guardianLastLocationAt) >= 10,
              let config, let token = config.identity.authToken, !token.isEmpty,
              var base = URL(string: config.apiUrl) else { return }
        base.deleteLastPathComponent()
        let url = base.appendingPathComponent("account").appendingPathComponent("live-location")
        let payload: [String: Any] = ["location": ["latitude": location.coordinate.latitude,
              "longitude": location.coordinate.longitude, "accuracy": location.horizontalAccuracy,
              "capturedAt": ISO8601DateFormatter().string(from: location.timestamp)]]
        guard let data = try? JSONSerialization.data(withJSONObject: payload) else { return }
        var request = URLRequest(url: url); request.httpMethod = "POST"; request.httpBody = data; request.timeoutInterval = 10
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(config.identity.installationId ?? "", forHTTPHeaderField: "x-wallaa-installation-id")
        request.setValue(token, forHTTPHeaderField: "x-wallaa-install-token")
        guardianPublishing = true; guardianLastLocationAt = Date()
        URLSession.shared.dataTask(with: request) { [weak self] _, _, _ in
            DispatchQueue.main.async { self?.guardianPublishing = false }
        }.resume()
    }

    func refreshConfiguration() {
        guard let raw = UserDefaults.standard.string(forKey: configDefaultsKey),
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode(WallaaNativeConfig.self, from: data) else {
            NSLog("[WALLAA][BLE] background config unavailable")
            config = nil
            nativeSentinelState = nil
            reconcileMokoConnection()
            stopNativeScan(reason: "missing-config")
            reconcileLocationTracking()
            return
        }
        if config?.profile.networkObserverEnabled != decoded.profile.networkObserverEnabled || config?.identity.authToken != decoded.identity.authToken {
            communityPaused=false;communityNextAttempt = .distantPast
        }
        let previousHealth=nativeHealthEnabled
        config = decoded
        reconcileHealthPhoneMotion()
        updateNativeConnectionGuard()
        if previousHealth && !nativeHealthEnabled && !nativeMorningEnabled,let characteristic=mokoMotionCharacteristic,characteristic.isNotifying {mokoPeripheral?.setNotifyValue(false,for:characteristic);healthMotionAnchor=nil;healthPreviousAxes=nil;healthMotionSamples=[];healthMovementPending=false}
        if nativeHealthEnabled || nativeMorningEnabled {requestMokoMotionSample()}
        if communityEnabled && !communityRequestedAlways && locationManager.authorizationStatus == .authorizedWhenInUse {
            communityRequestedAlways=true
            locationManager.requestAlwaysAuthorization()
        }
        if !communityEnabled {communityPending.removeAll();communityRequestedAlways=false;endCommunityTask()}
        reconcileMokoConnection()
        refreshNativeSentinelState()
        refreshLiveTrackingFromDefaults()
        reconcileLocationTracking()
        if UIApplication.shared.applicationState != .active, central?.state == .poweredOn {
            startScanIfNeeded(reason: "config-refresh")
        }
    }

    private func configurationAllowsBackgroundSOS() -> Bool {
        guard let config else { return false }
        return communityEnabled || (config.armed && !config.deviceId.isEmpty && !(config.identity.authToken ?? "").isEmpty)
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
        guard UIApplication.shared.applicationState != .active || mokoConnectionWanted else {
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
            central.scanForPeripherals(withServices: scanServices, options: nil)
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
        if central.state != .poweredOn && mokoConnectionWanted {
            mokoAuthenticated = false;mokoRssi=nil;mokoRssiMeasuredAt=nil; mokoStatus = "bluetooth_disabled"
            if mokoDisconnectedAt == nil { mokoDisconnectedAt = Date() }
        }
        NSLog("[WALLAA][BLE] central state=\(central.state.rawValue)")
        if central.state == .poweredOn { reconcileMokoConnection() }
        if central.state == .poweredOn, UIApplication.shared.applicationState != .active {
            startScanIfNeeded(forceRestart: true, reason: "central-powered-on")
        }
    }

    func centralManager(_ central: CBCentralManager, willRestoreState dict: [String : Any]) {
        let services = dict[CBCentralManagerRestoredStateScanServicesKey] as? [CBUUID] ?? []
        let peripherals = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] ?? []
        NSLog("[WALLAA][BLE] restored services=\(services.map{$0.uuidString}) peripherals=\(peripherals.map{$0.identifier.uuidString})")
        refreshConfiguration()
        for peripheral in peripherals where peripheral.identifier.uuidString.caseInsensitiveCompare(config?.deviceId ?? "") == .orderedSame && mokoConnectionWanted {
            mokoPeripheral = peripheral; peripheral.delegate = self
            let channels = peripheral.services?.first(where: { $0.uuid == CBUUID(string: "AA00") })?.characteristics ?? []
            if peripheral.state == .connected,
               let events = channels.first(where: { $0.uuid == CBUUID(string: "AA08") && $0.isNotifying }),
               let hardwareId = config?.hardwareId, WallaaMokoKeychain.read(hardwareId) != nil,
               WallaaMokoGATT.controlChannelsReady(Set(channels.filter { $0.isNotifying }.map { $0.uuid.uuidString })) {
                // iOS preserved the authenticated connection and subscriptions.
                // Re-authentication would discard the very notification that woke us.
                mokoEventsCharacteristic = events
                mokoPasswordCharacteristic = channels.first { $0.uuid == CBUUID(string: "AA07") }
                mokoControlCharacteristics = channels.filter { ["AA01", "AA02", "AA07"].contains($0.uuid.uuidString.uppercased()) }
                mokoMotionCharacteristic = channels.first { $0.uuid == CBUUID(string: "AA06") }
                mokoAuthenticated = true; mokoStatus = "ready"
                mokoLastCount = UserDefaults.standard.object(forKey: "wallaa.moko.gatt.counter.\(hardwareId)") as? Int ?? 0
                NSLog("[WALLAA][MOKO] restored live event subscription without clearing pending press")
                continue
            }
            if peripheral.state == .connected, !mokoAuthenticated, mokoStatus != "authenticating" { mokoStatus = "restoring" }
        }
        if central.state == .poweredOn {
            reconcileMokoConnection()
            reconcileHealthPhoneMotion()
            startScanIfNeeded(forceRestart: true, reason: "state-restoration")
        }
    }

    func centralManager(_ central: CBCentralManager,
                        didDiscover peripheral: CBPeripheral,
                        advertisementData: [String : Any],
                        rssi RSSI: NSNumber) {
        if mokoConnectionWanted, peripheral.identifier.uuidString.caseInsensitiveCompare(config?.deviceId ?? "") == .orderedSame {
            if mokoPeripheral == nil || mokoPeripheral?.state == .disconnected { connectMoko(peripheral) }
        }
        guard UIApplication.shared.applicationState != .active else { return }
        observeCommunityTag(peripheral, advertisement: advertisementData, rssi: RSSI)
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

        let fingerprint = "\(peripheral.identifier.uuidString.lowercased()):\(button.fingerprint ?? "\(button.packetId ?? -1):\(button.buttonCode)")"
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

    // MK Button repeats the triggered frame for the configured advertising duration.
    // The full counter is shared with the foreground monitor through Capacitor Preferences.
    private func decodeMokoButton(serviceData: [CBUUID: Data]) -> WallaaDecodedButton? {
        guard let hardwareId = config?.hardwareId, hardwareId.hasPrefix("MOKO:"),
              let data = serviceData[CBUUID(string: "FEE0")] else { return nil }
        let bytes = [UInt8](data)
        guard (9...12).contains(bytes.count), bytes[bytes.count - 2] <= 1 else { return nil }
        let event: String
        let code: Int
        switch bytes[0] {
        case 0x20: event = "press"; code = 1
        case 0x21: event = "double_press"; code = 2
        case 0x22: event = "long_press"; code = 4
        default: return nil // inactivity and unknown firmware never trigger a button SOS
        }
        if let info = serviceData[CBUUID(string: "EA00")], info.count == 21, info.first == 0 {
            let mac = info.suffix(6).map { String(format: "%02X", $0) }.joined()
            guard hardwareId == "MOKO:\(mac)" else { return nil }
        }
        let key = "CapacitorStorage.wallaa.safe.moko.counters.\(hardwareId)"
        var counters: [String: Int] = [:]
        if let raw = UserDefaults.standard.string(forKey: key), let encoded = raw.data(using: .utf8),
           let stored = try? JSONDecoder().decode([String: Int].self, from: encoded) {
            counters = stored
        }
        let mode = String(bytes[0])
        let counter = Int(bytes[2]) * 256 + Int(bytes[3])
        let previous = counters[mode]
        let triggered = bytes[1] & 0x02 != 0
        // Match the foreground decoder: telemetry for the new counter may
        // arrive before its alarm packet and must not consume that alarm.
        counters[mode] = !triggered && previous != nil ? previous : counter
        guard let encoded = try? JSONEncoder().encode(counters),
              let raw = String(data: encoded, encoding: .utf8) else { return nil }
        UserDefaults.standard.set(raw, forKey: key)
        guard triggered, let previous, previous != counter else { return nil }
        return WallaaDecodedButton(packetId: counter, battery: nil, buttonCode: code, event: event, fingerprint: "moko:\(mode):\(counter)")
    }

    private func decodeButton(advertisementData: [String: Any]) -> WallaaDecodedButton? {
        guard let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data] else { return nil }
        if serviceData[CBUUID(string: "FEE0")] != nil { return decodeMokoButton(serviceData: serviceData) }
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
        #if DEBUG
        NSLog("[WALLAA][MOKO] diagnostic hardware event, dispatch suppressed")
        wallaaDiagnosticRecord("acceptedPress", details: ["event": button.event, "packetId": button.packetId ?? -1])
        acknowledgeMokoPress()
        return
        #endif
        guard !mokoSetupInProgress else { return }
        guard !sending else {
            NSLog("[WALLAA][SOS] background send already in progress; ignoring duplicate burst")
            return
        }
        NSLog("[WALLAA][SOS] preparing native background alert event=\(button.event)")
        sending = true
        pendingButton = button
        pendingPeripheralId = peripheralId
        beginBackgroundTime()

        if config?.profile.sosLocationEnabled == false { sendAlert(location: nil); return }

        // Use a recent native location immediately when available. Otherwise request one,
        // but never block the SOS for more than 1.5 seconds.
        if let location = locationManager.location,
           abs(location.timestamp.timeIntervalSinceNow) < 15,
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

    func handleAdminLocationRequest(completion: @escaping (UIBackgroundFetchResult) -> Void) {
        refreshConfiguration()

        guard let config,
              !(config.identity.authToken ?? "").isEmpty else {
            NSLog("[WALLAA][LOCATION][ADMIN] native config/auth unavailable")
            completion(.failed)
            return
        }

        let status = locationManager.authorizationStatus
        guard status == .authorizedAlways || status == .authorizedWhenInUse else {
            NSLog("[WALLAA][LOCATION][ADMIN] location authorization=\(status.rawValue)")
            completion(.failed)
            return
        }

        if adminLocationRequestPending {
            NSLog("[WALLAA][LOCATION][ADMIN] request already pending")
            completion(.noData)
            return
        }

        adminLocationRequestPending = true
        adminLocationCompletion = completion

        if let recent = locationManager.location,
           recent.horizontalAccuracy >= 0,
           abs(recent.timestamp.timeIntervalSinceNow) < 60 {
            publishAdminLocationSnapshot(recent)
            return
        }

        locationManager.requestLocation()

        let timeout = DispatchWorkItem { [weak self] in
            guard let self, self.adminLocationRequestPending else { return }
            NSLog("[WALLAA][LOCATION][ADMIN] location request timeout")
            self.finishAdminLocationRequest(.failed)
        }
        adminLocationTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 8, execute: timeout)
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        publishCommunityObservations(location)

        if adminLocationRequestPending {
            publishAdminLocationSnapshot(location)
        }

        if sending {
            locationTimeout?.cancel()
            locationTimeout = nil
            sendAlert(location: location)
            return
        }
        if !liveAlertId.isEmpty {
            publishLiveLocation(location)
        }

        publishGuardianLocation(location)
        if nativeSentinelShouldTrack {
            publishNativeSentinelHeartbeat(location)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if !communityPending.isEmpty {communityNextAttempt=Date().addingTimeInterval(30);endCommunityTask()}
        if adminLocationRequestPending {
            NSLog("[WALLAA][LOCATION][ADMIN] location error=\(error.localizedDescription)")
            finishAdminLocationRequest(.failed)
        }

        if sending {
            locationTimeout?.cancel()
            locationTimeout = nil
            sendAlert(location: nil)
        }
    }

    private func publishAdminLocationSnapshot(_ location: CLLocation) {
        guard adminLocationRequestPending,
              let config,
              let token = config.identity.authToken,
              !token.isEmpty,
              var base = URL(string: config.apiUrl) else {
            finishAdminLocationRequest(.failed)
            return
        }

        adminLocationTimeout?.cancel()
        adminLocationTimeout = nil

        base.deleteLastPathComponent()
        let url = base.appendingPathComponent("account").appendingPathComponent("location-snapshot")

        let payload: [String: Any] = [
            "location": [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "accuracy": NSNumber(value: Int(location.horizontalAccuracy.rounded())),
                "altitude": location.altitude,
                "speed": location.speed >= 0 ? NSNumber(value: location.speed) : NSNull(),
                "heading": location.course >= 0 ? NSNumber(value: location.course) : NSNull(),
                "capturedAt": ISO8601DateFormatter().string(from: location.timestamp)
            ]
        ]

        guard let body = try? JSONSerialization.data(withJSONObject: payload) else {
            finishAdminLocationRequest(.failed)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let installationId = config.identity.installationId, !installationId.isEmpty {
            request.setValue(installationId, forHTTPHeaderField: "x-wallaa-installation-id")
        }
        request.setValue(token, forHTTPHeaderField: "x-wallaa-install-token")
        request.setValue(token, forHTTPHeaderField: "x-wallaa-auth-token")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body

        URLSession.shared.dataTask(with: request) { [weak self] _, response, error in
            DispatchQueue.main.async {
                guard let self else { return }

                if let error {
                    NSLog("[WALLAA][LOCATION][ADMIN] upload error=\(error.localizedDescription)")
                    self.finishAdminLocationRequest(.failed)
                    return
                }

                guard let http = response as? HTTPURLResponse,
                      (200..<300).contains(http.statusCode) else {
                    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                    NSLog("[WALLAA][LOCATION][ADMIN] upload HTTP=\(status)")
                    self.finishAdminLocationRequest(.failed)
                    return
                }

                NSLog("[WALLAA][LOCATION][ADMIN] snapshot uploaded lat=\(location.coordinate.latitude) lng=\(location.coordinate.longitude)")
                self.finishAdminLocationRequest(.newData)
            }
        }.resume()
    }

    private func finishAdminLocationRequest(_ result: UIBackgroundFetchResult) {
        adminLocationTimeout?.cancel()
        adminLocationTimeout = nil
        adminLocationRequestPending = false

        let completion = adminLocationCompletion
        adminLocationCompletion = nil
        completion?(result)
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
            "locationEnabled": config.profile.sosLocationEnabled != false,
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
        if let location, config.profile.sosLocationEnabled != false {
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
            if let networkLocation = json["location"] as? [String:Any] { restored["location"] = networkLocation }
            if let location, self.config?.profile.sosLocationEnabled != false {
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
            if (json["liveTracking"] as? Bool) == true && self.config?.profile.sosLocationEnabled != false {
                DispatchQueue.main.async { self.startLiveTracking(alertId: alertId) }
            }
            DispatchQueue.main.async {
                AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
                // Confirm hardware only after the server has accepted the SOS.
                // This never ends the server alert or its live location session.
                if self.mokoPeripheral?.identifier.uuidString == self.pendingPeripheralId { self.acknowledgeMokoPress() }
                self.finishBackgroundSend()
            }
        }.resume()
    }

    private func refreshLiveTrackingFromDefaults() {
        if config?.profile.sosLocationEnabled == false {
            if !liveAlertId.isEmpty { stopLiveTracking() }
            return
        }
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
        reconcileLocationTracking()
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
        reconcileLocationTracking()
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

    private var nativeSentinelShouldTrack: Bool {
        guard let state = nativeSentinelState else { return false }
        guard state.active == true, state.available == true else { return false }
        guard let config, !(config.identity.authToken ?? "").isEmpty else { return false }
        return true
    }

    private func refreshNativeSentinelState() {
        guard let raw = UserDefaults.standard.string(forKey: sentinelDefaultsKey),
              let data = raw.data(using: .utf8),
              let decoded = try? JSONDecoder().decode(WallaaNativeSentinelState.self, from: data) else {
            nativeSentinelState = nil
            return
        }

        nativeSentinelState = decoded
    }

    private func finishSentinelTask(){
        if sentinelTask != .invalid {UIApplication.shared.endBackgroundTask(sentinelTask);sentinelTask = .invalid}
    }
    private func reconcileSentinelHeartbeat(){
        guard nativeSentinelShouldTrack,locationManager.authorizationStatus == .authorizedAlways else {
            sentinelHeartbeatTimer?.cancel();sentinelHeartbeatTimer=nil;sentinelRefreshTimeout?.cancel();sentinelRefreshTimeout=nil;finishSentinelTask();return
        }
        guard sentinelHeartbeatTimer == nil else{return}
        let timer=DispatchSource.makeTimerSource(queue:.main)
        timer.schedule(deadline:.now(),repeating:60,leeway:.seconds(10))
        timer.setEventHandler{[weak self] in self?.sentinelHeartbeatTick()}
        sentinelHeartbeatTimer=timer;timer.resume()
    }
    private func sentinelHeartbeatTick(){
        guard nativeSentinelShouldTrack,locationManager.authorizationStatus == .authorizedAlways else {reconcileSentinelHeartbeat();return}
        guard sentinelRefreshTimeout == nil else{return}
        let now=Date(),location=locationManager.location
        let fresh=location.map{$0.horizontalAccuracy>=0 && abs($0.timestamp.timeIntervalSince(now))<=60} ?? false
        if !fresh,liveAlertId.isEmpty,now.timeIntervalSince(sentinelLastLocationRequestAt)>=120 {
            // Coalesce contact and the requested fix into one upload. Sending contact
            // first would rate-limit the fresh fix that arrives a few seconds later.
            sentinelLastLocationRequestAt=now
            if UIApplication.shared.applicationState != .active,sentinelTask == .invalid {
                sentinelTask=UIApplication.shared.beginBackgroundTask(withName:"WallaaSentinelRefresh"){[weak self] in self?.finishSentinelTask()}
            }
            let fallback=DispatchWorkItem{[weak self] in
                guard let self else{return};self.sentinelRefreshTimeout=nil
                self.publishNativeSentinelHeartbeat(nil)
            }
            sentinelRefreshTimeout=fallback
            DispatchQueue.main.asyncAfter(deadline:.now()+8,execute:fallback)
            locationManager.requestLocation()
        } else {publishNativeSentinelHeartbeat(location)}
    }

    private var locationTrackingMode=""
    private var significantMonitoringActive=false
    private func setSignificantMonitoring(_ enabled:Bool){
        guard enabled != significantMonitoringActive,CLLocationManager.significantLocationChangeMonitoringAvailable() else{return}
        significantMonitoringActive=enabled
        if enabled {locationManager.startMonitoringSignificantLocationChanges()}
        else {locationManager.stopMonitoringSignificantLocationChanges()}
    }
    private func reconcileLocationTracking() {
        reconcileSentinelHeartbeat()
        let sentinelTracking = nativeSentinelShouldTrack
        let guardianTracking = nativeGuardianShouldTrack
        let needsLocation = !liveAlertId.isEmpty || sentinelTracking || guardianTracking

        guard needsLocation else {
            if locationTrackingMode != "off" {locationTrackingMode="off";locationManager.stopUpdatingLocation()}
            setSignificantMonitoring(false)
            return
        }

        let status = locationManager.authorizationStatus

        // WALLAA 4.0.74 — Sentinel background presence requires Always permission.
        if (sentinelTracking || guardianTracking) && status != .authorizedAlways {
            NSLog("[WALLAA][SENTINEL][NATIVE] Always location required, authorization=\(status.rawValue)")
            if !communityRequestedAlways && UIApplication.shared.applicationState == .active && (status == .authorizedWhenInUse || status == .notDetermined) {
                communityRequestedAlways=true
                locationManager.requestAlwaysAuthorization()
            }
        }

        guard status == .authorizedAlways || (!sentinelTracking && !guardianTracking && status == .authorizedWhenInUse) else {
            if locationTrackingMode != "off" {locationTrackingMode="off";locationManager.stopUpdatingLocation()}
            setSignificantMonitoring(false)
            return
        }

        let mode = !liveAlertId.isEmpty ? "emergency" : sentinelTracking ? "sentinel" : "passive"
        if mode != locationTrackingMode {
            locationTrackingMode=mode
            locationManager.stopUpdatingLocation()
            if mode == "emergency" {
                locationManager.desiredAccuracy=kCLLocationAccuracyBest
                locationManager.distanceFilter=kCLDistanceFilterNone
                locationManager.pausesLocationUpdatesAutomatically=false
                locationManager.startUpdatingLocation()
            } else if mode == "sentinel" {
                locationManager.desiredAccuracy=kCLLocationAccuracyHundredMeters
                locationManager.distanceFilter=50
                locationManager.pausesLocationUpdatesAutomatically=false
                locationManager.startUpdatingLocation()
            } else {
                // Ordinary readiness does not need a continuously running high-accuracy GPS.
                locationManager.desiredAccuracy=kCLLocationAccuracyHundredMeters
                locationManager.distanceFilter=100
                locationManager.pausesLocationUpdatesAutomatically=true
                locationManager.requestLocation()
            }
        }

        setSignificantMonitoring((sentinelTracking || guardianTracking) && status == .authorizedAlways)

        if sentinelTracking,
           let recent = locationManager.location,
           recent.horizontalAccuracy >= 0,
           abs(recent.timestamp.timeIntervalSinceNow) < 60 {
            publishNativeSentinelHeartbeat(recent)
        }
    }

    private func publishNativeSentinelHeartbeat(_ location: CLLocation?, force: Bool = false) {
        guard nativeSentinelShouldTrack,
              !sentinelPublishing,
              let config,
              let token = config.identity.authToken,
              !token.isEmpty else {
            return
        }

        let now = Date()

        if !force && now.timeIntervalSince(sentinelLastAttemptAt) < 60 {
            return
        }

        guard var base = URL(string: config.apiUrl) else { return }

        // config.apiUrl = .../api/alert -> .../api/sentinel/heartbeat
        base.deleteLastPathComponent()

        let url = base
            .appendingPathComponent("sentinel")
            .appendingPathComponent("heartbeat")

        var payload:[String:Any]=[:]
        if let location,location.horizontalAccuracy>=0,abs(location.timestamp.timeIntervalSince(now))<=60 {
            payload["location"]=["latitude":location.coordinate.latitude,"longitude":location.coordinate.longitude,
                "accuracy":location.horizontalAccuracy,"capturedAt":ISO8601DateFormatter().string(from:location.timestamp),
                "heading":location.course>=0 ? NSNumber(value:location.course) : NSNull()]
        }

        guard let body = try? JSONSerialization.data(withJSONObject: payload) else {
            return
        }

        sentinelRefreshTimeout?.cancel();sentinelRefreshTimeout=nil
        sentinelPublishing = true;sentinelLastAttemptAt=now
        if UIApplication.shared.applicationState != .active,sentinelTask == .invalid {
            sentinelTask=UIApplication.shared.beginBackgroundTask(withName:"WallaaSentinelPresence"){[weak self] in self?.finishSentinelTask()}
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let installationId = config.identity.installationId,
           !installationId.isEmpty {
            request.setValue(
                installationId,
                forHTTPHeaderField: "x-wallaa-installation-id"
            )
        }

        request.setValue(token, forHTTPHeaderField: "x-wallaa-install-token")
        request.setValue(token, forHTTPHeaderField: "x-wallaa-auth-token")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = body

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let self else { return }

            DispatchQueue.main.async {
                self.sentinelPublishing = false;self.finishSentinelTask()
                guard self.config?.identity.authToken == token else{return}

                if let error {
                    NSLog(
                        "[WALLAA][SENTINEL][NATIVE] heartbeat error=\(error.localizedDescription)"
                    )
                    return
                }

                guard let http = response as? HTTPURLResponse else {
                    NSLog("[WALLAA][SENTINEL][NATIVE] heartbeat no-http-response")
                    return
                }

                guard (200..<300).contains(http.statusCode) else {
                    if [401,403].contains(http.statusCode) {
                        self.nativeSentinelState=nil
                        UserDefaults.standard.removeObject(forKey:self.sentinelDefaultsKey)
                        self.reconcileLocationTracking()
                    }
                    NSLog(
                        "[WALLAA][SENTINEL][NATIVE] heartbeat HTTP=\(http.statusCode)"
                    )
                    return
                }

                self.sentinelLastSentAt = now

                if let data,
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {

                    if json["ignored"] as? Bool == true {
                        self.nativeSentinelState = nil
                        UserDefaults.standard.removeObject(forKey:self.sentinelDefaultsKey)
                        self.reconcileLocationTracking()
                        NSLog(
                            "[WALLAA][SENTINEL][NATIVE] backend ignored Sentinel; tracking stopped"
                        )
                        return
                    }

                    if let status = json["status"] as? String,
                       status.lowercased() == "offline" {
                        self.nativeSentinelState = nil
                        UserDefaults.standard.removeObject(forKey:self.sentinelDefaultsKey)
                        self.reconcileLocationTracking()
                        NSLog(
                            "[WALLAA][SENTINEL][NATIVE] Sentinel offline; tracking stopped"
                        )
                        return
                    }
                }

                NSLog(
                    "[WALLAA][SENTINEL][NATIVE] heartbeat uploaded withGPS=\(payload["location"] != nil)"
                )
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

private enum WallaaMokoGATT {
    static func phoneMoving(acceleration: [Double], rotation: [Double]) -> Bool {
        guard acceleration.count == 3, rotation.count == 3,
              (acceleration + rotation).allSatisfy({ $0.isFinite }) else { return false }
        return acceleration.map { abs($0) }.max()! >= 0.05 || rotation.map { abs($0) }.max()! >= 0.35
    }
    // Official MOKO iOS SDK bxd_configDismissAlarmWithSucBlock.
    static func dismissAlarmCommand() -> Data { Data([0xea, 0x01, 0x41, 0x00]) }
    static func dismissAlarmReply(_ data: Data) -> Bool? {
        let bytes = [UInt8](data)
        guard bytes.count == 5, Array(bytes.prefix(4)) == [0xeb, 0x01, 0x41, 0x01] else { return nil }
        return bytes[4] == 0xaa
    }
    static func medianAcceleration(_ samples:[[String:Int]])->[String:Int]? {
        guard samples.count == 5, samples.allSatisfy({ sample in ["x","y","z"].allSatisfy { sample[$0] != nil } }) else { return nil }
        return Dictionary(uniqueKeysWithValues: ["x","y","z"].map { axis in
            (axis, samples.compactMap { $0[axis] }.sorted()[2])
        })
    }
    static func observationInterval(moving:Bool?)->TimeInterval{moving==true ? 15 : moving==false ? 45 : 30}
    static func movementFlag(_ data:Data)->Bool?{let b=[UInt8](data);guard (9...12).contains(b.count),[0x20,0x21,0x22].contains(b[0]),b[b.count-2]<=1,b[b.count-1]<=1 else{return nil};return b[b.count-1]==1}

    static func shouldPauseCommunity(statusCode:Int)->Bool{statusCode==401}
    static func communityRetryDelay(statusCode:Int)->TimeInterval{statusCode==403 ? 60 : 30}
    static func reconnectDelay(failures:Int)->TimeInterval{min(60.0,pow(2.0,Double(min(max(0,failures),6))))}
    static func accelerationDelta(_ previous:[String:Int],_ current:[String:Int])->Int{["x","y","z"].map{abs((current[$0] ?? 0)-(previous[$0] ?? 0))}.max() ?? 0}
    static func acceleration(_ data:Data)->[String:Int]?{
        let b=[UInt8](data);guard b.count==10,b[0]==0xeb,b[3]==6 else{return nil}
        func signed(_ offset:Int)->Int{Int(Int16(bitPattern:UInt16(b[offset])<<8|UInt16(b[offset+1])))}
        return ["x":signed(4),"y":signed(6),"z":signed(8)]
    }

    static func telemetryReply(_ data:Data,command:UInt8)->[String:Any]? {
        let b=[UInt8](data)
        guard b.count>=4,b[0]==0xeb,b[1]==0,b[2]==command,b.count==Int(b[3])+4 else { return nil }
        let payload=Array(b.dropFirst(4))
        if command==0x4f { guard (1...2).contains(payload.count),let flags=payload.last else {return [:]};return ["threeAxisAvailable":(flags & 1) != 0] }
        if command==0x62 || command==0x4a {
            guard !payload.isEmpty,payload.count<=4 else { return [:] }
            let number=payload.reduce(0){($0<<8)|Int($1)}
            if command==0x62 { return number<=100 ? ["battery":number] : [:] }
            return (1...6000).contains(number) ? ["batteryVoltageMv":number] : [:]
        }
        let value=String(bytes:payload,encoding:.utf8)?.trimmingCharacters(in:.controlCharacters) ?? ""
        guard !value.isEmpty else { return [:] }
        let key: String
        switch command {case 0x2d:key="hardwareVersion";case 0x2e:key="productModel";case 0x5a:key="productionDate";default:return [:]}
        return [key:value]
    }
    static func shouldStartHandshake(connected:Bool,authenticated:Bool,phase:String)->Bool {
        connected && !authenticated && !["authenticating","synchronizing"].contains(phase)
    }
    static func controlChannelsReady(_ active: Set<String>) -> Bool {
        Set(["AA01","AA02","AA07"]).isSubset(of:Set(active.map{$0.uppercased()}))
    }
    static func authenticationCommand(_ password: String) -> Data? {
        guard let bytes = password.data(using: .ascii), (1...16).contains(bytes.count) else { return nil }
        var command = Data([0xEA, 0x01, 0x55, UInt8(bytes.count)])
        command.append(bytes)
        return command
    }
    static func authenticationReply(_ data: Data) -> Bool? {
        let bytes = [UInt8](data)
        guard bytes.count == 5, Array(bytes.prefix(4)) == [0xEB, 0x01, 0x55, 0x01] else { return nil }
        return bytes[4] == 0xAA
    }
    static func connectionCount(_ data: Data) -> Int? {
        let bytes = [UInt8](data)
        guard bytes.count == 5, Array(bytes.prefix(4)) == [0xEB, 0x02, 0x06, 0x01] else { return nil }
        return Int(bytes[4])
    }
    static func shouldEmit(previous: Int?, count: Int, initialRead: Bool, quietGap: TimeInterval = 0) -> Bool {
        guard !initialRead, (1...255).contains(count) else { return false }
        guard let previous, (0...255).contains(previous) else { return false }
        return previous != count
    }
}

// A first sample is only a baseline, never evidence of movement. The median
// rejects isolated spikes; require a fresh window after gaps or reconnects.
private struct WallaaMorningMotion {
    private var samples:[[String:Int]]=[]
    private var anchor:[String:Int]?
    private var lastAt:Date?
    static func day(at:Date,calendar:Calendar = .current)->String {
        let p=calendar.dateComponents([.year,.month,.day],from:at)
        return "\(p.year ?? 0)-\(p.month ?? 0)-\(p.day ?? 0)"
    }
    mutating func observe(_ axes:[String:Int],at:Date,calendar:Calendar = .current)->Bool {
        if let lastAt,at.timeIntervalSince(lastAt)>10 {samples=[];anchor=nil}
        lastAt=at;samples.append(axes);if samples.count>5 {samples.removeFirst()}
        guard let filtered=WallaaMokoGATT.medianAcceleration(samples) else{return false}
        guard let baseline=anchor else {anchor=filtered;return false}
        let moved=WallaaMokoGATT.accelerationDelta(baseline,filtered)>=60
        if moved {anchor=filtered}
        return moved && calendar.component(.hour,from:at)>=6
    }
}

private enum WallaaMokoKeychain {
    static func read(_ hardwareId: String) -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "it.wallaa.moko.connection", kSecAttrAccount as String: hardwareId,
            kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func write(_ password: String, hardwareId: String) -> Bool {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "it.wallaa.moko.connection", kSecAttrAccount as String: hardwareId]
        let values: [String: Any] = [kSecValueData as String: Data(password.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, values as CFDictionary)
        if status == errSecSuccess { return true }
        guard status == errSecItemNotFound else { return false }
        return SecItemAdd(query.merging(values) { _, value in value } as CFDictionary, nil) == errSecSuccess
    }
}

@objc(WallaaMokoPlugin)
public class WallaaMokoPlugin: CAPPlugin, CAPBridgedPlugin, AVAudioPlayerDelegate {
    private var alarmPlayer:AVAudioPlayer?
    private var alarmVibrationTimer:Timer?
    public let identifier = "WallaaMokoPlugin"
    public let jsName = "WallaaMoko"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "clearIconBadge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "alarmAudio", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearHealthNotices", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "permissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestLocation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "beginSetup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authorizeAccessory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAccessory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "forgetAccessory", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endSetup", returnType: CAPPluginReturnPromise)
    ]
    @objc func clearIconBadge(_ call:CAPPluginCall) {
        DispatchQueue.main.async {WallaaIconBadge.clear();call.resolve()}
    }
    @objc func alarmAudio(_ call:CAPPluginCall) {
        DispatchQueue.main.async {
            let session=AVAudioSession.sharedInstance()
            if call.getBool("stop") == true {
                self.alarmPlayer?.stop();self.alarmPlayer=nil
                self.alarmVibrationTimer?.invalidate();self.alarmVibrationTimer=nil
                try? session.setActive(false,options:.notifyOthersOnDeactivation)
                call.resolve();return
            }
            if call.getBool("soft") == true,self.alarmPlayer?.isPlaying == true {call.resolve(["ignored":true]);return}
            if call.getBool("soft") != true {
                self.alarmVibrationTimer?.invalidate();self.alarmVibrationTimer=nil
                AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
                if call.getBool("loop") == true {
                    self.alarmVibrationTimer=Timer.scheduledTimer(withTimeInterval:2,repeats:true) { _ in
                        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
                    }
                }
            }
            do {
                guard let url=Bundle.main.url(forResource:call.getBool("soft") == true ? "wallaa-soft-chime" : "wallaa-guardian-siren",withExtension:"wav") else {call.reject("Suono non disponibile");return}
                // Real alarm playback only. No silent loop to keep the app alive.
                try session.setCategory(.playback,mode:.default,options:[.duckOthers])
                try session.setActive(true)
                self.alarmPlayer?.stop()
                let player=try AVAudioPlayer(contentsOf:url)
                player.delegate=self;player.volume=1;player.numberOfLoops=call.getBool("loop") == true ? -1 : 0
                self.alarmPlayer=player
                guard player.play() else {throw NSError(domain:"WallaaAudio",code:1)}
                call.resolve(["route":session.currentRoute.outputs.map{$0.portType.rawValue}])
            }catch{self.alarmPlayer=nil;try? session.setActive(false,options:.notifyOthersOnDeactivation);call.reject("Impossibile riprodurre l’avviso",nil,error)}
        }
    }
    public func audioPlayerDidFinishPlaying(_ player:AVAudioPlayer,successfully flag:Bool) {
        if alarmPlayer === player {alarmVibrationTimer?.invalidate();alarmVibrationTimer=nil;alarmPlayer=nil;try? AVAudioSession.sharedInstance().setActive(false,options:.notifyOthersOnDeactivation)}
    }
    @objc func configure(_ call: CAPPluginCall) {
        guard let hardwareId = call.getString("hardwareId"),
              hardwareId.range(of: "^MOKO:[0-9A-F]{12}$", options: .regularExpression) != nil else {
            call.reject("Pulsante MOKO non valido."); return
        }
        let enabled = call.getBool("enabled") ?? false
        let existing = WallaaMokoKeychain.read(hardwareId)
        if let password = call.getString("password"), !password.isEmpty,
           existing == nil || call.getBool("useExistingPassword") != true {
            guard let data = password.data(using: .ascii), (1...16).contains(data.count),
                  WallaaMokoKeychain.write(password, hardwareId: hardwareId) else {
                call.reject("Password del pulsante non valida o non salvabile."); return
            }
        }
        DispatchQueue.main.async {
            WallaaBackgroundBLEManager.shared.configureMokoConnection(hardwareId: hardwareId, enabled: enabled)
            call.resolve(["enabled": enabled])
        }
    }
    @objc func authorizeAccessory(_ call:CAPPluginCall){
        DispatchQueue.main.async {
            if #available(iOS 18.0, *) {
                WallaaAccessoryPairing.shared.authorize(existingID:call.getString("deviceId"),reuse:call.getBool("reuseAuthorized") ?? true){result in
                    switch result {case .success(let identifier):call.resolve(["deviceId":identifier]);case .failure(let error):call.reject(error.localizedDescription)}
                }
            } else {call.resolve(["supported":false])}
        }
    }
    @objc func forgetAccessory(_ call:CAPPluginCall){
        guard let identifier=call.getString("deviceId"),UUID(uuidString:identifier) != nil else{call.reject("Identificativo del pulsante non valido.");return}
        DispatchQueue.main.async{
            if #available(iOS 18.0, *){WallaaAccessoryPairing.shared.authorize(existingID:identifier,remove:true){result in switch result{case .success:call.resolve();case .failure(let error):call.reject(error.localizedDescription)}}}
            else{call.resolve()}
        }
    }
    @objc func cancelAccessory(_ call:CAPPluginCall){DispatchQueue.main.async{if #available(iOS 18.0, *){WallaaAccessoryPairing.shared.cancel()};call.resolve()}}
    @objc func beginSetup(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard WallaaBackgroundBLEManager.shared.canStartMokoSetup else {
                call.reject("Un allarme è in invio. Attendi prima di configurare il pulsante.")
                return
            }
            WallaaBackgroundBLEManager.shared.beginMokoSetup { released in
                if released { call.resolve() }
                else { call.reject("Il collegamento precedente è ancora occupato. Attendi qualche secondo e riprova.") }
            }
        }
    }
    @objc func endSetup(_ call: CAPPluginCall) {
        if let hardwareId = call.getString("hardwareId"),
           hardwareId.range(of: "^MOKO:[0-9A-F]{12}$", options: .regularExpression) != nil,
           let counter = call.getInt("baselineCount"), (0...255).contains(counter) {
            UserDefaults.standard.set(counter, forKey: "wallaa.moko.gatt.counter.\(hardwareId)")
        }
        let keepSuppressed = call.getBool("keepSuppressed") ?? false
        DispatchQueue.main.async {
            WallaaBackgroundBLEManager.shared.setMokoSetupInProgress(keepSuppressed, allowConnection: true)
            call.resolve()
        }
    }
    @objc func permissions(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let base=WallaaBackgroundBLEManager.shared.safetyPermissionStatus()
            UNUserNotificationCenter.current().getNotificationSettings { settings in
                var result=base;result["notifications"]=settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional
                result["notificationAuthorization"]=settings.authorizationStatus == .denied ? "denied" : settings.authorizationStatus == .notDetermined ? "not-determined" : "authorized"
                call.resolve(result)
            }
        }
    }
    @objc func requestLocation(_ call: CAPPluginCall) {
        DispatchQueue.main.async { WallaaBackgroundBLEManager.shared.requestSafetyLocation();call.resolve() }
    }
    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url=URL(string:UIApplication.openSettingsURLString) else{call.reject("Impostazioni iPhone non disponibili.");return}
            UIApplication.shared.open(url,options:[:]){opened in if opened{call.resolve()}else{call.reject("Non è stato possibile aprire le Impostazioni iPhone.")}}
        }
    }
    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(WallaaBackgroundBLEManager.shared.mokoConnectionStatus(refresh:call.getBool("refresh") ?? false)) }
    }
    @objc func clearHealthNotices(_ call:CAPPluginCall) {
        DispatchQueue.main.async {
            let manager=WallaaBackgroundBLEManager.shared
            manager.recordHealthNotificationClear(call.getString("clearedAt"))
            manager.clearHealthNotifications(cycleId:call.getString("cycleId"));call.resolve()
        }
    }
}

@objc(WallaaStorePlugin)
public class WallaaStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WallaaStorePlugin"
    public let jsName = "WallaaStore"
    public let pluginMethods: [CAPPluginMethod] = ["product", "purchase", "restore", "pending", "finish", "manage"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    private let proProductID = "it.wallaa.safebutton.pro.monthly"
    private var transactions: [UInt64: StoreKit.Transaction] = [:]
    private var updates: Task<Void, Never>?

    public override func load() {
        updates = Task { @MainActor [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self, let payload = self.receipt(result) else { continue }
                self.notifyListeners("transaction", data: payload)
            }
        }
    }
    deinit { updates?.cancel() }

    private func receipt(_ result: VerificationResult<StoreKit.Transaction>) -> [String: Any]? {
        guard case .verified(let transaction) = result, transaction.productID == proProductID else { return nil }
        transactions[transaction.id] = transaction
        return ["status": "verified", "transactionId": String(transaction.id), "signedTransaction": result.jwsRepresentation]
    }
    private func requestedProduct(_ call: CAPPluginCall) async throws -> Product {
        guard call.getString("productId") == proProductID,
              let product = try await Product.products(for: [proProductID]).first,
              product.type == .autoRenewable,
              product.subscription?.subscriptionPeriod.unit == .month,
              product.subscription?.subscriptionPeriod.value == 1 else {
            throw NSError(domain: "WallaaStore", code: 1, userInfo: [NSLocalizedDescriptionKey: "Wallaa Pro is not available in the App Store yet."])
        }
        return product
    }
    @objc func product(_ call: CAPPluginCall) {
        Task { @MainActor in
            do { let product = try await requestedProduct(call)
                call.resolve(["productId": product.id, "displayName": product.displayName, "displayPrice": product.displayPrice, "periodMonths": 1])
            } catch { call.reject(error.localizedDescription) }
        }
    }
    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                guard let token = call.getString("appAccountToken").flatMap(UUID.init(uuidString:)) else { call.reject("Wallaa account missing."); return }
                let product = try await requestedProduct(call)
                switch try await product.purchase(options: [.appAccountToken(token)]) {
                case .success(let result):
                    guard let payload = receipt(result) else { call.reject("Apple purchase verification failed."); return }
                    call.resolve(payload)
                case .pending: call.resolve(["status": "pending"])
                case .userCancelled: call.resolve(["status": "cancelled"])
                @unknown default: call.reject("Apple purchase status unavailable.")
                }
            } catch { call.reject(error.localizedDescription) }
        }
    }
    private func collect(_ call: CAPPluginCall, restore: Bool) {
        Task { @MainActor in
            do {
                if restore { try await AppStore.sync() }
                var receipts: [String: [String: Any]] = [:]
                for await result in StoreKit.Transaction.currentEntitlements {
                    if let payload = receipt(result), let id = payload["transactionId"] as? String { receipts[id] = payload }
                }
                for await result in StoreKit.Transaction.unfinished {
                    if let payload = receipt(result), let id = payload["transactionId"] as? String { receipts[id] = payload }
                }
                call.resolve(["transactions": Array(receipts.values)])
            } catch { call.reject(error.localizedDescription) }
        }
    }
    @objc func restore(_ call: CAPPluginCall) { collect(call, restore: true) }
    @objc func pending(_ call: CAPPluginCall) { collect(call, restore: false) }
    @objc func finish(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let raw = call.getString("transactionId"), let id = UInt64(raw), let transaction = transactions[id] else { call.reject("Apple transaction unavailable."); return }
            await transaction.finish(); transactions.removeValue(forKey: id); call.resolve()
        }
    }
    @objc func manage(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = self.bridge?.viewController?.view.window?.windowScene else { call.reject("Apple subscription settings unavailable."); return }
            do { try await AppStore.showManageSubscriptions(in: scene); call.resolve() } catch { call.reject(error.localizedDescription) }
        }
    }
}

@objc(WallaaBridgeViewController)
class WallaaBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() { bridge?.registerPluginInstance(WallaaMokoPlugin()); bridge?.registerPluginInstance(WallaaStorePlugin()) }
}
