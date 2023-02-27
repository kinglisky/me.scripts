// Add import of CheerioCrawler
const fs = require('fs');
const path = require('path');
const download = require('download');
const { CheerioCrawler } = require('crawlee');
const HOME_PAGE_URL = 'https://www.zcool.com.cn/u/13389811';

(async function () {
    const allLinks = [];
    const crawler = new CheerioCrawler({
        async requestHandler({ $, request, enqueueLinks }) {
            if (request.url.includes('/work/')) {
                console.log(`${request.url} --> ${$('title').text()}`);
                const links = $('.photoImage')
                    .map((_, el) => $(el).attr('data-src').split('?')[0])
                    .get();
                allLinks.push(...links);
                return;
            }

            await enqueueLinks({
                selector: '.cardImgHover',
            });
        },
    });

    const pageLinks = [];
    for (let index = 1; index <= 8; index++) {
        pageLinks.push(`${HOME_PAGE_URL}?p=${index}`);
    }

    await crawler.run(pageLinks);
    const urls = [...new Set(allLinks)];
    console.log('all urls:', urls);
    await fs.promises.writeFile('./urls.json', JSON.stringify(urls));

    const outputDir = path.resolve(__dirname, 'output');
    await urls.reduce(async (promise, url, index) => {
        await promise;
        console.log('download:', url);
        const filename = url.split('/').pop();
        await download(url, outputDir, { filename });
    }, Promise.resolve());
})();
