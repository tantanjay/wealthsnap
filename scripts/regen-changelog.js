const fs = require('fs');
let md = fs.readFileSync('CHANGELOG.md', 'utf8');
md = md.replace(/\n\[.+?\]: https:\/\/github\.com\/[\s\S]*$/, '\n'); // drop link-reference footer
const escaped = md.split('\\').join('\\\\').split('`').join('\\`').split('${').join('\\${');
fs.writeFileSync('src/constants/changelog.ts', 'export const CHANGELOG_MARKDOWN = `\n' + escaped + '`\n');
console.log('done');
