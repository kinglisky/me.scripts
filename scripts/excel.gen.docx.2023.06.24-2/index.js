const path = require('path');
const yaml = require('yaml');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const merge = require('lodash/merge');

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
    const headers = sheet.data.shift().map((name) => name.replace(/（|）/g, ''));
    return sheet.data.reduce((map, item) => {
        const res = headers.reduce((row, key, index) => {
            row[key] = String(item[index]).replace('\t', '');
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

const genExcel = async (rows, config) => {
    const props = Object.entries(config.schema);
    const header = Object.keys(config.schema).map((key) => {
        return key.replace(/_\d$/, '');
    });
    const handles = {
        籍贯: (val) => {
            return val;
        },
        居住区: (val) => {
            return val.includes('晋安') ? '晋安区' : val;
        },
        居住社区: (val) => {
            const res = val.split('社区');
            if (res.length >= 2) {
                return res[0].slice(-2) + '社区';
            }
            return val;
        },
        '居住镇/街道': (val) => {
            let res = val.split('镇');
            if (res.length >= 2) {
                return res[0].slice(-2) + '镇';
            }

            res = val.split('街道');
            if (res.length >= 2) {
                return res[0].slice(-2) + '街道';
            }
            if (val.includes('后浦路') || val.includes('保利香槟')) {
                return '岳峰镇';
            }
            return val;
        },
    };

    const data = rows.map((row) => {
        if (row['成员1关系'] === '母亲') {
            const temp = [row['成员1姓名'], row['成员1关系'], row['成员1联系电话']];
            row['成员1姓名'] = row['成员2姓名'];
            row['成员1关系'] = row['成员2关系'];
            row['成员1联系电话'] = row['成员2联系电话'];
            row['成员2姓名'] = temp[0];
            row['成员2关系'] = temp[1];
            row['成员2联系电话'] = temp[2];
        }

        return props.map(([key, prop]) => {
            const val = row[prop] || '';
            const handle = handles[key];
            return handle ? handle(val) : val;
        });
    });
    data.unshift(header);
    const buf = xlsx.build([{ name: '家校通讯录', data }]);
    const outputPath = path.resolve(__dirname, config.output, '家校通讯录.xlsx');
    await fs.writeFile(outputPath, buf);
    await open(outputPath);
};

(async function () {
    const config = await parseYamlConfig();
    const rows = await parseXLSXList(config);
    await genExcel(rows, config);
})();
