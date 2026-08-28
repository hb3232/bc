// ==MiruExtension==
// @name         PornHub666
// @version      v0.0.1
// @author       YourName
// @lang         zh-cn
// @license      MIT
// @package      pornhub666
// @type         bangumi
// @icon         https://cn.pornhub666.com/favicon.ico
// @webSite      https://cn.pornhub666.com
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
  // 获取最新/热门视频
  async latest(page) {
    const res = await this.request(`/enter?page=${page || 1}`);
    const itemList = await this.querySelectorAll(res, "div.video-item");
    const results = [];

    for (const element of itemList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "p.title").text;
      const cover = await this.querySelector(html, "img").getAttributeText("data-src") || 
                    await this.querySelector(html, "img").getAttributeText("src");
      
      results.push({
        title: title.trim(),
        url: url.startsWith("http") ? url : `https://cn.pornhub666.com${url}`,
        cover: cover || "",
      });
    }
    return results;
  }

  // 搜索视频
  async search(kw, page) {
    const res = await this.request(`/search?q=${encodeURIComponent(kw)}&page=${page || 1}`);
    const itemList = await this.querySelectorAll(res, "div.video-item");
    const results = [];

    for (const element of itemList) {
      const html = await element.content;
      const url = await this.getAttributeText(html, "a", "href");
      const title = await this.querySelector(html, "p.title").text;
      const cover = await this.querySelector(html, "img").getAttributeText("data-src") || 
                    await this.querySelector(html, "img").getAttributeText("src");
      
      results.push({
        title: title.trim(),
        url: url.startsWith("http") ? url : `https://cn.pornhub666.com${url}`,
        cover: cover || "",
      });
    }
    return results;
  }

  // 获取视频详情和播放列表
  async detail(url) {
    const res = await this.request("", {
      headers: {
        "Miru-Url": url,
      },
    });

    const title = await this.querySelector(res, "h1.video-title").text || 
                  await this.querySelector(res, "title").text;
    const cover = await this.querySelector(res, "video").getAttributeText("poster") ||
                  await this.querySelector(res, "img.cover").getAttributeText("src");
    const desc = await this.querySelector(res, "div.description").text;

    // 获取视频源（可能有多个清晰度）
    const sources = [];
    const videoElement = await this.querySelector(res, "video source");
    if (videoElement) {
      const src = await videoElement.getAttributeText("src");
      const quality = await videoElement.getAttributeText("label") || "高清";
      sources.push({
        name: quality,
        url: src.startsWith("http") ? src : `https://cn.pornhub666.com${src}`,
      });
    }

    // 如果没有 source 标签，尝试获取 data-video 属性
    if (sources.length === 0) {
      const videoData = await this.querySelector(res, "video");
      const videoUrl = await videoData.getAttributeText("data-video") ||
                       await videoData.getAttributeText("src");
      if (videoUrl) {
        sources.push({
          name: "高清",
          url: videoUrl.startsWith("http") ? videoUrl : `https://cn.pornhub666.com${videoUrl}`,
        });
      }
    }

    // 如果有多个服务器/清晰度选项
    const serverList = await this.querySelectorAll(res, "div.server-item");
    for (const element of serverList) {
      const html = await element.content;
      const link = await this.querySelector(html, "a");
      if (link) {
        const serverUrl = await link.getAttributeText("href");
        const serverName = await link.text || "备用线路";
        if (serverUrl && !sources.some(s => s.url === serverUrl)) {
          sources.push({
            name: serverName.trim(),
            url: serverUrl.startsWith("http") ? serverUrl : `https://cn.pornhub666.com${serverUrl}`,
          });
        }
      }
    }

    return {
      title: title.trim() || "未知标题",
      cover: cover || "",
      desc: desc?.trim() || "",
      episodes: [
        {
          title: "播放源",
          urls: sources.length > 0 ? sources : [{ name: "播放", url: "" }],
        },
      ],
    };
  }

  // 获取播放地址
  async watch(url) {
    // 如果直接是视频地址
    if (url.match(/\.(mp4|m3u8|webm)[^\s]*$/i)) {
      return {
        type: url.includes(".m3u8") ? "hls" : "mp4",
        url: url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://cn.pornhub666.com/",
        },
      };
    }

    // 如果是页面地址，解析视频源
    const res = await this.request("", {
      headers: {
        "Miru-Url": url,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // 尝试多种方式获取视频地址
    let videoUrl = "";
    
    // 1. 尝试从 video 标签获取
    const videoSrc = await this.querySelector(res, "video source");
    if (videoSrc) {
      videoUrl = await videoSrc.getAttributeText("src");
    }
    
    // 2. 尝试从 data-video 属性获取
    if (!videoUrl) {
      const video = await this.querySelector(res, "video");
      videoUrl = await video.getAttributeText("data-video") ||
                 await video.getAttributeText("src");
    }
    
    // 3. 尝试从 JavaScript 变量获取
    if (!videoUrl) {
      const scriptMatch = res.match(/var\s+video_url\s*=\s*['"]([^'"]+)['"]/i) ||
                          res.match(/video:\s*['"]([^'"]+)['"]/i) ||
                          res.match(/src:\s*['"]([^'"]+\.(?:mp4|m3u8))['"]/i);
      if (scriptMatch) {
        videoUrl = scriptMatch[1];
      }
    }
    
    // 4. 尝试从 iframe 获取
    if (!videoUrl) {
      const iframeSrc = await this.querySelector(res, "iframe").getAttributeText("src");
      if (iframeSrc) {
        // 递归解析 iframe
        const iframeRes = await this.request("", {
          headers: { "Miru-Url": iframeSrc }
        });
        const iframeMatch = iframeRes.match(/src:\s*['"]([^'"]+\.(?:mp4|m3u8))['"]/i) ||
                           iframeRes.match(/file:\s*['"]([^'"]+\.(?:mp4|m3u8))['"]/i);
        if (iframeMatch) {
          videoUrl = iframeMatch[1];
        }
      }
    }

    if (!videoUrl) {
      throw new Error("无法获取视频地址");
    }

    // 补全 URL
    if (!videoUrl.startsWith("http")) {
      videoUrl = `https://cn.pornhub666.com${videoUrl}`;
    }

    return {
      type: videoUrl.includes(".m3u8") ? "hls" : "mp4",
      url: videoUrl,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://cn.pornhub666.com/",
      },
    };
  }
            }
