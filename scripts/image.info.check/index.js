const fs = require('fs-extra');
const path = require('path');
const { Parser } = require('json2csv');
const { createWorker } = require('tesseract.js');

let recognizeWorker = null;

/**
 * 获取文件夹结构，输出图片路径
 * @param {*} dirPath
 * @returns
 */
async function resolveDirContent(dirPath) {
    const dirs = await fs.readdir(path.resolve(__dirname, dirPath));
    const tasks = dirs.map(async (dirName) => {
        const base = path.resolve(__dirname, dirPath, dirName);
        const contents = await fs.readdir(base);

        return {
            name: dirName,
            images: contents.map((item) => path.resolve(base, item)),
        };
    });
    const data = await Promise.all(tasks);
    return data;
}

async function initRecognize() {
    if (recognizeWorker) return recognizeWorker;

    const worker = createWorker({
        // logger: (m) => console.log(m),
    });
    await worker.load();
    await worker.loadLanguage('eng+chi_sim');
    await worker.initialize('eng+chi_sim');

    recognizeWorker = worker;
    return recognizeWorker;
}

/**
 * 识别图片内容
 */
async function recognizeImage(imagePath) {
    console.log(`recognize image: ${imagePath}`);

    const worker = await initRecognize();
    const {
        data: { text },
    } = await worker.recognize(imagePath);
    let infos = text.split('\n').map((content) => content.replaceAll(' ', ''));
    infos = infos.filter((info) => /姓名|时间/.test(info));
    const ret = { image: imagePath };
    infos.forEach((info) => {
        if (info.includes('姓名')) {
            ret['姓名'] = info.replaceAll('姓名', '');
            return;
        }

        if (info.includes('时间')) {
            const [key, value] = info.split('时间');
            ret[key] = value;
        }
    });
    return ret;
}

async function writeCSV(data, name) {
    const contents = data.reduce((arr, item) => {
        return arr.concat(item.results);
    }, []);
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(contents);
    await fs.writeFile(`${name}.csv`, csv);
    await fs.writeFile(`${name}.json`, JSON.stringify(data));
}

/**
 *
 * @param {*} data
 */
async function resolveImageContent(data) {
    const recognizeData = [];

    const task = data.reduce((promise, item) => {
        const next = async () => {
            const { name, images } = item;
            console.log(`recognize: ${name}`);
            const results = [];
            await images.reduce((recognizePromise, image) => {
                return recognizePromise.then(() => {
                    return recognizeImage(image).then((res) => {
                        res.name = name;
                        results.push(res);
                    });
                });
            }, Promise.resolve());
            recognizeData.push({ name, results });
            await writeCSV(recognizeData, 'res');
        };

        return promise.then(() => next());
    }, Promise.resolve());

    await task;

    return recognizeData;
}

async function checkResult(data) {
    const errors = [];
    data.forEach((item) => {
        const pass = item.results.every((result) => {
            if (result['报告']) {
                return result['报告'].includes('2022-11-16');
            }
            return false;
        });
        if (!pass) {
            errors.push(item);
        }
    });
    console.log('error', errors);
    await writeCSV(errors, 'error');
}

(async function () {
    const data = await resolveDirContent('./download');
    const res = await resolveImageContent(data);
    await checkResult(res);
    await recognizeWorker.terminate();
})();
