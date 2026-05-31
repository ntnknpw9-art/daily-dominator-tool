import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        if let purchasesPluginType = NSClassFromString("PurchasesPlugin") as? CAPPlugin.Type,
           let purchasesPlugin = purchasesPluginType.init() as? CAPPlugin {
            bridge?.registerPluginInstance(purchasesPlugin)
        }
        bridge?.registerPluginInstance(DailyDominatorStoreKit())
        bridge?.registerPluginInstance(InstagramStories())
    }
}