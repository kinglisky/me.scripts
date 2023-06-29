const path = require('path');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');

const parseInput0 = async () => {
    const sheets = await xlsx.parse(path.resolve(__dirname, './download/input0.xlsx'), {
        raw: false,
    });
    const rows = sheets[0].data;
    const header = rows.shift();
    header.shift();
    const res = rows.reduce((dict, items) => {
        const key = items.shift().trim().replace(/\d班$/g, '').replace('兴趣班', '');
        dict[key] = items.map((item) => Number(item));
        return dict;
    }, {});
    await fs.writeJSON(path.resolve(__dirname, './download/input0.json'), res);
    return res;
};

const parseRes = async () => {
    const sheets = await xlsx.parse(path.resolve(__dirname, './download/res.xlsx'), {
        raw: false,
    });
    const rows = sheets[0].data;
    rows.shift();
    const data = [];
    rows.forEach((items) => {
        if (items[3]) {
            data.push({
                name: items[3],
                data: [items.slice(4, 13), items.slice(13)].filter((d) => !!d[0]),
            });
        }
    });
    await fs.writeJSON(path.resolve(__dirname, './download/res.json'), data);
    return data;
};

(async function () {
    const input0 = await parseInput0();
    const input1 = require('./download/input1.json');
    const errors = new Set();
    Object.values(input1).forEach((items) => {
        items.forEach((key) => {
            if (!input0[key]) {
                errors.add(key);
            }
        });
    });
    const res = await parseRes();
    res.forEach((item) => {
        item.data.forEach((d) => {
            if (!input0[d[0]]) {
                errors.add(d[0]);
            }
        });
    });

    console.log('errors', errors);
    const checkResults = [];
    res.forEach(({ name, data }) => {
        const projects1 = (input1[name] || []).sort();
        const projects2 = data.map((d) => d[0]).sort();

        const errors = [];
        const projectAmountIsSame =
            projects1.length === projects2.length &&
            projects1.every((it, i) => {
                return it === projects1[i];
            });

        if (!projectAmountIsSame) {
            errors.push({
                错误原因: '项目不匹配',
                正确项目: projects1,
                当前项目: projects2,
                处理方法: '补齐项目',
            });
        }

        const projectDaysIsSame = data.every((d) => {
            const projectName = d[0];
            const standardDays = input0[projectName].slice(0, 5);
            const currentDays = d.slice(2, 7).map((v) => Number(v));
            console.log({ standardDays, currentDays });

            // 只匹配天数总和
            return standardDays[4] === currentDays[4];

            // 严格匹配每天
            // return currentDays.every((day, index) => {
            //     return day === standardDays[index];
            // });
        });

        if (!projectDaysIsSame) {
            errors.push({
                错误原因: '项目天数不匹配',
                正确项目: data.map((d) => {
                    return [d[0], ...input0[d[0]]];
                }),
                当前项目: data.map((d) => {
                    return [d[0], ...d.slice(2, 7).map((v) => Number(v))];
                }),
                处理方法: '对齐天数',
            });
        }

        if (errors.length) {
            checkResults.push({
                name,
                errors,
            });
        }
    });
    console.log('checkResults:', checkResults);
    await fs.writeJSON('./output/checkResults.json', checkResults);
})();
