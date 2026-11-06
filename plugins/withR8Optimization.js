const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

// Expo's template ships proguard-android.txt, whose -dontoptimize turns off R8 optimisation
// (Play Console flags it). expo-build-properties has no option for either setting below.
function withR8Optimization(config) {
  config = withAppBuildGradle(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      'getDefaultProguardFile("proguard-android.txt")',
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    return config;
  });

  return withGradleProperties(config, (config) => {
    const key = 'android.r8.optimizedResourceShrinking';
    config.modResults = config.modResults.filter((item) => item.key !== key);
    config.modResults.push({ type: 'property', key, value: 'true' });
    return config;
  });
}

module.exports = withR8Optimization;
