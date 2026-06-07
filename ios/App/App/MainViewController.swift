import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        if let purchasesPlugin = NSClassFromString("RevenuecatPurchasesCapacitor.PurchasesPlugin") as? CAPPlugin.Type {
            bridge?.registerPluginInstance(purchasesPlugin.init())
        }
        bridge?.registerPluginInstance(InstagramStories())
    }
}