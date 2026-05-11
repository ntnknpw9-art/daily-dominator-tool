import Foundation
import UIKit
import Capacitor

@objc(InstagramStories)
public class InstagramStories: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramStories"
    public let jsName = "InstagramStories"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "canShare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "share", returnType: CAPPluginReturnPromise)
    ]

    @objc func canShare(_ call: CAPPluginCall) {
        guard let url = URL(string: "instagram-stories://share") else {
            call.resolve(["available": false])
            return
        }

        call.resolve(["available": UIApplication.shared.canOpenURL(url)])
    }

    // Facebook App ID required by Instagram for Stories sharing
    private let facebookAppId = "1529039678842404"

    @objc func share(_ call: CAPPluginCall) {
        guard let url = URL(string: "instagram-stories://share?source_application=\(facebookAppId)") else {
            call.reject("Instagram Stories URL is invalid")
            return
        }

        guard UIApplication.shared.canOpenURL(url) else {
            call.reject("Instagram is not installed")
            return
        }

        guard let imageBase64 = call.getString("backgroundImage") else {
            call.reject("Missing story image")
            return
        }

        let cleanedBase64 = imageBase64
            .replacingOccurrences(of: "data:image/png;base64,", with: "")
            .replacingOccurrences(of: "data:image/jpeg;base64,", with: "")

        guard let imageData = Data(base64Encoded: cleanedBase64) else {
            call.reject("Invalid story image")
            return
        }

        UIPasteboard.general.setItems(
            [[
                "com.instagram.sharedSticker.backgroundImage": imageData,
                "com.instagram.sharedSticker.sourceApplication": facebookAppId
            ]],
            options: [.expirationDate: Date().addingTimeInterval(300)]
        )

        DispatchQueue.main.async {
            UIApplication.shared.open(url, options: [:]) { completed in
                if completed {
                    call.resolve(["completed": true])
                } else {
                    call.reject("Could not open Instagram Stories")
                }
            }
        }
    }
}