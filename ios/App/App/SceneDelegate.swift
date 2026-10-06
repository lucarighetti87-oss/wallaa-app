import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Instantiate the Swift bridge explicitly. A storyboard-created non-nil window
        // can contain a plain UIViewController, which never loads the web interface.
        let appWindow = UIWindow(windowScene: windowScene)
        appWindow.rootViewController = WallaaBridgeViewController()
        window = appWindow
        appWindow.makeKeyAndVisible()

        NSLog("[WALLAA][BOOT] SceneDelegate connected")
        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
