// 在 renderMemberModal 中处理灵动岛
var islandType = member.liveType || member.islandType || '';
var islandContent = member.liveContent || member.islandContent || '';
if (islandType && islandContent) {
    var islandHtml = '';
    if (islandType === '音乐') {
        islandHtml = '<div class="card island-card fade-up">' +
            '<div class="island-title">灵动岛 · 音乐</div>' +
            '<audio controls src="' + islandContent + '"></audio></div>';
    } else if (islandType === '图片') {
        islandHtml = '<div class="card island-card fade-up">' +
            '<div class="island-title">灵动岛 · 图片</div>' +
            '<img src="' + islandContent + '" alt="灵动岛图片" loading="lazy"></div>';
    } else if (islandType === '视频') {
        // 判断是否为B站等iframe嵌入链接（若包含player或iframe等关键词，直接嵌入）
        var iframeSrc = islandContent;
        // 如果是纯视频文件URL，用video标签
        if (islandContent.match(/\.(mp4|webm|ogg)$/i)) {
            islandHtml = '<div class="card island-card fade-up">' +
                '<div class="island-title">灵动岛 · 视频</div>' +
                '<video controls src="' + islandContent + '" style="width:100%;border-radius:8px;"></video></div>';
        } else {
            // 否则作为iframe嵌入
            islandHtml = '<div class="card island-card fade-up">' +
                '<div class="island-title">灵动岛 · 视频</div>' +
                '<div class="video-wrapper"><iframe src="' + islandContent + '" allowfullscreen></iframe></div></div>';
        }
    } else { // 留言（默认）
        islandHtml = '<div class="card island-card fade-up">' +
            '<div class="island-title">灵动岛 · 留言</div>' +
            '<div style="font-size:14px;color:#1a2a3a;line-height:1.6;">' + islandContent + '</div></div>';
    }
    rightHtml.push(islandHtml);
}
