const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const appJsonPath = path.resolve(__dirname, '../app.json');

function bumpVersion(currentVersion, type) {
    const parts = currentVersion.split('.').map(Number);
    if (type === 'major') {
        parts[0]++;
        parts[1] = 0;
        parts[2] = 0;
    } else if (type === 'minor') {
        parts[1]++;
        parts[2] = 0;
    } else {
        // Default to patch
        parts[2]++;
    }
    return parts.join('.');
}

try {
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const currentVersion = packageJson.version;

    // Determine bump type
    const type = (process.argv[2] || 'patch').replace(/^--/, '');
    const newVersion = bumpVersion(currentVersion, type);

    console.log(`Bumping version from ${currentVersion} to ${newVersion} (${type})`);

    // Update package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('Updated package.json');

    // Update app.json
    if (fs.existsSync(appJsonPath)) {
        const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

        // Update Expo version
        if (appJson.expo) {
            appJson.expo.version = newVersion;

            // Update Android versionCode
            if (appJson.expo.android) {
                const currentVersionCode = appJson.expo.android.versionCode || 1;
                appJson.expo.android.versionCode = currentVersionCode + 1;
                console.log(`Bumping Android versionCode to ${appJson.expo.android.versionCode}`);
            }
        }

        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
        console.log('Updated app.json');
    } else {
        console.warn('app.json not found, skipping...');
    }

    console.log(`Successfully bumped version to ${newVersion}`);

} catch (error) {
    console.error('Error bumping version:', error);
    process.exit(1);
}
