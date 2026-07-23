/**
 * 成员档案弹窗 — 最终版
 * 依赖：window._memberData, window._mapData, window._blogData
 * 调用：window.openMemberModal(name)
 * 内置解析函数 parseMemberFromIssue 供外部使用
 */
(function() {
    // 工具函数
    function getSiteRoot() {
        var path = window.location.pathname;
        if (path.indexOf('/acns/') === 0) return '/acns/';
        var idx = path.indexOf('/acns/');
        if (idx !== -1) return path.substring(0, idx + 6);
        return '/';
    }

    var RANK_COLORS = {
        '普通': '#8b8b8b', '优秀': '#4caf50', '精英': '#2196f3',
        '大师': '#ff9800', '传说': '#f44336'
    };
    var ATTR_MAP = { '1': '正式成员', '2': '外部成员', '3': '特招成员' };
    var GAME_MAP = { '1': '迷你世界', '2': 'Minecraft', '3': '迷你世界 + Minecraft' };
    var GROUP_MAP = { '1': '建筑组', '2': '玩法组', '3': '模型组', '4': '编辑组', '0': '无' };

    function parseIdNumber(id) {
        if (!id || id.length < 10) return null;
        var s = id.trim();
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
        if (!joinDate) return null;
        var parts = joinDate.split('-');
        if (parts.length !== 3) return null;
        var y = parseInt(parts[0]), m = parseInt(parts[1])-1, d = parseInt(parts[2]);
        if (isNaN(y)||isNaN(m)||isNaN(d)) return null;
        var start = new Date(y,m,d);
        var now = new Date();
        var diff = now - start;
        return Math.floor(diff / (1000*60*60*24));
    }

    function parseHonorItem(line) {
        var text = line.trim();
        var color = '#5f7fff';
        var rankMatch = text.match(/^\[([^\]]+)\]\s*(.+)/);
        if (rankMatch) {
            var rank = rankMatch[1].trim();
            text = rankMatch[2].trim();
            if (RANK_COLORS[rank]) color = RANK_COLORS[rank];
        } else {
            var match = text.match(/^(.+?)[（(]\s*([^）)]+)\s*[）)]$/);
            if (match) {
                text = match[1].trim();
                var c = match[2].trim();
                if (RANK_COLORS[c]) color = RANK_COLORS[c];
                else if (c.startsWith('#')) color = c;
            } else {
                var parts = text.split('|');
                if (parts.length === 2) {
                    text = parts[0].trim();
                    var c2 = parts[1].trim();
                    if (RANK_COLORS[c2]) color = RANK_COLORS[c2];
                    else if (c2.startsWith('#')) color = c2;
                }
            }
        }
        return { text: text, color: color };
    }

    // 核心解析函数（从 Issue 正文生成 member 对象）
    function parseMemberFromIssue(title, body) {
        var member = {
            name: '', role: '', groups: '', minid: '', id: '', joinDate: '',
            avatar: '', background: '', bio: '', pinnedMap: '', pinnedBlog: '',
            honors_work: '', honors_game: '', island: null
        };
        if (title) {
            var parts = title.split('-');
            member.name = parts[0] ? parts[0].trim() : '';
            member.role = parts[1] ? parts[1].trim() : '';
            if (parts.length === 1) member.name = title.trim();
        }
        if (body) {
            var lines = body.split('\n');
            lines.forEach(function(line) {
                var trimmed = line.trim();
                if (!trimmed) return;
                var index = trimmed.indexOf('：');
                if (index === -1) index = trimmed.indexOf(':');
                if (index === -1) return;
                var key = trimmed.substring(0, index).trim();
                var value = trimmed.substring(index + 1).trim();
                switch (key) {
                    case '组别': member.groups = value; break;
                    case '迷你号': member.minid = value; break;
                    case '编号': member.id = value; break;
                    case '入室时间': member.joinDate = value; break;
                    case '头像': member.avatar = value; break;
                    case '背景': member.background = value; break;
                    case '简介': member.bio = value; break;
                    case '置顶地图': member.pinnedMap = value; break;
                    case '置顶博客': member.pinnedBlog = value; break;
                    case '工作室荣誉': member.honors_work = value; break;
                    case '游戏荣誉': member.honors_game = value; break;
                    case '灵动岛类型':
                        if (!member.island) member.island = {};
                        member.island.type = value;
                        break;
                    case '灵动岛内容':
                        if (!member.island) member.island = {};
                        member.island.content = value;
                        break;
                }
            });
        }
        if (member.island) {
            if (!member.island.type) member.island.type = '留言';
            if (!member.island.content) member.island.content = '这里有一片灵动岛';
        }
        return member;
    }
    window.parseMemberFromIssue = parseMemberFromIssue;

    // 主渲染函数
    function renderMemberModal(member) {
        // 归一化
        if (member.groups && typeof member.groups === 'string') {
            member.groups = member.groups.split(/[,，]\s*/).filter(Boolean);
        }
        if (member.groups && member.groups.length) {
            var hasMgmt = member.groups.some(function(g) {
                return g.indexOf('管理层') !== -1 || g.indexOf('管理组') !== -1;
            });
            if (hasMgmt) member.groups = ['ACCM'];
        }
        if (member.honors_work && typeof member.honors_work === 'string') {
            member.honors_work = member.honors_work.split(/[,，]\s*/).filter(Boolean);
        }
        if (member.honors_game && typeof member.honors_game === 'string') {
            member.honors_game = member.honors_game.split(/[,，]\s*/).filter(Boolean);
        }

        var modalContent = document.getElementById('modalContent');
        var modalInner = document.getElementById('modalInner');
        if (!modalContent || !modalInner) return;

        var bgUrl = (member.background && member.background.trim().startsWith('http')) 
            ? member.background.trim() 
            : 'https://user-assets.sxlcdn.com/images/1138507/FmpO0QT0oZTcs8whHzHAjM_5Jss2.png?imageMogr2/strip/auto-orient/thumbnail/1200x9000%3E/quality/90!/format/png';
        modalContent.style.backgroundImage = 'url(' + bgUrl + '), linear-gradient(135deg, #e8edf5, #d5dff0)';
        modalContent.style.backgroundSize = 'cover, cover';
        modalContent.style.backgroundBlendMode = 'overlay, normal';
        modalContent.classList.add('has-bg');

        var leftHtml = [], rightHtml = [], delay = 0.05;

        // 左列：头像信息
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
        leftHtml.push('<div class="meta"><span>编号 ' + (member.id || '未知') + '</span><span>迷你号 ' + (member.minid || '未知') + '</span></div>');
        leftHtml.push('</div>');
        delay += 0.06;

        // 编号解析
        if (member.id && member.id.length >= 10) {
            leftHtml.push(renderIdCard(member.id, delay));
        } else {
            leftHtml.push('<div class="card id-card fade-up" style="animation-delay:'+delay+'s"><span class="muted">编号 ' + (member.id || '未知') + '</span></div>');
        }
        delay += 0.06;

        // 简介
        leftHtml.push('<div class="card bio-card fade-up" style="animation-delay:'+delay+'s">' + (member.bio || '<span class="muted">暂无简介</span>') + '</div>');
        delay += 0.06;

        // 入室天数
        var days = getDaysSince(member.joinDate);
        if (days !== null && days >= 0) {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>加入工作室</span><span class="num">' + days + '</span><span>天</span></div>');
        } else {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>入室时间</span><span>' + (member.joinDate || '未录入') + '</span></div>');
        }
        delay += 0.06;

        // 工作室荣誉
        leftHtml.push('<div class="honor-section fade-up" style="animation-delay:'+delay+'s">');
        leftHtml.push('<div class="section-title">工作室荣誉</div>');
        if (member.honors_work && member.honors_work.length) {
            var workItems = member.honors_work.map(function(h) {
                var p = parseHonorItem(h);
                return '<span class="honor-tag" style="background:' + p.color + ';">' + p.text + '</span>';
            }).join('');
            leftHtml.push('<div class="honor-list">' + workItems + '</div>');
        } else {
            leftHtml.push('<div class="honor-empty">暂无荣誉</div>');
        }
        leftHtml.push('</div>');
        delay += 0.06;

        // 游戏荣誉
        leftHtml.push('<div class="honor-section fade-up" style="animation-delay:'+delay+'s">');
        leftHtml.push('<div class="section-title">游戏荣誉</div>');
        if (member.honors_game && member.honors_game.length) {
            var gameItems = member.honors_game.map(function(h) {
                var p = parseHonorItem(h);
                return '<span class="honor-tag" style="background:' + p.color + ';">' + p.text + '</span>';
            }).join('');
            leftHtml.push('<div class="honor-list">' + gameItems + '</div>');
        } else {
            leftHtml.push('<div class="honor-empty">暂无荣誉</div>');
        }
        leftHtml.push('</div>');
        delay += 0.06;

        // 灵动岛
        if (member.island) {
            var islandHtml = '';
            var type = member.island.type || '留言';
            var content = member.island.content || '这里有一片灵动岛';
            if (type === '音乐') {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+delay+'s"><div class="island-title">灵动岛 · 音乐</div><audio controls style="width:100%"><source src="' + content + '" type="audio/mpeg">不支持音频</audio></div>';
            } else if (type === '动画') {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+delay+'s"><div class="island-title">灵动岛 · 动画</div><div style="padding:16px 0;text-align:center;">' + content + '</div></div>';
            } else {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+delay+'s"><div class="island-title">灵动岛 · 留言</div><div style="font-size:14px;">' + content + '</div></div>';
            }
            leftHtml.push(islandHtml);
        }

        // 右列：作品
        var allMaps = window._mapData || [];
        var allBlogs = window._blogData || [];
        var memberMaps = allMaps.filter(function(m) { return m.author === member.name || m.author.includes(member.name); });
        var memberBlogs = allBlogs.filter(function(b) { return b.author === member.name || b.author.includes(member.name); });

        var pinnedMap = null, pinnedBlog = null;
        if (member.pinnedMap && member.pinnedMap.trim()) {
            var mapId = parseInt(member.pinnedMap.trim());
            if (!isNaN(mapId)) pinnedMap = allMaps.find(function(m) { return m.id === mapId; });
        }
        if (member.pinnedBlog && member.pinnedBlog.trim()) {
            var blogId = parseInt(member.pinnedBlog.trim());
            if (!isNaN(blogId)) pinnedBlog = allBlogs.find(function(b) { return b.id === blogId; });
        }

        var siteRoot = getSiteRoot();

        function renderWorkCard(item, type) {
            var coverHtml = (item.cover && item.cover.trim().startsWith('http')) ?
                '<img class="work-cover" src="' + item.cover.trim() + '" loading="lazy" onerror="this.style.display=\'none\'">' :
                '<div class="work-cover placeholder"></div>';
            var link = siteRoot + (type === 'map' ? 'map/?id=' : 'blog/post.html?id=') + item.id;
            var meta = type === 'map' ? (item.tag || '') + '  ' + item.date : (item.category || '') + '  ' + item.date;
            return '<div class="work-card" onclick="location.href=\'' + link + '\'">' +
                coverHtml +
                '<div class="work-title">' + item.title + (item.pinned ? ' <span class="pinned">置顶</span>' : '') + '</div>' +
                '<div class="work-meta">' + meta + '</div></div>';
        }

        var rDelay = 0.06;
        // 置顶
        var pinnedHtml = '';
        if (pinnedMap) { pinnedMap.pinned = true; pinnedHtml += renderWorkCard(pinnedMap, 'map'); }
        if (pinnedBlog) { pinnedBlog.pinned = true; pinnedHtml += renderWorkCard(pinnedBlog, 'blog'); }
        if (pinnedHtml) {
            rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s"><div class="section-title">置顶作品</div><div class="work-grid">' + pinnedHtml + '</div></div>');
            rDelay += 0.06;
        }

        // 地图
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的地图 <span class="count">(' + memberMaps.length + ')</span></div>');
        var otherMaps = memberMaps.filter(function(m) { return !pinnedMap || m.id !== pinnedMap.id; });
        if (otherMaps.length) {
            rightHtml.push('<div class="work-grid">' + otherMaps.map(function(m) { return renderWorkCard(m, 'map'); }).join('') + '</div>');
        } else {
            rightHtml.push('<div class="work-empty">暂无地图</div>');
        }
        rightHtml.push('</div>');
        rDelay += 0.06;

        // 博客
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的博客 <span class="count">(' + memberBlogs.length + ')</span></div>');
        var otherBlogs = memberBlogs.filter(function(b) { return !pinnedBlog || b.id !== pinnedBlog.id; });
        if (otherBlogs.length) {
            rightHtml.push('<div class="work-grid">' + otherBlogs.map(function(b) { return renderWorkCard(b, 'blog'); }).join('') + '</div>');
        } else {
            rightHtml.push('<div class="work-empty">暂无博客</div>');
        }
        rightHtml.push('</div>');

        var html = '<div class="modal-columns"><div class="column-left">' + leftHtml.join('') + '</div><div class="column-right">' + rightHtml.join('') + '</div></div>';
        modalInner.innerHTML = html;
    }

    // 公共 API
    window.openMemberModal = function(name) {
        var allMembers = window._memberData || [];
        var member = allMembers.find(function(m) { return m.name === name; });
        var overlay = document.getElementById('modalOverlay');
        var content = document.getElementById('modalContent');
        if (!overlay || !content) { console.warn('弹窗元素缺失'); return; }
        if (member) {
            content.style.backgroundImage = '';
            content.style.backgroundBlendMode = '';
            content.classList.remove('has-bg');
            renderMemberModal(member);
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            content.style.backgroundImage = '';
            content.style.backgroundBlendMode = '';
            content.classList.remove('has-bg');
            document.getElementById('modalInner').innerHTML =
                '<div style="padding:60px 20px;text-align:center;color:#4c6a9e;opacity:0.5;">未找到该成员档案</div>';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // 关闭事件
    document.addEventListener('DOMContentLoaded', function() {
        var closeBtn = document.getElementById('modalClose');
        var overlay = document.getElementById('modalOverlay');
        function closeModal() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            var content = document.getElementById('modalContent');
            if (content) {
                content.style.backgroundImage = '';
                content.style.backgroundBlendMode = '';
                content.classList.remove('has-bg');
            }
        }
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
    });
})();
