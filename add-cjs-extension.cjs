const fs = require('fs');
const path = require('path');

function main(fileNames) {
    for (const file of fileNames) {
        const filePath = path.join(__dirname, file);
        let contents = fs.readFileSync(filePath, 'utf8');
        if (contents.includes('proxyquire')) {
            contents = contents.replace(/\.js/g, '.cjs');
            fs.writeFileSync(filePath, contents);
        }
    };
}

main(process.argv.slice(2))