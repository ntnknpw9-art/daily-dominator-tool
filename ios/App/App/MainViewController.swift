import Capacitor
import RevenuecatPurchasesCapacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(PurchasesPlugin())
        bridge?.registerPluginInstance(DailyDominatorStoreKit())
        bridge?.registerPluginInstance(InstagramStories())
    }
}