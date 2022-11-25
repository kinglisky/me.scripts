const path = require('path');
const yaml = require('yaml');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const merge = require('lodash/merge');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module');

const parseYamlConfig = async (yamlFilePath = './config.yaml') => {
    const file = await fs.readFile(yamlFilePath, 'utf-8');
    const data = yaml.parse(file);
    return data;
};

const parseXLSX = async (filePath, primaryKey) => {
    filePath = path.resolve(__dirname, filePath);
    const data = await xlsx.parse(filePath, { raw: false });
    const sheet = data[0];
    const headers = sheet.data
        .shift()
        .map((name) => name.replace(/\s?（.*）\s?/g, ''));

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

    const rows = Object.values(record)
        .map((item) => {
            return Object.assign(item, {
                教师姓名: 'xxx',
                任教学科: '语文',
                任教班级: '一年级 xx 班',
            });
        })
        .sort((a, b) => a['座号'] - b['座号']);
    await fs.writeFile(
        path.resolve(__dirname, config.output, 'rows.json'),
        JSON.stringify(rows, null, 4)
    );

    return rows;
};

const generateDocx = async (config, zip, row) => {
    const imageOpts = {
        centered: false,
        getImage: function (tagValue, tagName) {
            console.log('getImage', { tagValue, tagName });
            return fs.readFileSync(path.resolve(__dirname, tagValue));
        },
        getSize: function (img, tagValue, tagName) {
            console.log('getSize', { img, tagValue, tagName });
            return [150, 150];
        },
    };

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(imageOpts)],
    });

    const data = Object.entries(config.schema).reduce((res, [tag, prop]) => {
        res[tag] = row[prop] || '';
        return res;
    }, {});
    // data['PIC'] = 'test.png';
    doc.render(data);

    const buf = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
    });

    const outputBaseDir = path.resolve(__dirname, config.output);
    const outputPath = path.resolve(
        outputBaseDir,
        `${row['座号']}-${row['学生姓名']}.docx`
    );
    await fs.ensureDir(outputBaseDir);
    await fs.writeFile(outputPath, buf);
    console.log(`gen ${outputPath} ~`);
};

const generateDocxFiles = async (config, rows) => {
    const docxFileBuf = await fs.readFile(path.resolve(__dirname, config.docx));
    const docxFileZip = new PizZip(docxFileBuf);
    const tasks = rows.map((row) => {
        return generateDocx(config, docxFileZip, row);
    });
    await Promise.all(tasks);
};

(async function () {
    const config = await parseYamlConfig();
    const rows = await parseXLSXList(config);
    await generateDocxFiles(config, rows);
})();
