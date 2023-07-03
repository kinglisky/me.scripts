const path = require('path');
const fs = require('fs-extra');
const xlsx = require('node-xlsx');
const open = require('open');

const projectDaysDict = {
    国学: ['周一'],
    基础体适能: ['周一'],
    篮球: ['周一'],
    网球校队: ['周一', '周三', '周五'],
    足球: ['周一'],
    steam科学实验班: ['周一'],
    管乐团: ['周一'],
    无人机: ['周一'],
    舞蹈校队: ['周一'],
    非洲鼓: ['周二'],
    击剑校队: ['周二'],
    乐探机器人构建: ['周二'],
    情景剧社团: ['周二'],
    趣味体适能: ['周二'],
    软陶: ['周二'],
    闪亮小主播: ['周二'],
    '上乘梅花拳(操场)': ['周二'],
    深度阅读: ['周二'],
    数独: ['周二'],
    围棋: ['周二'],
    尤克里里: ['周二'],
    足球校队: ['周三'],
    硬笔: ['周三'],
    故事绘画: ['周三'],
    乐探图形化编程: ['周三'],
    民乐团: ['周三', '周四'],
    全脑专注力: ['周三'],
    篮球校队: ['周三'],
    围棋校队: ['周三'],
    跆拳道: ['周三'],
    羽毛球: ['周三', '周四'],
    弦乐团: ['周四'],
    演讲与口才: ['周四'],
    创未来人工智能创客: ['周四', '周五'],
    科学探索: ['周四'],
    羽毛球校队: ['周四'],
    网球: ['周四'],
    版画: ['周五'],
    击剑: ['周五'],
    魔术社团: ['周五'],
    速算: ['周五'],
    昆虫小队: ['周五'],
    体适能篮球: ['周五'],
};

const toBase26 = (num) => {
    let result = '';
    while (num > 0) {
        let modulo = (num - 1) % 26;
        result = String.fromCharCode(65 + modulo) + result;
        num = Math.floor((num - modulo) / 26);
    }
    return result;
};

const getWorkdays = (month, startDate) => {
    // 假设 holidays 是一个包含所有假期日期的字符串数组，格式为 'yyyy-mm-dd'， workdays 是包含所有补班日期的字符串数组
    const holidays = [
        '2023-04-05',
        '2023-05-01',
        '2023-05-02',
        '2023-05-03',
        '2023-06-22',
        '2023-06-23',
    ];
    const workdays = [
        { date: '2023-04-23', day: '周二' },
        { date: '2023-05-06', day: '周三' },
        { date: '2023-06-25', day: '周五' },
    ];

    let date = new Date(2023, month, 1, 12);
    let workdayDates = [];

    while (date.getMonth() === month) {
        let weekDay = date.getDay();
        let dateString = date.toISOString().split('T')[0]; // 获取 'yyyy-mm-dd' 格式的日期
        const targetWorkday = workdays.find((it) => it.date === dateString);

        // 如果是周一到周五，且不在假期列表中，或者在补班日期列表中，那么就是工作日
        if (
            (![0, 6].includes(weekDay) &&
                !holidays.includes(dateString) &&
                date.getTime() >= startDate) ||
            targetWorkday
        ) {
            let dayInWeek;
            switch (weekDay) {
                case 1:
                    dayInWeek = '周一';
                    break;
                case 2:
                    dayInWeek = '周二';
                    break;
                case 3:
                    dayInWeek = '周三';
                    break;
                case 4:
                    dayInWeek = '周四';
                    break;
                case 5:
                    dayInWeek = '周五';
                    break;
                case 6:
                    dayInWeek = '周六';
                    break;
                case 0:
                    dayInWeek = '周日';
                    break;
            }
            if (targetWorkday) {
                dayInWeek = targetWorkday.day;
            }

            workdayDates.push({ date: dateString, day: dayInWeek });
        }

        date.setDate(date.getDate() + 1); // 移到下一天
    }

    return workdayDates;
};

const parseSum = async () => {
    const sheets = await xlsx.parse(path.resolve(__dirname, './input/sum_mdf.xls'), {
        raw: false,
        cellStyles: true,
    });
    const rows = sheets[0].data.slice(3);
    const res = [];
    rows.forEach((row) => {
        if (!row[0]) return;
        const normal0 = row.slice(14, 19);
        const normal1 = row.slice(22, 27);

        const special = [];
        [row.slice(30, 36), row.slice(44, 50)].forEach((items) => {
            const name = items.shift();
            const values = items.map((v) => Number(v));
            if (!name || values.every((v) => !v)) return;
            if (!projectDaysDict[name]) {
                throw new Error(`${name} not found!`);
            }

            special.push({
                name,
                data: items.map((v) => Number(v)),
                days: projectDaysDict[name],
            });
        });

        res.push({
            id: Number(row[0]),
            name: row[3],
            normal: normal0.map((n0, index) => {
                return Number(n0) + Number(normal1[index]);
            }),
            special: special,
        });
    });
    await fs.writeJSON('./output/sum.json', res);
    return res;
};

