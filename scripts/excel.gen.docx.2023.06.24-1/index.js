const path = require('path');
const yaml = require('yaml');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const open = require('open');

const parseYamlConfig = async (yamlFilePath = './config.yaml') => {
    const file = await fs.readFile(yamlFilePath, 'utf-8');
    const data = yaml.parse(file);
    return data;
};

const parseXLSX = async (filePath, primaryKey) => {
    filePath = path.resolve(__dirname, filePath);
    const data = await xlsx.parse(filePath, { raw: false });
    const sheet = data[0];
    sheet.data.shift();
    return sheet.data.map((rows) => ({
        ID: rows[0],
        NAME: rows[1],
        DESC: rows[2],
    }));
};

const genDocx = async (rows, config) => {
    const pageSize = 4;
    const pageLength = Math.ceil(rows.length / pageSize);
    const pages = [];
    let currentIndex = 0;
    for (let i = 0; i < pageLength; i++) {
        const items = [];
        let item = {};
        for (let j = 0; j < pageSize; j++) {
            const row = rows[currentIndex];
            if (row) {
                const groupKey = j % 2 === 0 ? 'A' : 'B';
                Object.entries(row).forEach(([k, v]) => {
                    item[`${groupKey}_${k}`] = v;
                });
                currentIndex += 1;
                if (groupKey === 'B') {
                    items.push(item);
                    item = {};
                }
            }
        }
        console.log(items);
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
    const outputPath = path.resolve(outputBaseDir, '学生期末评语.docx');
    await fs.ensureDir(outputBaseDir);
    await fs.writeFile(outputPath, buf);
    await open(outputPath);
};

(async function () {
    const config = await parseYamlConfig();
    console.log(config);
    const rows = await parseXLSX(config.input);
    console.log(rows);
    await genDocx(rows, config);
})();
