// Run by `npm version`: writes the new version of package.json into the VERSION constant of the given file.
import fs from 'node:fs';

const file = process.argv[2];
const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const src = fs.readFileSync(file, 'utf8');
const pattern = /((?:export )?const VERSION = ')[^']*(')/;
if (!pattern.test(src)) throw new Error(`No VERSION constant in ${file}`);
fs.writeFileSync(file, src.replace(pattern, `$1${version}$2`));
