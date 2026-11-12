const { withGradleProperties } = require('@expo/config-plugins');

// EAS release profiles set GRADLE_OPTS (parallel off, 2 workers) to stop OOM kills on medium
// workers; that replaces EAS's default jvmargs, so these apply instead (EAS default is 4g/1g).
const PROPERTIES = {
  'org.gradle.jvmargs': '-Xmx3g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8',
  'org.gradle.parallel': 'false',
};

function withGradleMemoryLimits(config) {
  return withGradleProperties(config, (config) => {
    config.modResults = config.modResults.filter((item) => !(item.key in PROPERTIES));
    for (const [key, value] of Object.entries(PROPERTIES)) {
      config.modResults.push({ type: 'property', key, value });
    }
    return config;
  });
}

module.exports = withGradleMemoryLimits;
