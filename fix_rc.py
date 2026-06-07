import sys

file_path = 'src/lib/revenuecat.ts'
with open(file_path, 'r') as f:
    content = f.read()

# Fix ensureInit correctly
ensure_init_new = """async function ensureInit(userId?: string) {
  if (!isIOS()) return null;
  if (!REVENUECAT_IOS_API_KEY) {
    rcLog('init', 'NO API KEY configured');
    return null;
  }
  const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
  if (!initialized) {
    if (initializePromise && initializeStartedAt && Date.now() - initializeStartedAt > INIT_TIMEOUT_MS + 2000) {
      rcLog('init', 'discarding stale initialize promise before retry', {
        elapsedMs: Date.now() - initializeStartedAt,
        timeoutMs: INIT_TIMEOUT_MS,
      });
      initializePromise = null;
      initializeStartedAt = 0;
    }
    if (!initializePromise) {
      const keyPrefix = REVENUECAT_IOS_API_KEY.slice(0, 10);
      const keyLooksValid = REVENUECAT_IOS_API_KEY.startsWith('appl_');
      rcLog('init', 'configuring RevenueCat', {
        ...getRevenueCatClientConfig(),
        apiKeyPrefix: keyPrefix,
        appUserID: userId ?? '(anonymous)',
      });
      if (!keyLooksValid) {
        rcLog('init', 'WARNING: API key does NOT start with "appl_" — this may be an Android (goog_) or Web (rcb_) key!');
      }
      initializeStartedAt = Date.now();
      initializePromise = (async () => {
        try {
          await withTimeout(
            Purchases.configure({
              apiKey: REVENUECAT_IOS_API_KEY,
              appUserID: userId,
              storeKitVersion: IOS_STOREKIT_VERSION,
            } as never),
            CONFIGURE_TIMEOUT_MS,
            'RevenueCat configure'
          );
        } catch (e) {
          const postTimeoutConfigured = await withTimeout(
            Purchases.isConfigured(),
            3000,
            'RevenueCat isConfigured after configure timeout'
          ).catch(() => null);
          if (!postTimeoutConfigured?.isConfigured) {
            throw e;
          }
          rememberRevenueCatError('RevenueCat configure timed out but SDK is configured', e);
          rcLog('init', 'configure promise timed out, but native SDK reports configured — continuing');
        }
        initialized = true;
        void Purchases.setLogLevel({ level: LOG_LEVEL.VERBOSE }).catch(() => {});
        configuredAppUserID = userId ?? null;
        rcLog('init', 'configure resolved', { storeKitVersion: IOS_STOREKIT_VERSION });
        void Promise.allSettled([
          withTimeout(Purchases.isConfigured(), 3000, 'RevenueCat post-config isConfigured'),
          withTimeout(Purchases.getAppUserID(), 3000, 'RevenueCat post-config getAppUserID'),
        ]).then(([configured, appUser]) => {
          rcLog('init', 'post-config identity diagnostic', {
            configured: configured.status === 'fulfilled' ? configured.value : (configured as any).reason?.message,
            appUserID: appUser.status === 'fulfilled' ? (appUser.value as any)?.appUserID : (appUser as any).reason?.message,
            storeKitVersion: IOS_STOREKIT_VERSION,
          });
        });
      })();
    }
    try {
      await initializePromise;
    } catch (e) {
      initialized = false;
      initializePromise = null;
      initializeStartedAt = 0;
      rememberRevenueCatError('RevenueCat configure', e);
      throw e;
    }
  } else if (userId && configuredAppUserID !== userId) {
    try {
      const result = await Purchases.logIn({ appUserID: userId });
      configuredAppUserID = userId;
      rcLog('init', 'logIn OK', { appUserID: userId, created: result?.created });
    } catch (e) {
      rememberRevenueCatError('logIn', e);
      rcLog('init', 'logIn failed', e);
    }
  }
  return Purchases;
}"""

import re
# Find start of ensureInit and end of it (roughly)
content = re.sub(r'async function ensureInit\(userId\?\: string\) \{.*?return Purchases;\s*\}', ensure_init_new, content, flags=re.DOTALL)

# Fix missing braces and headers
content = content.replace('return diagnostics;\n\nexport async function', 'return diagnostics;\n}\n\nexport async function')
content = content.replace("'X-Platform': 'ios',", "Authorization: `Bearer ${REVENUECAT_IOS_API_KEY}`,\n        'X-Platform': 'ios',")

# Fix missing try { blocks
content = content.replace('    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, \'RevenueCat initialize\');', '  try {\n    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, \'RevenueCat initialize\');')
content = content.replace('    const start = Date.now();\n    const offerings = await withTimeout', '  try {\n    const start = Date.now();\n    const offerings = await withTimeout')
content = content.replace('    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, \'RevenueCat initialize\');', '  try {\n    Purchases = await withTimeout(ensureInit(), INIT_TIMEOUT_MS, \'RevenueCat initialize\');')
content = content.replace('    const start = Date.now();\n    const result = await withTimeout', '  try {\n    const start = Date.now();\n    const result = await withTimeout')
content = content.replace('    const started = Date.now();\n    const result = await supabase.functions.invoke(\'sync-subscription\');', '  try {\n    const started = Date.now();\n    const result = await supabase.functions.invoke(\'sync-subscription\');')
content = content.replace('    log(\'user\', { id: auth.user?.id, email: auth.user?.email });', '  try {\n    const { data: auth } = await supabase.auth.getUser();\n    log(\'user\', { id: auth.user?.id, email: auth.user?.email });')
content = content.replace('    log(\'product received\', summarizeProduct(product));', '  try {\n    const { data: auth } = await supabase.auth.getUser();\n    log(\'product received\', summarizeProduct(product));')
content = content.replace('    log(\'user\', { id: auth.user?.id, email: auth.user?.email });\n    const Purchases = await ensureInit(auth.user?.id);', '  try {\n    const { data: auth } = await supabase.auth.getUser();\n    log(\'user\', { id: auth.user?.id, email: auth.user?.email });\n    const Purchases = await ensureInit(auth.user?.id);')
content = content.replace('    Purchases = await withTimeout(ensureInit(auth.user?.id), INIT_TIMEOUT_MS, \'RevenueCat initialize before getCustomerInfo\');', '  try {\n    Purchases = await withTimeout(ensureInit(auth.user?.id), INIT_TIMEOUT_MS, \'RevenueCat initialize before getCustomerInfo\');')
content = content.replace('    const started = Date.now();\n    const result: RevenueCatPurchaseResult = await withTimeout', '  try {\n    const started = Date.now();\n    const result: RevenueCatPurchaseResult = await withTimeout')

# Remove duplicate Authorization headers if they appeared
content = content.replace("Authorization: `Bearer ${REVENUECAT_IOS_API_KEY}`,\n        Authorization: `Bearer ${REVENUECAT_IOS_API_KEY}`,", "Authorization: `Bearer ${REVENUECAT_IOS_API_KEY}`,")

with open(file_path, 'w') as f:
    f.write(content)
