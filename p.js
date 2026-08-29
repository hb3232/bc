// ==MiruExtension==
// @name Pornhub666 源
// @version v0.0.1
// @author AI Assistant
// @lang zh-cn
// @package pornhub666.source
// @type bangumi
// @webSite https://cn.pornhub666.com/
// ==/MiruExtension==

export default class extends Extension {
    // 首页最新
    async latest() {
        const res = await this.request({
            url: "/enter",
            method: "GET"
        });
        
        // 推测：首页可能有视频列表，尝试用常见选择器
        const list = res.match(/<a[^>]*href="\/video\/([^"]+)"[^>]*>/g) || [];
        return list.slice(0, 20).map((item, index) => {
            const urlMatch = item.match(/href="([^"]+)"/);
            const titleMatch = item.match(/title="([^"]+)"/) || item.match(/>([^<]+)<\/a>/);
            return {
                title: titleMatch ? titleMatch[1] : `视频 ${index + 1}`,
                url: urlMatch ? urlMatch[1] : "",
                cover: "" // 封面需要额外解析
            };
        }).filter(item => item.url);
    }

    // 搜索
    async search(kw, page, filter) {
        const res = await this.request({
            url: `/search?keyword=${encodeURIComponent(kw)}&page=${page || 1}`,
            method: "GET"
        });
        // 推测搜索结果结构，需根据实际调整
        const items = res.match(/<div[^>]*class="[^"]*video[^"]*"[^>]*>([\s\S]*?)<\/div>/g) || [];
        return items.slice(0, 20).map((item, index) => {
            const urlMatch = item.match(/href="([^"]+)"/);
            const titleMatch = item.match(/title="([^"]+)"/);
            const imgMatch = item.match(/src="([^"]+)"/);
            return {
                title: titleMatch ? titleMatch[1] : `结果 ${index + 1}`,
                url: urlMatch ? urlMatch[1] : "",
                cover: imgMatch ? imgMatch[1] : ""
            };
        }).filter(item => item.url);
    }

    // 详情 - 获取剧集列表
    async detail(url) {
        const fullUrl = url.startsWith("http") ? url : `https://cn.pornhub666.com${url}`;
        const res = await this.request({
            url: fullUrl,
            method: "GET"
        });
        
        // 推测：详情页可能有多个播放源或分集
        const episodes = [];
        // 尝试匹配播放链接
        const playLinks = res.match(/<source[^>]*src="([^"]+)"/g) || 
                          res.match(/file:\s*["']([^"']+)["']/g) ||
                          res.match(/href="([^"]*\.mp4[^"]*)"/g);
        
        if (playLinks) {
            playLinks.forEach((item, index) => {
                const match = item.match(/["']([^"']+)["']/);
                if (match) {
                    episodes.push({
                        title: `播放源 ${index + 1}`,
                        url: match[1]
                    });
                }
            });
        }
        
        // 如果没找到，尝试匹配iframe
        if (episodes.length === 0) {
            const iframes = res.match(/<iframe[^>]*src="([^"]+)"/g) || [];
            iframes.forEach((item, index) => {
                const match = item.match(/src="([^"]+)"/);
                if (match) {
                    episodes.push({
                        title: `播放源 ${index + 1}`,
                        url: match[1]
                    });
                }
            });
        }
        
        return {
            title: "视频详情",
            episodes: episodes.length > 0 ? episodes : [{ title: "默认播放", url: fullUrl }]
        };
    }

    // 获取最终播放地址
    async watch(url) {
        // 如果直接是视频链接，直接返回
        if (url.match(/\.(mp4|m3u8|webm|flv)/i)) {
            return { url: url };
        }
        
        // 否则请求页面提取播放链接
        const res = await this.request({
            url: url.startsWith("http") ? url : `https://cn.pornhub666.com${url}`,
            method: "GET"
        });
        
        // 尝试各种方式提取视频链接
        let videoUrl = "";
        const patterns = [
            /<video[^>]*src="([^"]+)"/,
            /file\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/,
            /url\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/,
            /src\s*=\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/
        ];
        
        for (const pattern of patterns) {
            const match = res.match(pattern);
            if (match) {
                videoUrl = match[1];
                break;
            }
        }
        
        return { url: videoUrl || url };
    }
}
