import Foundation
import StoreKit
import Capacitor

@objc(DailyDominatorStoreKit)
public class DailyDominatorStoreKit: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DailyDominatorStoreKit"
    public let jsName = "DailyDominatorStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "diagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise)
    ]

    @objc func diagnostics(_ call: CAPPluginCall) {
        call.resolve([
            "bundleIdentifier": Bundle.main.bundleIdentifier ?? "",
            "canMakePayments": SKPaymentQueue.canMakePayments(),
            "minimumIOS": "15.0",
            "nativeFallback": "StoreKit2"
        ])
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        guard let productIdentifiers = call.getStringArray("productIdentifiers"), !productIdentifiers.isEmpty else {
            call.reject("Missing productIdentifiers")
            return
        }

        Task {
            do {
                let products = try await Product.products(for: productIdentifiers)
                let payload = products.map { product in
                    productPayload(product)
                }
                call.resolve(["products": payload])
            } catch {
                call.reject("StoreKit products failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productIdentifier = call.getString("productIdentifier"), !productIdentifier.isEmpty else {
            call.reject("Missing productIdentifier")
            return
        }

        Task {
            do {
                guard let product = try await Product.products(for: [productIdentifier]).first else {
                    call.reject("Product not found in StoreKit: \(productIdentifier)")
                    return
                }

                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try checkVerified(verification)
                    await transaction.finish()
                    call.resolve([
                        "status": "success",
                        "productIdentifier": transaction.productID,
                        "transactionIdentifier": String(transaction.id)
                    ])
                case .pending:
                    call.resolve([
                        "status": "pending",
                        "productIdentifier": productIdentifier
                    ])
                case .userCancelled:
                    call.resolve([
                        "status": "cancelled",
                        "productIdentifier": productIdentifier
                    ])
                @unknown default:
                    call.reject("Unknown StoreKit purchase result")
                }
            } catch {
                call.reject("StoreKit purchase failed: \(error.localizedDescription)")
            }
        }
    }

    private func productPayload(_ product: Product) -> [String: Any] {
        var payload: [String: Any] = [
            "identifier": product.id,
            "title": product.displayName,
            "displayName": product.displayName,
            "description": product.description,
            "price": NSDecimalNumber(decimal: product.price).doubleValue,
            "priceString": product.displayPrice,
            "displayPrice": product.displayPrice,
            "source": "native-storekit"
        ]

        if let subscription = product.subscription {
            payload["productType"] = "AUTO_RENEWABLE_SUBSCRIPTION"
            payload["subscriptionPeriod"] = [
                "unit": String(describing: subscription.subscriptionPeriod.unit),
                "value": subscription.subscriptionPeriod.value
            ]
        }

        return payload
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreKitVerificationError.failed
        case .verified(let safe):
            return safe
        }
    }
}

enum StoreKitVerificationError: Error {
    case failed
}