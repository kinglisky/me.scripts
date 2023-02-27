const sharp = require('sharp');

(async function main() {
    const res = await sharp('san.png').toFormat('svg');
    console.log(res);
})();
