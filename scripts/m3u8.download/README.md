# zxx.edu.cn 视频资源下载脚本

在 .env 中配置需要下载视频 m3u8 地址

```bash
M3U8_URL = 'https://r1-ndr.ykt.cbern.com.cn/edu_product/65/video/17b91a70547a11eb96b8fa20200c3759/f864e14147a6768d22757a15779600eb.1280.720.false/f864e14147a6768d22757a15779600eb.1280.720.m3u8'
OUTPUT_DIR = 'download'
OUTPUT_FORMAT = 'mp4'
```

然后：

```bash
pnpm i
node index.js
```

！！！注意视频拼接转码依赖 ffmpeg，需要本地先安装 ffmpeg
