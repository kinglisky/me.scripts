const path = require('path');
const fs = require('fs-extra');
const { parse } = require('csv-parse');
const { promisify } = require('util');
const sizeOf = promisify(require('image-size'));

const PICS_PATH = path.resolve(__dirname, './download');
const OUTPUT_PATH = path.resolve(__dirname, './output');
const CSV_PATH = path.resolve(__dirname, './config/index.csv');

const LIMIT_PIC_SIZE = 60;
const dpi = 150;
const LIMIT_WIDTH = Math.round((26 * dpi) / 25.4);
const LIMIT_HEIGHT = Math.round((32 * dpi) / 25.4);
const RATIO_WH = LIMIT_WIDTH / LIMIT_HEIGHT;

const parseCSV = async () => {
    const data = await new Promise((resolve) => {
        const parser = parse({ delimiter: ',' }, function (err, data) {
            resolve(data);
        });

        fs.createReadStream(CSV_PATH).pipe(parser);
    });
    const headers = data.shift();
    const rows = data.map((items) => {
        return items.reduce((map, value, index) => {
            map[headers[index]] = value;
            return map;
        }, {});
    });
    await fs.writeFile('rows.json', JSON.stringify(rows));
    return rows;
};

const checkPics = async (rows) => {
    const idMap = rows.reduce((map, it) => {
        const code = it['身份证件号'];
        map[code.replaceAll('\t', '')] = it;
        return map;
    }, {});

    await fs.writeFile('map.json', JSON.stringify(idMap));

    await fs.ensureDir(OUTPUT_PATH);
    const pics = await fs.readdir(PICS_PATH);

    const codeError = [];
    const featureError = [];

    await pics.reduce((promise, picName) => {
        const next = async () => {
            const extname = path.extname(picName);
            const fileName = picName.replace(extname, '');
            const target = idMap[fileName];

            if (!target) {
                console.log('fuck', fileName, idMap[fileName]);
                codeError.push(picName);
                return;
            }

            delete idMap[fileName];

            const picLocalPath = path.resolve(PICS_PATH, picName);

            // 图片大小检查
            const imgInfo = fs.statSync(picLocalPath);
            const fileSize = imgInfo.size / 1024;

            const res = { name: target['学生姓名'], path: picLocalPath };

            if (fileSize > LIMIT_PIC_SIZE) {
                res.fileInfo = `${fileSize} kb 大小超出 ${LIMIT_PIC_SIZE}kb 限制`;
            }

            // 图片尺寸检查
            const { width, height } = await sizeOf(picLocalPath);
            const ratioWH = width / height;
            const absRatio = Math.abs(ratioWH - RATIO_WH);
            if (absRatio > 0.01) {
                res.ratioInfo = `${width} x ${height} 图片比例不符合 26:32`;
            }

            // 图片大小
            const dw = width - LIMIT_WIDTH;
            const dh = height - LIMIT_HEIGHT;
            if (dw < 0 || dh < 0) {
                res.sizeInfo = `${width} x ${height} 小于最小宽高 ${LIMIT_WIDTH} x ${LIMIT_HEIGHT}`;
            }

            if (res.fileInfo || res.ratioInfo || res.sizeInfo) {
                featureError.push(res);
            } else {
                // 复制图片到输出目录
                await fs.copyFile(
                    picLocalPath,
                    path.resolve(OUTPUT_PATH, picName.replace(extname, '.jpg'))
                );
            }
        };

        return promise.then(() => next());
    }, Promise.resolve());

    const lose = Object.values(idMap).map((item) => item['学生姓名']);

    const summary = `all ${pics.length} pics, error ${featureError.length}, lose ${lose.length}, codeError ${codeError.length}`;
    const res = { summary, lose, codeError, featureError };
    await fs.writeFile('error.json', JSON.stringify(res));
    console.log('图片检测错误', res);
};

(async function () {
    const rows = await parseCSV();
    await checkPics(rows);
})();
