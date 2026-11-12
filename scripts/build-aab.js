#!/usr/bin/env node
/**
 * Builds a signed release AAB locally, for when EAS can't (e.g. out-of-memory on free workers).
 *
 *   npm run build:aab -- --credentials=path/to/credentials.json
 *   npm run build:aab -- --store-file=path.jks --store-password=... --key-alias=... --key-password=...
 *
 * Options: --channel=production (EAS Update channel baked into the build), --prepare-only (stop before Gradle).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ANDROID = path.join(ROOT, 'android');
const APP_JSON = path.join(ROOT, 'app.json');
const AAB = path.join(ANDROID, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab');
const IS_WINDOWS = process.platform === 'win32';

// The EAS limits from withGradleMemoryLimits don't apply here; a local machine has the memory.
const LOCAL_GRADLE_PROPERTIES = {
  'org.gradle.jvmargs': '-Xmx4g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8',
  'org.gradle.parallel': 'true',
};

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const match = argv[i].match(/^--([^=]+)(?:=(.*))?$/);
    if (!match) fail(`Unexpected argument: ${argv[i]}`);
    const [, key, inline] = match;
    if (inline !== undefined) args[key] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) args[key] = argv[++i];
    else args[key] = true;
  }
  return args;
}

// credentials.json is the file `eas credentials` downloads; keystorePath is relative to the project.
function readSigning(args) {
  if (args.credentials) {
    const file = path.resolve(args.credentials);
    if (!fs.existsSync(file)) fail(`credentials file not found: ${file}`);
    const keystore = JSON.parse(fs.readFileSync(file, 'utf8')).android?.keystore;
    if (!keystore) fail(`${file} has no android.keystore section`);
    const candidates = [path.resolve(path.dirname(file), keystore.keystorePath), path.resolve(ROOT, keystore.keystorePath)];
    return {
      storeFile: candidates.find((p) => fs.existsSync(p)) ?? candidates[0],
      storePassword: keystore.keystorePassword,
      keyAlias: keystore.keyAlias,
      keyPassword: keystore.keyPassword,
    };
  }
  return {
    storeFile: args['store-file'] && path.resolve(args['store-file']),
    storePassword: args['store-password'],
    keyAlias: args['key-alias'],
    keyPassword: args['key-password'],
  };
}

// .bat/.cmd need a shell on Windows; args here are fixed, so one command string is safe.
function run(command, commandArgs, options = {}) {
  const result = IS_WINDOWS
    ? spawnSync(`${command} ${commandArgs.join(' ')}`, { stdio: 'inherit', shell: true, ...options })
    : spawnSync(command, commandArgs, { stdio: 'inherit', ...options });
  if (result.status !== 0) fail(`${command} ${commandArgs.join(' ')} exited with ${result.status ?? result.signal}`);
}

// EAS writes the profile's channel into the build; a local prebuild has to be told.
function prebuild(channel) {
  console.log(`\n▶ Prebuild (clean, channel "${channel}")`);
  const original = fs.readFileSync(APP_JSON, 'utf8');
  const config = JSON.parse(original);
  config.expo.updates = { ...config.expo.updates, requestHeaders: { 'expo-channel-name': channel } };
  fs.writeFileSync(APP_JSON, JSON.stringify(config, null, 2) + '\n');
  try {
    run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean', '--no-install'], {
      cwd: ROOT,
      env: { ...process.env, CI: '1', NODE_ENV: 'production' },
    });
  } finally {
    fs.writeFileSync(APP_JSON, original);
  }
}

function setLocalGradleProperties() {
  const file = path.join(ANDROID, 'gradle.properties');
  let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const [key, value] of Object.entries(LOCAL_GRADLE_PROPERTIES)) {
    lines = lines.filter((line) => !line.startsWith(`${key}=`));
    lines.push(`${key}=${value}`);
  }
  fs.writeFileSync(file, lines.join('\n') + '\n');
  console.log('\n▶ gradle.properties set for a local build (parallel, 4g heap)');
}

// Passed as ORG_GRADLE_PROJECT_* env vars so passwords stay off the command line and out of cmd escaping.
function bundleRelease(signing) {
  console.log('\n▶ gradlew bundleRelease');
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    'ORG_GRADLE_PROJECT_android.injected.signing.store.file': signing.storeFile,
    'ORG_GRADLE_PROJECT_android.injected.signing.store.password': signing.storePassword,
    'ORG_GRADLE_PROJECT_android.injected.signing.key.alias': signing.keyAlias,
    'ORG_GRADLE_PROJECT_android.injected.signing.key.password': signing.keyPassword,
  };
  const gradlew = IS_WINDOWS ? 'gradlew.bat' : './gradlew';
  // Leftover daemons and their compiler workers keep library jars open, so Windows can't replace them.
  run(gradlew, ['--stop'], { cwd: ANDROID });
  run(gradlew, ['bundleRelease', '--no-daemon'], { cwd: ANDROID, env });
}

function printSigner() {
  const keytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'keytool') : 'keytool';
  const result = spawnSync(keytool, ['-printcert', '-jarfile', AAB], { encoding: 'utf8' });
  const sha1 = result.stdout?.match(/SHA1:\s*([0-9A-F:]+)/)?.[1];
  const owner = result.stdout?.match(/Owner:\s*(.+)/)?.[1];
  if (!sha1) return console.log('  (keytool not found; signer not checked)');
  console.log(`  Signed by: ${owner}\n  SHA-1:     ${sha1}`);
  if (/CN=Android Debug/.test(owner)) fail('AAB is signed with the debug key; Play will reject it.');
  console.log('  Compare the SHA-1 with the upload key certificate in Play Console → Protected with Play → app signing (Play also rejects a wrong key on upload).');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const channel = typeof args.channel === 'string' ? args.channel : 'production';
  const prepareOnly = args['prepare-only'] === true;

  const signing = prepareOnly ? null : readSigning(args);
  if (signing) {
    const missing = Object.entries(signing).filter(([, value]) => !value || value === true).map(([key]) => key);
    if (missing.length) fail(`Missing signing values: ${missing.join(', ')}. Pass --credentials=... or all four --store-file/--store-password/--key-alias/--key-password.`);
    if (!fs.existsSync(signing.storeFile)) fail(`Keystore not found: ${signing.storeFile}`);
  }

  prebuild(channel);
  setLocalGradleProperties();
  if (prepareOnly) return console.log('\n✔ android/ prepared (--prepare-only, no build)');

  bundleRelease(signing);
  const { version } = require(path.join(ROOT, 'package.json'));
  console.log(`\n✔ Built v${version}: ${AAB}`);
  printSigner();
}

main();
