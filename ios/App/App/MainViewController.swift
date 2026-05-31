import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        for purchasesPluginClassName in ["PurchasesPlugin", "RevenuecatPurchasesCapacitor.PurchasesPlugin"] {
            if let purchasesPluginType = NSClassFromString(purchasesPluginClassName) as? CAPPlugin.Type {
                bridge?.registerPluginInstance(purchasesPluginType.init())
                break
            }
        }
        bridge?.registerPluginInstance(DailyDominatorStoreKit())
        bridge?.registerPluginInstance(InstagramStories())
    }
}