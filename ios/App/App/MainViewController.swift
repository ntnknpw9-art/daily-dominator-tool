import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        let revenueCatPluginClass = NSClassFromString("RevenuecatPurchasesCapacitor.PurchasesPlugin")
            ?? NSClassFromString("PurchasesPlugin")
        if let purchasesPlugin = revenueCatPluginClass as? CAPPlugin.Type {
            bridge?.registerPluginInstance(purchasesPlugin.init())
        }
        bridge?.registerPluginInstance(InstagramStories())
    }
}