const fs = require('fs');
const path = require('path');

function main(fileNames) {
    for (const file of fileNames) {
        const filePath = path.join(__dirname, file);
        console.log(filePath)
        let contents = fs.readFileSync(filePath, 'utf8');
        // console.log(contents)
        console.log(contents.includes('proxyquire'))
        if (contents.includes('proxyquire')) {
            contents = contents.replaceAll(/\.js/g, '.cjs');
            // console.log(contents)
            console.log(filePath)
            fs.writeFileSync(filePath, contents);
        }
    };
}

main(process.argv.slice(2))