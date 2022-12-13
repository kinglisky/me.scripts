const path = require('path');
const yaml = require('yaml');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const merge = require('lodash/merge');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const parseYamlConfig = async (yamlFilePath = './config.yaml') => {
    const file = await fs.readFile(yamlFilePath, 'utf-8');
    const data = yaml.parse(file);
    return data;
};

const parseXLSX = async (filePath, primaryKey) => {
    filePath = path.resolve(__dirname, filePath);
    const data = await xlsx.parse(filePath, { raw: false });
    const sheet = data[0];
    const headers = sheet.data.shift().map((name) => name.replace(/（|）/g, ''));
    return sheet.data.reduce((map, item) => {
        const res = headers.reduce((row, key, index) => {
            row[key] = item[index];
            return row;
        }, {});
        map[res[primaryKey]] = res;
        return map;
    }, {});
};

const parseXLSXList = async (config) => {
    const { xlsxList } = config;
    const record = {};
    const tasks = xlsxList.map(async ({ filePath, primaryKey }) => {
        const mix = await parseXLSX(filePath, primaryKey);
        merge(record, mix);
    });

    await Promise.all(tasks);

    const rows = Object.values(record).sort((a, b) => a['座号'] - b['座号']);

    await fs.ensureDir(path.resolve(__dirname, config.output));
    await fs.writeFile(
        path.resolve(__dirname, config.output, 'rows.json'),
        JSON.stringify(rows, null, 4)
    );

    return rows;
};

const genDocx = async (rows, config) => {
    const pageSize = 6;
    const pageLength = Math.ceil(rows.length / pageSize);
    const pages = [];
    let currentIndex = 0;
    for (let i = 0; i < pageLength; i++) {
        const items = [];
        for (let j = 0; j < pageSize; j++) {
            const row = rows[currentIndex] || {};
            const data = Object.entries(config.schema).reduce((res, [tag, prop]) => {
                res[tag] = (row[prop] || '').trim().replace(/\s/g, '');
                return res;
            }, {});
            data.ADR = data.ADR.replace(/(福建省福州市晋安区)+/g, '福建省福州市晋安区');
            items.push(data);
            currentIndex += 1;
        }
        pages.push({ items });
    }
    const docxFileBuf = await fs.readFile(path.resolve(__dirname, config.docx));
    const docxFileZip = new PizZip(docxFileBuf);
    const doc = new Docxtemplater(docxFileZip, {
        paragraphLoop: true,
        linebreaks: true,
    });
    doc.render({ pages });
    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });
    const outputBaseDir = path.resolve(__dirname, config.output);
    const outputPath = path.resolve(outputBaseDir, 'output.docx');
    await fs.ensureDir(outputBaseDir);
    await fs.writeFile(outputPath, buf);
};

(async function () {
    const config = await parseYamlConfig();
    const rows = await parseXLSXList(config);
    await genDocx(rows, config);
})();
