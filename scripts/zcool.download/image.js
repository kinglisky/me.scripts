const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const DeltaE = require('delta-e');

const imageName = 'test.jpg';
const imagePath = path.resolve(__dirname, imageName);

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

    const distance = DeltaE.getDeltaE00({ L: cl, A: ca, B: cb }, { L: sl, A: sa, B: sb });
    return distance;
};

const calCropArea = async (imagePath, boundaryColor = { r: 255, g: 255, b: 255 }) => {
    const imageBuffer = await sharp(imagePath).trim().png().toBuffer();
    await sharp(imageBuffer).toFile('trim.png');
    const { data, info } = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true });

    const verticalRanges = [];
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

            if (d > 0.5) {
                break;
            }

            count += 1;
        }

        if (count !== info.width) {
            continue;
        }

        console.log(row);
        verticalPoints.push(row);

        // if (!verticalPoints.length) {
        //     verticalPoints.push(row);
        // } else {
        //     const lastPoint = verticalPoints[verticalPoints.length - 1];
        //     if (lastPoint === row - 1) {
        //         verticalPoints.pop();
        //     }
        //     verticalPoints.push(row);
        // }

        // if (verticalPoints.length === 2) {
        //     verticalRanges.push([...verticalPoints]);
        //     verticalPoints.shift();
        // }
    }

    verticalPoints.push(info.height - 1);

    const xAxisData = Array.from({ length: info.height })
        .fill(0)
        .map((_, index) => index);
    const seriesData = Array.from({ length: info.height }).fill(0);
    verticalPoints.forEach((point) => {
        seriesData[point] = info.width;
    });
    const option = {
        xAxis: {
            type: 'category',
            data: xAxisData,
        },
        yAxis: {
            type: 'value',
        },
        series: [
            {
                data: seriesData,
                type: 'line',
            },
        ],
    };
    console.log(verticalPoints, info);
    await fs.promises.writeFile('verticalPoints.json', JSON.stringify(verticalPoints));
    await fs.promises.writeFile('option.json', JSON.stringify(option));
    // const effectiveRanges = verticalRanges.filter((range) => range[1] - range[0] > 50);
    // await effectiveRanges.reduce(async (promise, range, index) => {
    //     await promise;
    //     const rect = {
    //         left: 0,
    //         top: range[0],
    //         width: info.width,
    //         height: range[1] - range[0],
    //     };

    //     await sharp(imageBuffer)
    //         .extract(rect)
    //         .toFile(`crop-${index}.png`, function (err) {
    //             console.log(err);
    //         });
    // }, Promise.resolve());
    // return effectiveRanges;
};

(async function () {
    const res = await calCropArea(imagePath);
    console.log(res);
})();
