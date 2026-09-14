import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        // Main.storyboard already contains CAPBridgeViewController. Do not replace the
        // storyboard-created window during scene connection. Only create a fallback window
        // if UIKit did not provide one.
        if window == nil {
            let fallbackWindow = UIWindow(windowScene: windowScene)
            fallbackWindow.rootViewController = CAPBridgeViewController()
            fallbackWindow.makeKeyAndVisible()
            window = fallbackWindow
        }

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
