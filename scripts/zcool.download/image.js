const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const DeltaE = require('delta-e');

const inputDir = path.resolve(__dirname, './output/black');
const outputDir = `${inputDir}_cutting`;

const COLOR_THRESHOLD = 2;
const BORDER_THRESHOLD = 8;
const WHITE_BOUNDARY_COLOR = { r: 255, g: 255, b: 255 };
const BLOCK_BOUNDARY_COLOR = { r: 0, g: 0, b: 0 };

// rgb转为lab
const rgb2lab = function ({ r, g, b }) {
    r /= 255.0; // rgb range: 0 ~ 1
    g /= 255.0;
    b /= 255.0;
    // gamma 2.2
    if (r > 0.04045) {
        r = Math.pow((r + 0.055) / 1.055, 2.4);
    } else {
        r = r / 12.92;
    }
    if (g > 0.04045) {
        g = Math.pow((g + 0.055) / 1.055, 2.4);
    } else {
        g = g / 12.92;
    }
    if (b > 0.04045) {
        b = Math.pow((b + 0.055) / 1.055, 2.4);
    } else {
        b = b / 12.92;
    }
    // sRGB
    let X = r * 0.436052025 + g * 0.385081593 + b * 0.143087414;
    let Y = r * 0.222491598 + g * 0.71688606 + b * 0.060621486;
    let Z = r * 0.013929122 + g * 0.097097002 + b * 0.71418547;
    // XYZ range: 0~100
    X = X * 100.0;
    Y = Y * 100.0;
    Z = Z * 100.0;
    // Reference White Point
    const ref_X = 96.4221;
    const ref_Y = 100.0;
    const ref_Z = 82.5211;
    X = X / ref_X;
    Y = Y / ref_Y;
    Z = Z / ref_Z;
    // Lab
    if (X > 0.008856) {
        X = Math.pow(X, 1 / 3.0);
    } else {
        X = 7.787 * X + 16 / 116.0;
    }
    if (Y > 0.008856) {
        Y = Math.pow(Y, 1 / 3.0);
    } else {
        Y = 7.787 * Y + 16 / 116.0;
    }
    if (Z > 0.008856) {
        Z = Math.pow(Z, 1 / 3.0);
    } else {
        Z = 7.787 * Z + 16 / 116.0;
    }

    const lab_L = 116.0 * Y - 16.0;
    const lab_A = 500.0 * (X - Y);
    const lab_B = 200.0 * (Y - Z);

    return [lab_L, lab_A, lab_B];
};

// 计算颜色距离
const calDistance = (current, source) => {
    const [cl, ca, cb] = rgb2lab(current);
    const [sl, sa, sb] = rgb2lab(source);

    const distance = DeltaE.getDeltaE00(
        { L: cl, A: ca, B: cb },
        { L: sl, A: sa, B: sb }
    );
    return distance;
};

/**
 * 剔除图片外围空白区域
 * @param {*} imagePath
 * @returns
 */
const trimImage = async (imagePath) => {
    const imageBuffer = await sharp(imagePath).trim().png().toBuffer();
    return imageBuffer;
};

/**
 * 横向切割
 * @param {*} imageBuffer
 * @param {*} boundaryColor
 */
const transversalCutting = async (
    imgBuffer,
    imageName,
    boundaryColor = { r: 255, g: 255, b: 255 }
) => {
    const trimImageBuffer = await sharp(imgBuffer).trim().toBuffer();

    const { data, info } = await sharp(trimImageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

    let horizontalPoints = [0];

    for (let col = 0; col < info.width; col++) {
        let count = 0;

        for (let row = 0; row < info.height; row++) {
            const index = (row * info.width + col) * info.channels;

            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const d = calDistance({ r, g, b }, boundaryColor);

            if (d > COLOR_THRESHOLD) {
                break;
            }

            count += 1;
        }

        if (count !== info.height) {
            continue;
        }

        horizontalPoints.push(col);
    }

    horizontalPoints.push(info.width - 1);

    horizontalPoints = [...new Set(horizontalPoints)];

    const horizontalRanges = [];

    while (horizontalPoints.length) {
        const p1 = horizontalPoints[0];
        const p2 = horizontalPoints[1];

        if (p2 - p1 > 100) {
            horizontalRanges.push([p1, p2]);
        }
        horizontalPoints.shift();
    }

    const tasks = horizontalRanges.map(async (range, index) => {
        const rect = {
            left: range[0],
            top: 0,
            width: range[1] - range[0],
            height: info.height,
        };

        const extractItem = await sharp(trimImageBuffer)
            .extract(rect)
            .toBuffer();

        await sharp(extractItem)
            .trim()
            .resize(1024)
            .toFile(path.resolve(outputDir, `${imageName}-${index}.png`));
    });

    await Promise.all(tasks);
};

/**
 *  纵向切割
 * @param {*} imageBuffer
 * @param {*} boundaryColor
 * @returns
 */
const longitudinalCutting = async (
    imageBuffer,
    fileName,
    boundaryColor = { r: 255, g: 255, b: 255 }
) => {
    const { data, info } = await sharp(imageBuffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const verticalPoints = [0];

    for (let row = 0; row < info.height; row++) {
        let count = 0;
        const rowIndex = row * info.width;
        for (let col = 0; col < info.width; col++) {
            const index = (rowIndex + col) * info.channels;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const d = calDistance({ r, g, b }, boundaryColor);

            if (d > COLOR_THRESHOLD) {
                break;
            }

            count += 1;
        }

        if (count !== info.width) {
            continue;
        }

        verticalPoints.push(row);
    }

    verticalPoints.push(info.height - 1);

    const verticalRanges = [];

    while (verticalPoints.length) {
        const p1 = verticalPoints[0];
        const p2 = verticalPoints[1];

        if (p2 - p1 > BORDER_THRESHOLD) {
            verticalRanges.push([p1, p2]);
        }
        verticalPoints.shift();
    }

    const tasks = verticalRanges.map(async (range, index) => {
        const rect = {
            left: 0,
            top: range[0],
            width: info.width,
            height: range[1] - range[0],
        };

        const verticalItemBuffer = await sharp(imageBuffer)
            .extract(rect)
            .toBuffer();

        await transversalCutting(
            verticalItemBuffer,
            `${fileName}-${index}`,
            boundaryColor
        );
    });

    await Promise.all(tasks);
};

const cuttingImage = async (imagePath, boundaryColor) => {
    const fileName = path.basename(imagePath, path.extname(imagePath));
    const imageBuffer = await trimImage(imagePath);
    await longitudinalCutting(imageBuffer, fileName, boundaryColor);
    console.log(`cutting: ${imagePath}`);
};

(async function () {
    if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir);
    }

    const files = await fs.promises.readdir(inputDir);
    await files.reduce(async (promise, fileName) => {
        await promise;
        await cuttingImage(
            path.resolve(inputDir, fileName),
            BLOCK_BOUNDARY_COLOR
        );
    }, Promise.resolve());
    console.log('done~');
})();
