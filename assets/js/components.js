/**
 * 成员档案弹窗 — 最终重制版（修正字段映射+段位颜色）
 * 依赖：window._memberData, window._mapData, window._blogData
 * 调用：window.openMemberModal(name)
 */

(function() {

    // ----- 工具函数 -----
    function getSiteRoot() {
        var path = window.location.pathname;
        if (path.indexOf('/acns/') === 0) return '/acns/';
        var idx = path.indexOf('/acns/');
        if (idx !== -1) return path.substring(0, idx + 6);
        return '/';
    }

    // 编号解析映射
    var ATTR_MAP = { '1': '正式成员', '2': '外部成员', '3': '特招成员' };
    var GAME_MAP = { '1': '迷你世界', '2': 'Minecraft', '3': '迷你世界 + Minecraft' };
    var GROUP_MAP = { '1': '建筑组', '2': '玩法组', '3': '模型组', '4': '编辑组', '0': '无' };

    // 段位颜色（1~5 从蓝到金）
    var RANK_COLORS = ['#5f7fff', '#4facfe', '#a855f7', '#f59e0b', '#fbbf24']; // 蓝→紫→橙→金
    var DEFAULT_COLOR = '#5f7fff';

    function parseIdNumber(id) {
        if (!id || id === '未知' || id.length < 10) return null;
        var s = id.trim();
        if (s.length < 10) return null;
        var attr = s.charAt(0), game = s.charAt(1),
            year = s.substring(2,4), month = s.substring(4,6), day = s.substring(6,8),
            group1 = s.charAt(8), group2 = s.charAt(9),
            dup = s.length > 10 ? s.charAt(10) : '';
        var attrName = ATTR_MAP[attr] || '未知属性';
        var gameName = GAME_MAP[game] || '未知平台';
        var group1Name = GROUP_MAP[group1] || '未知';
        var group2Name = GROUP_MAP[group2] || '无';
        var groupDisplay = group2 === '0' ? group1Name : group1Name + ' + ' + group2Name;
        var dateStr = '20' + year + '-' + month + '-' + day;
        var y = parseInt('20'+year), m = parseInt(month), d = parseInt(day);
        var validDate = (y>=2020 && y<=2100 && m>=1 && m<=12 && d>=1 && d<=31);
        if (!validDate) dateStr = '日期无效';
        return { raw: id, attrName, gameName, date: dateStr, groupDisplay, dup: dup || '无' };
    }

    function renderIdCard(id, delay) {
        var info = parseIdNumber(id);
        if (!info) {
            return '<div class="card id-card fade-up" style="animation-delay:'+delay+'s"><span class="muted">编号格式无效</span></div>';
        }
        var html = '<div class="card id-card fade-up" style="animation-delay:'+delay+'s">';
        html += '<div class="id-label">编号解析</div>';
        html += '<div class="id-parts">';
        html += '<span><span class="id-key">属性</span> ' + info.attrName + ' (' + id.charAt(0) + ')</span>';
        html += '<span><span class="id-key">平台</span> ' + info.gameName + ' (' + id.charAt(1) + ')</span>';
        html += '<span><span class="id-key">入室</span> ' + info.date + '</span>';
        html += '<span><span class="id-key">组别</span> ' + info.groupDisplay + '</span>';
        if (info.dup && info.dup !== '无') html += '<span><span class="id-key">副本</span> ' + info.dup + '</span>';
        html += '</div>';
        html += '<div class="id-raw">' + info.raw + '</div>';
        html += '</div>';
        return html;
    }

    function getDaysSince(joinDate) {
        if (!joinDate || joinDate === '未知' || joinDate === '') return null;
        var parts = joinDate.split('-');
        if (parts.length !== 3) return null;
        var y = parseInt(parts[0]), m = parseInt(parts[1])-1, d = parseInt(parts[2]);
        if (isNaN(y)||isNaN(m)||isNaN(d)) return null;
        var start = new Date(y,m,d);
        var now = new Date();
        var diff = now - start;
        return Math.floor(diff / (1000*60*60*24));
    }

    /**
     * 解析荣誉项，提取段位数字和名称，返回 { rank, name, color }
     * 支持格式：[1] 荣誉名称 或 [1]荣誉名称
     */
    function parseHonorItem(text) {
        var trimmed = text.trim();
        var match = trimmed.match(/^\[(\d+)\]\s*(.*)/);
        if (match) {
            var rank = parseInt(match[1]);
            var name = match[2].trim() || trimmed;
            // 段位 1~5 对应颜色，超出使用默认
            var color = (rank >= 1 && rank <= 5) ? RANK_COLORS[rank-1] : DEFAULT_COLOR;
            return { rank: rank, name: name, color: color };
        } else {
            // 无段位，直接显示，颜色默认
            return { rank: null, name: trimmed, color: DEFAULT_COLOR };
        }
    }

    // ----- 主渲染函数 -----
    function renderMemberModal(member) {
        // 归一化：将字符串转为数组（兼容旧数据）
        if (member.groups && typeof member.groups === 'string') {
            member.groups = member.groups.split(/[,，]\s*/).filter(Boolean);
        }

        // 荣誉字段：优先使用 workHonors/gameHonors，否则尝试 honors_work/honors_game
        var workHonors = member.workHonors || member.honors_work || '';
        var gameHonors = member.gameHonors || member.honors_game || '';
        if (typeof workHonors === 'string') {
            workHonors = workHonors.split(/[,，]\s*/).filter(Boolean);
        }
        if (typeof gameHonors === 'string') {
            gameHonors = gameHonors.split(/[,，]\s*/).filter(Boolean);
        }

        var modalContent = document.getElementById('modalContent');
        var modalInner = document.getElementById('modalInner');
        if (!modalContent || !modalInner) return;

        // 背景
        var bgUrl = (member.background && member.background.trim().startsWith('http')) 
            ? member.background.trim() 
            : 'https://user-assets.sxlcdn.com/images/1138507/FmpO0QT0oZTcs8whHzHAjM_5Jss2.png?imageMogr2/strip/auto-orient/thumbnail/1200x9000%3E/quality/90!/format/png';
        modalContent.style.backgroundImage = 'url(' + bgUrl + '), linear-gradient(135deg, #e8edf5, #d5dff0)';
        modalContent.style.backgroundSize = 'cover, cover';
        modalContent.style.backgroundBlendMode = 'overlay, normal';
        modalContent.classList.add('has-bg');

        var leftHtml = [];
        var rightHtml = [];
        var delay = 0.05;

        // ----- 左列：个人信息 -----
        var avatarHtml = (member.avatar && member.avatar.trim().startsWith('http')) ?
            '<img src="' + member.avatar.trim() + '" alt="' + member.name + '" loading="lazy" onerror="this.style.display=\'none\'">' :
            member.name.charAt(0);
        var groupsHtml = member.groups && member.groups.length ?
            member.groups.map(function(g) { return '<span class="group-tag">' + g + '</span>'; }).join('') : '';
        var attrBadge = '';
        if (member.id && member.id.length >= 1) {
            var first = member.id.charAt(0);
            var attrName = '', cls = '';
            if (first === '1') { attrName = '正式成员'; cls = 'green'; }
            else if (first === '2') { attrName = '外部成员'; cls = 'blue'; }
            else if (first === '3') { attrName = '特招成员'; cls = 'purple'; }
            if (attrName) attrBadge = '<span class="attr-badge ' + cls + '">' + attrName + '</span>';
        }

        leftHtml.push('<div class="profile-card fade-up" style="animation-delay:'+delay+'s">');
        leftHtml.push('<div class="avatar">' + avatarHtml + '</div>');
        leftHtml.push('<div class="name">' + member.name + ' ' + attrBadge + '</div>');
        if (member.role) leftHtml.push('<div class="role">' + member.role + '</div>');
        if (groupsHtml) leftHtml.push('<div class="groups">' + groupsHtml + '</div>');
        leftHtml.push('<div class="meta"><span>编号 ' + member.id + '</span><span>迷你号 ' + member.minid + '</span></div>');
        leftHtml.push('</div>');
        delay += 0.06;

        // 编号解析卡
        if (member.id && member.id !== '未知' && member.id.length >= 10) {
            leftHtml.push(renderIdCard(member.id, delay));
        } else {
            leftHtml.push('<div class="card id-card fade-up" style="animation-delay:'+delay+'s"><span class="muted">编号 ' + member.id + '</span></div>');
        }
        delay += 0.06;

        // 简介
        if (member.bio && member.bio.trim()) {
            leftHtml.push('<div class="card bio-card fade-up" style="animation-delay:'+delay+'s">' + member.bio + '</div>');
        } else {
            leftHtml.push('<div class="card bio-card fade-up" style="animation-delay:'+delay+'s"><span class="muted">暂无简介</span></div>');
        }
        delay += 0.06;

        // 入室天数
        var days = getDaysSince(member.joinDate);
        if (days !== null && days >= 0) {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>加入工作室</span><span class="num">' + days + '</span><span>天</span></div>');
        } else if (member.joinDate && member.joinDate !== '未知' && member.joinDate !== '') {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>入室时间</span><span>' + member.joinDate + '</span></div>');
        } else {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>入室时间</span><span class="muted">未录入</span></div>');
        }
        delay += 0.06;

        // ----- 右列：荣誉 + 作品 -----
        var rDelay = 0.06;

        // 1. 工作室荣誉（始终显示）
        rightHtml.push('<div class="honor-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">工作室荣誉</div>');
        if (workHonors && workHonors.length) {
            // 按段位排序（升序）
            var parsedWork = workHonors.map(function(h) { return parseHonorItem(h); });
            parsedWork.sort(function(a, b) { return (a.rank || 99) - (b.rank || 99); });
            var workItems = parsedWork.map(function(p) {
                return '<span class="honor-tag" style="background:' + p.color + ';">' + p.name + '</span>';
            }).join('');
            rightHtml.push('<div class="honor-list">' + workItems + '</div>');
        } else {
            rightHtml.push('<div class="honor-empty">暂无荣誉</div>');
        }
        rightHtml.push('</div>');
        rDelay += 0.06;

        // 2. 游戏荣誉（始终显示）
        rightHtml.push('<div class="honor-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">游戏荣誉</div>');
        if (gameHonors && gameHonors.length) {
            var parsedGame = gameHonors.map(function(h) { return parseHonorItem(h); });
            parsedGame.sort(function(a, b) { return (a.rank || 99) - (b.rank || 99); });
            var gameItems = parsedGame.map(function(p) {
                return '<span class="honor-tag" style="background:' + p.color + ';">' + p.name + '</span>';
            }).join('');
            rightHtml.push('<div class="honor-list">' + gameItems + '</div>');
        } else {
            rightHtml.push('<div class="honor-empty">暂无荣誉</div>');
        }
        rightHtml.push('</div>');
        rDelay += 0.06;

        // 3. 作品数据准备
        var allMaps = window._mapData || [];
        var allBlogs = window._blogData || [];
        var memberMaps = allMaps.filter(function(m) { return m.author === member.name || m.author.includes(member.name); });
        var memberBlogs = allBlogs.filter(function(b) { return b.author === member.name || b.author.includes(member.name); });

        var pinnedMapObj = null, pinnedBlogObj = null;
        if (member.pinnedMap && member.pinnedMap.trim()) {
            var mapId = parseInt(member.pinnedMap.trim());
            if (!isNaN(mapId)) pinnedMapObj = allMaps.find(function(m) { return m.id === mapId; });
        }
        if (member.pinnedBlog && member.pinnedBlog.trim()) {
            var blogId = parseInt(member.pinnedBlog.trim());
            if (!isNaN(blogId)) pinnedBlogObj = allBlogs.find(function(b) { return b.id === blogId; });
        }

        var siteRoot = getSiteRoot();

        function renderWorkCard(item, type) {
            var isMap = (type === 'map');
            var coverHtml = (item.cover && item.cover.trim().startsWith('http')) ?
                '<img class="work-cover" src="' + item.cover.trim() + '" alt="' + item.title + '" loading="lazy" onerror="this.style.display=\'none\'">' :
                '<div class="work-cover placeholder"></div>';
            var link = siteRoot + (isMap ? 'map/?id=' : 'blog/post.html?id=') + item.id;
            var meta = isMap ? (item.tag ? item.tag + '  ' + item.date : item.date) : item.category + '  ' + item.date;
            return '<div class="work-card" onclick="location.href=\'' + link + '\'">' +
                coverHtml +
                '<div class="work-title">' + item.title + (item.pinned ? ' <span class="pinned">置顶</span>' : '') + '</div>' +
                '<div class="work-meta">' + meta + '</div></div>';
        }

        // 4. 置顶作品（如果有）
        var pinnedHtml = '';
        if (pinnedMapObj) { pinnedMapObj.pinned = true; pinnedHtml += renderWorkCard(pinnedMapObj, 'map'); }
        if (pinnedBlogObj) { pinnedBlogObj.pinned = true; pinnedHtml += renderWorkCard(pinnedBlogObj, 'blog'); }
        if (pinnedHtml) {
            rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
            rightHtml.push('<div class="section-title">置顶作品</div>');
            rightHtml.push('<div class="work-grid">' + pinnedHtml + '</div>');
            rightHtml.push('</div>');
            rDelay += 0.06;
        }

        // 5. 发布的地图（始终显示）
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的地图 <span class="count">(' + memberMaps.length + ')</span></div>');
        var otherMaps = memberMaps.filter(function(m) { return !pinnedMapObj || m.id !== pinnedMapObj.id; });
        if (otherMaps.length) {
            var mapsHtml = otherMaps.map(function(m) { return renderWorkCard(m, 'map'); }).join('');
            rightHtml.push('<div class="work-grid">' + mapsHtml + '</div>');
        } else {
            rightHtml.push('<div class="work-empty">暂无地图</div>');
        }
        rightHtml.push('</div>');
        rDelay += 0.06;

        // 6. 发布的博客（始终显示）
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的博客 <span class="count">(' + memberBlogs.length + ')</span></div>');
        var otherBlogs = memberBlogs.filter(function(b) { return !pinnedBlogObj || b.id !== pinnedBlogObj.id; });
        if (otherBlogs.length) {
            var blogsHtml = otherBlogs.map(function(b) { return renderWorkCard(b, 'blog'); }).join('');
            rightHtml.push('<div class="work-grid">' + blogsHtml + '</div>');
        } else {
            rightHtml.push('<div class="work-empty">暂无博客</div>');
        }
        rightHtml.push('</div>');
        rDelay += 0.06;

        // 7. 灵动岛（如果有）
        var islandType = member.liveType || member.islandType || '';
        var islandContent = member.liveContent || member.islandContent || '';
        if (islandType && islandContent) {
            var islandHtml = '';
            if (islandType === '音乐') {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+rDelay+'s;background:rgba(240,244,255,0.7);">' +
                    '<div class="island-title">灵动岛 · 音乐</div>' +
                    '<audio controls style="width:100%;border-radius:6px;"><source src="' + islandContent + '" type="audio/mpeg">您的浏览器不支持音频播放。</audio></div>';
            } else if (islandType === '动画') {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+rDelay+'s;background:rgba(255,245,245,0.7);">' +
                    '<div class="island-title">灵动岛 · 动画</div>' +
                    '<div style="padding:16px 0;text-align:center;font-size:20px;color:#7f6b6b;">' + islandContent + '</div></div>';
            } else { // 留言
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+rDelay+'s;background:rgba(240,250,255,0.7);">' +
                    '<div class="island-title">灵动岛 · 留言</div>' +
                    '<div style="font-size:14px;color:#1e293b;line-height:1.6;">' + islandContent + '</div></div>';
            }
            rightHtml.push(islandHtml);
        }

        // ----- 组装 -----
        var html = '<div class="modal-columns">';
        html += '<div class="column-left">' + leftHtml.join('') + '</div>';
        html += '<div class="column-right">' + rightHtml.join('') + '</div>';
        html += '</div>';
        modalInner.innerHTML = html;
    }

    // ----- 公共 API -----
    window.openMemberModal = function(name) {
        var allMembers = window._memberData || [];
        var member = allMembers.find(function(m) { return m.name === name; });
        var modalOverlay = document.getElementById('modalOverlay');
        var modalContent = document.getElementById('modalContent');

        if (!modalOverlay || !modalContent) {
            console.warn('弹窗元素未找到');
            return;
        }

        if (member) {
            modalContent.style.backgroundImage = '';
            modalContent.style.backgroundBlendMode = '';
            modalContent.classList.remove('has-bg');
            renderMemberModal(member);
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            modalContent.style.backgroundImage = '';
            modalContent.style.backgroundBlendMode = '';
            modalContent.classList.remove('has-bg');
            document.getElementById('modalInner').innerHTML =
                '<div style="padding:60px 20px;text-align:center;color:#4c6a9e;opacity:0.5;">未找到该成员档案</div>';
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // 关闭事件（同前）
    document.addEventListener('DOMContentLoaded', function() {
        var modalClose = document.getElementById('modalClose');
        var modalOverlay = document.getElementById('modalOverlay');

        function closeModal() {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
            var modalContent = document.getElementById('modalContent');
            if (modalContent) {
                modalContent.style.backgroundImage = '';
                modalContent.style.backgroundBlendMode = '';
                modalContent.classList.remove('has-bg');
            }
        }

        if (modalClose) modalClose.addEventListener('click', closeModal);
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) closeModal();
            });
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    });

})();