const writeMonthData = async (month, rows) => {
    const days = getWorkdays(month, new Date(2023, 1, 9, 1));
    console.log(days);
    const headerDaysMergers = [];
    const headerDays = days
        .map((it, index) => {
            const d =
                it.date
                    .split('-')
                    .slice(1)
                    .map((v) => v.replace(/^0/g, ''))
                    .join('.') + it.day;
            const startCol = 2 + index * 2;
            const endCol = startCol + 1;
            headerDaysMergers.push({ s: { c: startCol, r: 1 }, e: { c: endCol, r: 1 } });
            return [d, d];
        })
        .flat();

    const headerEnds = [
        '普通晚托\n合计课时',
        '特色晚托\n合计课时',
        '普通晚托\n合计费用',
        '特色晚托\n合计费用',
        '2项\n合计费用',
    ];
    const headerEndsMergers = headerEnds.map((it, index) => {
        const col = 2 + headerDays.length + index;
        return { s: { c: col, r: 1 }, e: { c: col, r: 2 } };
    });

    const headers = ['序号', '日期', ...headerDays, ...headerEnds];
    const projects = [
        '序号',
        '项目',
        ...days
            .map((it) => {
                return ['普通晚托课时', '特色晚托课时'];
            })
            .flat(),
    ];
    const monthIndex = month - 1;
    const startColIndex = 2;
    const startRowIndex = 3;
    const endColIndex = headers.length - headerEnds.length;
    const rowsData = rows.map((row, rowIndex) => {
        let normalProjectSum = row.normal[monthIndex];
        const res = [row.id, row.name];

        let normalIndex = 0;
        while (normalProjectSum) {
            const currentNormalIndex = startColIndex + normalIndex * 2;
            if (!res[currentNormalIndex]) {
                res[currentNormalIndex] = 0;
            }

            if (days[normalIndex].day !== '周三' || res[currentNormalIndex] !== 1) {
                res[currentNormalIndex] += 1;
                normalProjectSum -= 1;
            }

            normalIndex += 1;

            if (normalIndex === days.length) {
                normalIndex = 0;
            }
        }

        if (row.special.length) {
            row.special.forEach((specialItem) => {
                let specialProjectSum = specialItem.data[monthIndex];
                if (!specialProjectSum) return;

                const effectiveDays = days.reduce((arr, dayItem, index) => {
                    if (specialItem.days.includes(dayItem.day)) {
                        arr.push({
                            index,
                            ...dayItem,
                        });
                    }
                    return arr;
                }, []);

                let effectiveIndex = 0;
                while (specialProjectSum) {
                    const currentEffectiveItem = effectiveDays[effectiveIndex];
                    const currentSpecialIndex = startColIndex + currentEffectiveItem.index * 2 + 1;
                    res[currentSpecialIndex] = (res[currentSpecialIndex] || 0) + 2;
                    effectiveIndex += 1;
                    specialProjectSum -= 1;
                    if (effectiveIndex === effectiveDays.length) {
                        effectiveIndex = 0;
                    }
                }
            });
        }

        // 普通晚托合计课时
        // 特色晚托合计课时
        // 普通晚托合计费用
        // 特色晚托合计费用
        // 2项\n合计费用
        let normalSum = 0;
        let specialSum = 0;
        days.forEach((item, index) => {
            const normalColIndex = startColIndex + index * 2;
            const specialColIndex = normalColIndex + 1;
            normalSum += res[normalColIndex] || 0;
            specialSum += res[specialColIndex] || 0;
        });
        res[endColIndex] = normalSum;
        res[endColIndex + 1] = specialSum;
        res[endColIndex + 2] = normalSum * 2;
        res[endColIndex + 3] = specialSum * 12;
        res[endColIndex + 4] = res[endColIndex + 2] + res[endColIndex + 3];

        return res;
    });
    const data = [
        [
            `福州市晋安榕博小学${month + 1}月份学生课后服务课时统计一览表
        （一）年（13）班`,
        ],
        headers,
        projects,
        ...rowsData,
    ];
    const merges = [
        { s: { c: 0, r: 0 }, e: { c: headers.length, r: 0 } },
        { s: { c: 0, r: 1 }, e: { c: 0, r: 2 } },
        ...headerDaysMergers,
        ...headerEndsMergers,
    ];

    const colsWidths = headers.map(() => {
        return { wch: 14 };
    });

    const sheetOptions = { '!merges': merges, '!cols': colsWidths };
    const buffer = xlsx.build([{ name: 'mySheetName', data: data }], { sheetOptions });
    const outputPath = `./output/${month + 1}月课后服务课时统计一览表.xlsx`;
    await fs.writeFile(outputPath, buffer);
    await open(outputPath);
};

const test = async () => {
    const rowAverage = [[{ t: 'n', z: 10, f: '=AVERAGE(2:2)' }], [1, 2, 3]];
    const buffer = xlsx.build([{ name: 'Average Formula', data: rowAverage }]);
    await fs.writeFile('.test.xlsx', buffer);
    await open('.test.xlsx');
};

(async function () {
    const rows = await parseSum();
    await writeMonthData(1, rows);
    await writeMonthData(2, rows);
    await writeMonthData(3, rows);
    await writeMonthData(4, rows);
    await writeMonthData(5, rows);
})();
