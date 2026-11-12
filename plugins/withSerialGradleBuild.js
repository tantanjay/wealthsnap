const { withGradleProperties } = require('@expo/config-plugins');

// Parallel mode ran R8 alongside every module's CMake build and ran out of memory
// on EAS free-tier workers (Gradle daemon killed). Serial is slower but fits.
function withSerialGradleBuild(config) {
  return withGradleProperties(config, (config) => {
    const key = 'org.gradle.parallel';
    config.modResults = config.modResults.filter((item) => item.key !== key);
    config.modResults.push({ type: 'property', key, value: 'false' });
    return config;
  });
}

module.exports = withSerialGradleBuild;
