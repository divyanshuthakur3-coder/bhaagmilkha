const { withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidXCoreFix = (config) => {
    return withProjectBuildGradle(config, (config) => {
        const resolutionStrategy = `
allprojects {
    configurations.all {
        resolutionStrategy {
            force 'androidx.core:core:1.15.0'
            force 'androidx.core:core-ktx:1.15.0'
        }
    }
}
`;
        if (!config.modResults.contents.includes('androidx.core:core:1.15.0')) {
            config.modResults.contents += resolutionStrategy;
        }
        return config;
    });
};

module.exports = withAndroidXCoreFix;
