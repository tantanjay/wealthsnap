module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module-resolver',
                {
                    root: ['./'],
                    alias: {
                        '@fonts': './assets/fonts',
                        '@images': './assets/images',
                    },
                },
            ],
            'react-native-reanimated/plugin',
        ],
        env: {
            production: {
                plugins: ['transform-remove-console'],
            },
        },
    };
};
