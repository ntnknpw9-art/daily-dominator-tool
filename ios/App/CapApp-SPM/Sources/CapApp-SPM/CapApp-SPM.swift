import Capacitor
import RevenuecatPurchasesCapacitor

public let isCapacitorApp = true

public func makeRevenueCatPurchasesPlugin() -> CAPPlugin {
    PurchasesPlugin()
}
