const fs = require('fs');
const path = require('path');

function main(fileNames) {
  for (const file of fileNames) {
    const filePath = path.join(__dirname, file);
    let contents = fs.readFileSync(filePath, 'utf8');
    contents = contents.replace(
      /import \* as gcp from 'gcp-metadata';/,
      "const gcp = require('gcp-metadata');",
    );
    fs.writeFileSync(filePath, contents);
  }
}

main(process.argv.slice(2));
