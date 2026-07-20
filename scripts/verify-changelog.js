const fs = require('fs');
const md = fs.readFileSync('CHANGELOG.md', 'utf8').replace(/\n\[.+?\]: https:\/\/github\.com\/[\s\S]*$/, '\n');
let CHANGELOG_MARKDOWN;
const tsSrc = fs.readFileSync('src/constants/changelog.ts', 'utf8').replace('export const CHANGELOG_MARKDOWN', 'CHANGELOG_MARKDOWN');
eval(tsSrc);
// Template literals normalize \r\n -> \n in their cooked value per the ECMAScript spec,
// so compare on that same basis rather than expecting byte-identical CRLF preservation.
const expected = ('\n' + md).replace(/\r\n/g, '\n');
const rendered = CHANGELOG_MARKDOWN.replace(/\r\n/g, '\n');
if (rendered === expected) {
    console.log('MATCH');
} else {
    console.log('MISMATCH');
    console.log('expected length', expected.length, 'rendered length', rendered.length);
    for (let i = 0; i < Math.max(expected.length, rendered.length); i++) {
        if (expected[i] !== rendered[i]) {
            console.log('first diff at', i);
            console.log('expected:', JSON.stringify(expected.slice(Math.max(0, i - 30), i + 30)));
            console.log('rendered:', JSON.stringify(rendered.slice(Math.max(0, i - 30), i + 30)));
            break;
        }
    }
    process.exit(1);
}
