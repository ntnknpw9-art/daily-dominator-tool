import Foundation
import StoreKit
import Capacitor

private struct StoreKitRequestContext {
    let call: CAPPluginCall
    let requestedIdentifiers: [String]
    let purchaseIdentifier: String?
}

@objc(DailyDominatorStoreKit)
public class DailyDominatorStoreKit: CAPPlugin, CAPBridgedPlugin, SKProductsRequestDelegate, SKPaymentTransactionObserver {
    public let identifier = "DailyDominatorStoreKit"
    public let jsName = "DailyDominatorStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "diagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise)
    ]

    private var activeProductRequests: [String: SKProductsRequest] = [:]
    private var requestContexts: [String: StoreKitRequestContext] = [:]
    private var pendingPurchaseCalls: [String: CAPPluginCall] = [:]
    private let priceFormatter = NumberFormatter()

    public override func load() {
        super.load()
        priceFormatter.numberStyle = .currency
        SKPaymentQueue.default().add(self)
    }

    deinit {
        SKPaymentQueue.default().remove(self)
    }

    @objc func diagnostics(_ call: CAPPluginCall) {
        call.resolve([
            "bundleIdentifier": Bundle.main.bundleIdentifier ?? "",
            "canMakePayments": SKPaymentQueue.canMakePayments(),
            "minimumIOS": "15.0",
            "nativeFallback": "StoreKit1",
            "pendingPurchases": Array(pendingPurchaseCalls.keys)
        ])
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let productIdentifiers = stringArrayOption(call, key: "productIdentifiers")
        guard !productIdentifiers.isEmpty else {
            call.reject("Missing productIdentifiers")
            return
        }

        startProductsRequest(
            identifiers: productIdentifiers,
            call: call,
            purchaseIdentifier: nil
        )
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard SKPaymentQueue.canMakePayments() else {
            call.reject("In-App Purchases are disabled on this device")
            return
        }

        guard let productIdentifier = call.getString("productIdentifier"), !productIdentifier.isEmpty else {
            call.reject("Missing productIdentifier")
            return
        }

        guard pendingPurchaseCalls[productIdentifier] == nil else {
            call.reject("Purchase already in progress for \(productIdentifier)")
            return
        }

        startProductsRequest(
            identifiers: [productIdentifier],
            call: call,
            purchaseIdentifier: productIdentifier
        )
    }

    private func startProductsRequest(identifiers: [String], call: CAPPluginCall, purchaseIdentifier: String?) {
        let request = SKProductsRequest(productIdentifiers: Set(identifiers))
        let key = requestKey(request)
        activeProductRequests[key] = request
        requestContexts[key] = StoreKitRequestContext(
            call: call,
            requestedIdentifiers: identifiers,
            purchaseIdentifier: purchaseIdentifier
        )
        request.delegate = self
        request.start()
    }

    private func stringArrayOption(_ call: CAPPluginCall, key: String) -> [String] {
        if let values = call.getArray(key, String.self) {
            return values
        }

        if let values = call.options[key] as? [Any] {
            return values.compactMap { $0 as? String }
        }

        return []
    }

    private func requestKey(_ request: SKRequest) -> String {
        return String(describing: ObjectIdentifier(request))
    }

    public func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
        let key = requestKey(request)
        guard let context = requestContexts.removeValue(forKey: key) else { return }
        activeProductRequests.removeValue(forKey: key)

        if let purchaseIdentifier = context.purchaseIdentifier {
            guard let product = response.products.first(where: { $0.productIdentifier == purchaseIdentifier }) else {
                let invalid = response.invalidProductIdentifiers.joined(separator: ", ")
                context.call.reject("Product not found in StoreKit: \(purchaseIdentifier). Invalid identifiers: \(invalid)")
                return
            }

            pendingPurchaseCalls[purchaseIdentifier] = context.call
            SKPaymentQueue.default().add(SKPayment(product: product))
            return
        }

        let payload = response.products.map { productPayload($0) }
        context.call.resolve([
            "products": payload,
            "invalidProductIdentifiers": response.invalidProductIdentifiers,
            "requestedProductIdentifiers": context.requestedIdentifiers
        ])
    }

    public func request(_ request: SKRequest, didFailWithError error: Error) {
        guard let productsRequest = request as? SKProductsRequest else { return }
        let key = requestKey(productsRequest)
        let context = requestContexts.removeValue(forKey: key)
        activeProductRequests.removeValue(forKey: key)
        context?.call.reject("StoreKit products failed: \(error.localizedDescription)")
    }

    public func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        for transaction in transactions {
            let productIdentifier = transaction.payment.productIdentifier
            guard let call = pendingPurchaseCalls[productIdentifier] else { continue }

            switch transaction.transactionState {
            case .purchasing:
                continue
            case .purchased, .restored:
                pendingPurchaseCalls.removeValue(forKey: productIdentifier)
                queue.finishTransaction(transaction)
                call.resolve([
                    "status": "success",
                    "productIdentifier": productIdentifier,
                    "transactionIdentifier": transaction.transactionIdentifier ?? ""
                ])
            case .deferred:
                pendingPurchaseCalls.removeValue(forKey: productIdentifier)
                call.resolve([
                    "status": "pending",
                    "productIdentifier": productIdentifier
                ])
            case .failed:
                pendingPurchaseCalls.removeValue(forKey: productIdentifier)
                queue.finishTransaction(transaction)
                if let skError = transaction.error as? SKError, skError.code == .paymentCancelled {
                    call.resolve([
                        "status": "cancelled",
                        "productIdentifier": productIdentifier
                    ])
                } else {
                    call.reject("StoreKit purchase failed: \(transaction.error?.localizedDescription ?? "Unknown error")")
                }
            @unknown default:
                pendingPurchaseCalls.removeValue(forKey: productIdentifier)
                call.reject("Unknown StoreKit purchase result")
            }
        }
    }

    private func productPayload(_ product: SKProduct) -> [String: Any] {
        priceFormatter.locale = product.priceLocale
        let displayPrice = priceFormatter.string(from: product.price) ?? product.price.stringValue

        var payload: [String: Any] = [
            "identifier": product.productIdentifier,
            "title": product.localizedTitle,
            "displayName": product.localizedTitle,
            "description": product.localizedDescription,
            "price": product.price.doubleValue,
            "priceString": displayPrice,
            "displayPrice": displayPrice,
            "source": "native-storekit",
            "productType": "AUTO_RENEWABLE_SUBSCRIPTION"
        ]

        if #available(iOS 11.2, *), let period = product.subscriptionPeriod {
            payload["subscriptionPeriod"] = [
                "unit": period.unit.capacitorName,
                "value": period.numberOfUnits
            ]
        }

        return payload
    }
}

@available(iOS 11.2, *)
private extension SKProduct.PeriodUnit {
    var capacitorName: String {
        switch self {
        case .day: return "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        @unknown default: return "unknown"
        }
    }
}