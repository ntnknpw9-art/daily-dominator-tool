import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(DailyDominatorStoreKit())
        bridge?.registerPluginInstance(InstagramStories())
    }
}