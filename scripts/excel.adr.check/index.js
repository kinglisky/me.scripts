const path = require('path');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const { Parser } = require('json2csv');

const parseOrigin = async () => {
    const data = await xlsx.parse(path.resolve(__dirname, './download/input_origin.xlsx'), {
        raw: false,
    });
    const sheet = data[0];
    const headers = sheet.data.shift().map((name) => name.replace(/\s?（.*）\s?/g, ''));
    const map = sheet.data.reduce((map, item) => {
        const res = headers.reduce((row, key, index) => {
            row[key] = item[index];
            return row;
        }, {});
        map[res['姓名']] = res;
        return map;
    }, {});
    await fs.writeFile('input_origin_map.json', JSON.stringify(map, null, 4));
    return map;
};

const parseNew = async () => {
    const data = await xlsx.parse(path.resolve(__dirname, './download/input_new.xlsx'), {
        raw: false,
    });
    const sheet = data[0];
    const headers = sheet.data.shift().map((name) => name.replace(/\s?（.*）\s?/g, ''));
    const map = sheet.data.reduce((map, item) => {
        const res = headers.reduce((row, key, index) => {
            row[key] = item[index];
            return row;
        }, {});
        map[res['学生姓名']] = res;
        return map;
    }, {});
    await fs.writeFile('input_origin_new.json', JSON.stringify(map, null, 4));
    return map;
};

// 计算两字符串的最长公共子序列
const longestCommonSubsequence = (s1, s2) => {
    const m = s1.length;
    const n = s2.length;
    const dp = Array.from({ length: m + 1 }, () => Array.from({ length: n + 1 }, () => 0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                dp[i][j] = 1 + dp[i - 1][j - 1];
            } else {
                dp[i][j] = Math.max(dp[i][j - 1], dp[i - 1][j]);
            }
        }
    }

    return dp[m][n];
};

(async function () {
    const originData = await parseOrigin();
    const newData = await parseNew();
    const res = Object.keys(newData)
        .map((name, index) => {
            const originItem = originData[name];
            const newItem = newData[name];
            const rule1 = [/座|栋|楼|(号楼)/g, '#'];
            const rule2 = [/单元$/g, ''];
            const rule3 = [/区|期/g, '区'];
            const full_origin_adr = originItem['家庭住址'];
            const full_new_adr =
                newItem['居住区'].trim().replaceAll('福州市', '') +
                newItem['居住镇/街道'].trim().replace(/路|街道$/, '') +
                newItem['居住社区'].trim() +
                newItem['居住小区/村'];

            let originAdr = full_origin_adr;
            let newAdr = newItem['居住小区/村']
                .replace(...rule1)
                .replace(...rule2)
                .replace(...rule3);

            originAdr = originAdr
                .replaceAll(newItem['居住区'].trim().replaceAll('福州市', ''), '')
                .replaceAll(newItem['居住镇/街道'].trim(), '')
                .replaceAll(newItem['居住社区'].trim(), '')
                .replace(/^[\u4e00-\u9fa5]{2}路\d+号/, '')
                .replace(...rule1)
                .replace(...rule2)
                .replace(...rule3);
            return {
                座号: index,
                姓名: name,
                相似度: longestCommonSubsequence(originAdr, newAdr) / originAdr.length,
                完整原始地址: full_origin_adr,
                完整新地址: full_new_adr,
                原始地址: originAdr,
                新地址: newAdr,
            };
        })
        .sort((a, b) => a['相似度'] - b['相似度']);
    await fs.writeFile('res.json', JSON.stringify(res, null, 4));
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(res);
    await fs.writeFile(`地址相似度.csv`, csv);
})();
