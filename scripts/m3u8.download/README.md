# m3u8 视频资源下载脚本

在 .env 中配置需要下载视频 m3u8 地址，视频拼接转码依赖 ffmpeg，如果你已经在系统全局安装过 ffmpeg 则 FFMPEG_PATH 配置为 'ffmpeg'，如果为安装留空既可。

```bash
FFMPEG_PATH = 'ffmpeg'
M3U8_URL = 'https://tbm-auth.alicdn.com/e99361edd833010b/4wUIHn6p7HSKQMSqN3E/Sw1Nt2Yq6HL4SsaqIEp_248351438042___hd.m3u8?auth_key=1669205423-0-0-c5167d6fbb7160c9b07f32625a0e6c79'
OUTPUT_DIR = 'download'
OUTPUT_FORMAT = 'mp4'
```

使用：

```bash
pnpm i
node index.js
```

## 其他

示例资源：

https://tbm-auth.alicdn.com/e99361edd833010b/4wUIHn6p7HSKQMSqN3E/Sw1Nt2Yq6HL4SsaqIEp_248351438042___hd.m3u8?auth_key=1669205423-0-0-c5167d6fbb7160c9b07f32625a0e6c79

https://r1-ndr.ykt.cbern.com.cn/edu_product/65/video/17b91a70547a11eb96b8fa20200c3759/f864e14147a6768d22757a15779600eb.1280.720.false/f864e14147a6768d22757a15779600eb.1280.720.m3u8
