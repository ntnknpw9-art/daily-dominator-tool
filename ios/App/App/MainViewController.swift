import Capacitor
import CapApp_SPM

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(makeRevenueCatPurchasesPlugin())
        bridge?.registerPluginInstance(InstagramStories())
    }
}