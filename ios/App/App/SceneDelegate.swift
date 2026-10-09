import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Instantiate the Swift bridge explicitly. A storyboard-created non-nil window
        // can contain a plain UIViewController, which never loads the web interface.
        let appWindow = UIWindow(windowScene: windowScene)
        let loading = UIViewController()
        loading.view.backgroundColor = UIColor(red: 0.01, green: 0.05, blue: 0.08, alpha: 1)
        let title = UILabel()
        title.text = "Wallaa · WB-001\nPreparazione del collegamento Apple…"
        title.textColor = .cyan
        title.numberOfLines = 0
        title.textAlignment = .center
        title.translatesAutoresizingMaskIntoConstraints = false
        loading.view.addSubview(title)
        let skip = UIButton(type: .system)
        skip.setTitle("Continua senza questa verifica", for: .normal)
        skip.addAction(UIAction { _ in WallaaAccessoryBootstrap.shared.skipMigration() }, for: .touchUpInside)
        skip.translatesAutoresizingMaskIntoConstraints = false
        loading.view.addSubview(skip)
        NSLayoutConstraint.activate([
            title.centerXAnchor.constraint(equalTo: loading.view.centerXAnchor),
            title.centerYAnchor.constraint(equalTo: loading.view.centerYAnchor),
            title.leadingAnchor.constraint(equalTo: loading.view.leadingAnchor, constant: 24),
            title.trailingAnchor.constraint(equalTo: loading.view.trailingAnchor, constant: -24),
            skip.topAnchor.constraint(equalTo: title.bottomAnchor, constant: 24),
            skip.centerXAnchor.constraint(equalTo: loading.view.centerXAnchor)
        ])
        appWindow.rootViewController = loading
        window = appWindow
        appWindow.makeKeyAndVisible()
        WallaaAccessoryBootstrap.shared.prepare { [weak appWindow] in
            appWindow?.rootViewController = WallaaBridgeViewController()
        }

        NSLog("[WALLAA][BOOT] SceneDelegate connected")
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        NSLog("[WALLAA][ACCESSORY] scene active")
        WallaaAccessoryBootstrap.shared.presentMigrationIfNeeded()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
