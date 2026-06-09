import Capacitor
import RevenuecatPurchasesCapacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(InstagramStories())
        bridge?.registerPluginInstance(PurchasesPlugin())
    }
}
