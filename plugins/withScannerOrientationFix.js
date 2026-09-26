const { withAndroidManifest } = require('@expo/config-plugins');

// Google Play Services' bundled ML Kit scanner activities hardcode
// screenOrientation="PORTRAIT" in their own AAR manifest, which Play Console
// flags as a large-screen resizability restriction. We don't declare these
// activities ourselves — this overrides just that one merged attribute.
const ACTIVITIES_TO_UNLOCK = [
  'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity',
  'com.google.mlkit.vision.documentscanner.internal.GmsDocumentScanningDelegateActivity',
];

function withScannerOrientationFix(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;

    if (!application.activity) application.activity = [];

    for (const name of ACTIVITIES_TO_UNLOCK) {
      application.activity.push({
        $: {
          'android:name': name,
          'android:screenOrientation': 'unspecified',
          'tools:replace': 'android:screenOrientation',
        },
      });
    }

    return config;
  });
}

module.exports = withScannerOrientationFix;
