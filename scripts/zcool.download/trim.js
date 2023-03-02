const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputDir = path.resolve(__dirname, './output/border');
const outputDir = `${inputDir}_cutting`;

const PADDING = 48;

const trimImage = async (imagePath) => {
    const imageBuffer = await fs.promises.readFile(imagePath);
    const imageName = path.basename(imagePath, path.extname(imagePath));
    const meta = await sharp(imageBuffer).metadata();
    const rect = {
        left: PADDING,
        top: PADDING,
        width: meta.width - PADDING * 2,
        height: meta.height - PADDING * 2,
    };

    await sharp(imageBuffer)
        .extract(rect)
        .toFile(path.resolve(outputDir, `${imageName}.png`));
    console.log('trim image', imagePath);
};

(async function () {
    const files = await fs.promises.readdir(inputDir);

    if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir);
    }

    await files.reduce(async (promise, fileName) => {
        await promise;
        await trimImage(path.resolve(inputDir, fileName));
    }, Promise.resolve());

    console.log('done~');
})();
