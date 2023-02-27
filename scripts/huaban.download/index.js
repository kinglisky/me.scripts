const download = require('download');
const path = require('path');
const pins = require('./pins.json');

(async function () {
    const urls = pins.map((it) => {
        return {
            url: `https://gd-hbimg.huaban.com/${it.file.key}`,
            type: it.file.type,
            suffix: it.file.type.split('/')[1],
        };
    });
    const outputDir = path.resolve(__dirname, './output');
    await urls.reduce(async (promise, item, index) => {
        await promise;
        console.log('download:', item.url);
        await download(item.url, outputDir, { filename: `${index}.${item.suffix}` });
    }, Promise.resolve());
})();
