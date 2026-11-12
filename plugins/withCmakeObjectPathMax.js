const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

// Local Windows builds otherwise pass MAX_PATH (RNGH 3, safe-area-context, Reanimated). CMake only hashes a
// long object path if the hashed one fits the limit; RNGH's needs ~251, so keep this between 251 and 259.
const ARG = '-DCMAKE_OBJECT_PATH_MAX=255';
const MARKER = '// withCmakeObjectPathMax';

// Libraries with their own CMake build (e.g. Reanimated) don't get the app's arguments.
const LIBRARY_HOOK = `
${MARKER}
subprojects { sub ->
  sub.plugins.withId('com.android.library') {
    sub.android.defaultConfig.externalNativeBuild.cmake.arguments('${ARG}')
  }
}
`;

function withCmakeObjectPathMax(config) {
  config = withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(ARG)) return config;
    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig \{(\r?\n)/,
      `defaultConfig {$1        externalNativeBuild { cmake { arguments "${ARG}" } }$1`
    );
    return config;
  });

  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(MARKER)) {
      config.modResults.contents += LIBRARY_HOOK;
    }
    return config;
  });
}

module.exports = withCmakeObjectPathMax;
