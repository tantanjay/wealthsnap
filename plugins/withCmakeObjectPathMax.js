const { withAppBuildGradle } = require('@expo/config-plugins');

// Without this, local Windows builds fail: RNGH 3 and safe-area-context object dirs pass MAX_PATH.
// 240 makes CMake hash long object paths; lower values leave too little room and also fail.
const ARG = '-DCMAKE_OBJECT_PATH_MAX=240';

function withCmakeObjectPathMax(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(ARG)) return config;
    config.modResults.contents = config.modResults.contents.replace(
      /defaultConfig \{(\r?\n)/,
      `defaultConfig {$1        externalNativeBuild { cmake { arguments "${ARG}" } }$1`
    );
    return config;
  });
}

module.exports = withCmakeObjectPathMax;
