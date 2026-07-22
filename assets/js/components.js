/**
 * 公共组件 - 成员档案弹窗（左右列 · 左右移入动画）
 * 使用方式：
 *   1. 页面加载成员数据到 window._memberData
 *   2. 加载地图数据到 window._mapData
 *   3. 加载博客数据到 window._blogData
 *   4. 调用 window.openMemberModal(name) 打开弹窗
 */

(function() {

    // ============================================================
    // 获取站点根目录（绝对路径）
    // ============================================================
    function getSiteRoot() {
        var path = window.location.pathname;
        if (path.indexOf('/acns/') === 0) return '/acns/';
        var idx = path.indexOf('/acns/');
        if (idx !== -1) return path.substring(0, idx + 6);
        return '/';
    }

    // ============================================================
    // 编号解析（游戏名称已修正）
    // ============================================================
    var ATTR_MAP = { '1': '正式成员', '2': '外部成员', '3': '特招成员' };
    var GAME_MAP = { '1': '迷你世界', '2': 'Minecraft', '3': '迷你世界 + Minecraft' };
    var GROUP_MAP = { '1': '建筑组', '2': '玩法组', '3': '模型组', '4': '编辑组', '0': '无' };
    var DEFAULT_BG = 'https://user-assets.sxlcdn.com/images/1138507/FmpO0QT0oZTcs8whHzHAjM_5Jss2.png?imageMogr2/strip/auto-orient/thumbnail/1200x9000%3E/quality/90!/format/png';

    var COLOR_MAP = {
        '红': '#e74c3c', '蓝': '#5f7fff', '绿': '#10b981',
        '紫': '#8b5cf6', '橙': '#f59e0b', '金': '#f1c40f',
        '粉': '#ec4899', '青': '#06b6d4', '灰': '#95a5a6',
        '黑': '#2d3436', '白': '#ecf0f1', '玫': '#f472b6'
    };

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
        if (!info) return '<div class="card id-card slide-left" style="animation-delay:'+delay+'s"><span style="opacity:0.3;">编号格式无效</span></div>';
        var html = '<div class="card id-card slide-left" style="animation-delay:'+delay+'s"><div class="label">编号解析</div><div class="parts">';
        html += '<span>▸ ' + info.attrName + ' <span style="opacity:0.3;">(' + id.charAt(0) + ')</span></span>';
        html += '<span>▸ ' + info.gameName + ' <span style="opacity:0.3;">(' + id.charAt(1) + ')</span></span>';
        html += '<span>▸ ' + info.date + '</span>';
        html += '<span>▸ ' + info.groupDisplay + '</span>';
        if (info.dup && info.dup !== '无') html += '<span>▸ 防重#' + info.dup + '</span>';
        html += '</div><div class="raw">完整编号：' + info.raw + '</div></div>';
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

    function parseHonorItem(line) {
        var parts = line.split('|');
        var text = parts[0].trim();
        var color = '#5f7fff';
        if (parts.length > 1) {
            var c = parts[1].trim();
            if (COLOR_MAP[c]) color = COLOR_MAP[c];
            else if (c.startsWith('#')) color = c;
            else {
                var lower = c.toLowerCase();
                for (var key in COLOR_MAP) {
                    if (key.toLowerCase() === lower || COLOR_MAP[key].toLowerCase() === lower) {
                        color = COLOR_MAP[key]; break;
                    }
                }
            }
        }
        return { text, color };
    }

    // ============================================================
    // 主渲染函数
    // ============================================================
    function renderMemberModal(member) {
        var bgUrl = (member.background && member.background.trim().startsWith('http')) ? member.background.trim() : DEFAULT_BG;
        var modalContent = document.getElementById('modalContent');
        var modalInner = document.getElementById('modalInner');
        if (!modalContent || !modalInner) return;

        modalContent.style.backgroundImage = 'url(' + bgUrl + ')';
        modalContent.classList.add('has-bg');

        // --- 构建左侧列卡片 ---
        var leftHtml = [];
        var leftDelay = 0.04;

        // 1. 头像卡片（含姓名、角色、组别、元数据）
        var avatarHtml = (member.avatar && member.avatar.trim().startsWith('http')) ?
            '<img src="' + member.avatar.trim() + '" alt="' + member.name + '" loading="lazy" onerror="this.style.display=\'none\'">' :
            member.name.charAt(0);
        var groupsHtml = member.groups && member.groups.length ?
            member.groups.map(function(g) { return '<span class="g">' + g + '</span>'; }).join('') : '';
        var attrBadge = '';
        if (member.id && member.id.length >= 1) {
            var first = member.id.charAt(0);
            var attrName = '', cls = '';
            if (first === '1') { attrName = '正式成员'; cls = 'green'; }
            else if (first === '2') { attrName = '外部成员'; cls = 'blue'; }
            else if (first === '3') { attrName = '特招成员'; cls = 'purple'; }
            if (attrName) attrBadge = '<span class="member-attr-badge ' + cls + '">' + attrName + '</span>';
        }
        var profileHtml = '<div class="profile-card slide-left" style="animation-delay:'+leftDelay+'s">';
        profileHtml += '<div class="avatar">' + avatarHtml + '</div>';
        profileHtml += '<div class="name">' + member.name + ' ' + attrBadge + '</div>';
        profileHtml += (member.role ? '<div class="role">' + member.role + '</div>' : '');
        profileHtml += (groupsHtml ? '<div class="groups">' + groupsHtml + '</div>' : '');
        profileHtml += '<div class="meta">';
        profileHtml += '<span><i class="fas fa-id-card"></i> ' + member.id + '</span>';
        profileHtml += '<span><i class="fas fa-gamepad"></i> ' + member.minid + '</span>';
        profileHtml += '</div></div>';
        leftHtml.push(profileHtml);
        leftDelay += 0.06;

        // 2. 编号卡片
        if (member.id && member.id !== '未知' && member.id.length >= 10) {
            leftHtml.push(renderIdCard(member.id, leftDelay));
        } else {
            leftHtml.push('<div class="card id-card slide-left" style="animation-delay:'+leftDelay+'s"><span style="opacity:0.3;">编号：' + member.id + '</span></div>');
        }
        leftDelay += 0.06;

        // 3. 简介卡片
        if (member.bio && member.bio.trim()) {
            leftHtml.push('<div class="card bio-card slide-left" style="animation-delay:'+leftDelay+'s">' + member.bio + '</div>');
            leftDelay += 0.06;
        }

        // 4. 入室天数卡片
        var days = getDaysSince(member.joinDate);
        var daysHtml = (days !== null && days >= 0) ?
            '<div class="card days-card slide-left" style="animation-delay:'+leftDelay+'s"><span>加入工作室</span><span class="num">' + days + '</span><span>天</span></div>' :
            (member.joinDate && member.joinDate !== '未知' && member.joinDate !== '') ?
            '<div class="card days-card slide-left" style="animation-delay:'+leftDelay+'s"><span>入室时间</span><span>' + member.joinDate + '</span></div>' :
            '<div class="card days-card slide-left" style="animation-delay:'+leftDelay+'s"><span>入室时间</span><span style="opacity:0.3;">未录入</span></div>';
        leftHtml.push(daysHtml);
        leftDelay += 0.06;

        // --- 构建右侧列卡片 ---
        var rightHtml = [];
        var rightDelay = 0.06; // 稍晚一点，形成交错

        // 1. 工作室荣誉
        if (member.honors_work && member.honors_work.length) {
            var items = member.honors_work.map(function(h) {
                var p = parseHonorItem(h);
                return '<span class="honor-item" style="background:' + p.color + ';">' + p.text + '</span>';
            }).join('');
            rightHtml.push('<div class="honor-card slide-right" style="animation-delay:'+rightDelay+'s"><div class="title"><i class="fas fa-trophy"></i> 工作室荣誉</div><div class="list">' + items + '</div></div>');
            rightDelay += 0.06;
        }

        // 2. 游戏荣誉
        if (member.honors_game && member.honors_game.length) {
            var items = member.honors_game.map(function(h) {
                var p = parseHonorItem(h);
                return '<span class="honor-item" style="background:' + p.color + ';">' + p.text + '</span>';
            }).join('');
            rightHtml.push('<div class="honor-card slide-right" style="animation-delay:'+rightDelay+'s"><div class="title"><i class="fas fa-gamepad"></i> 游戏荣誉</div><div class="list">' + items + '</div></div>');
            rightDelay += 0.06;
        }

        // 3. 地图与博客
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
                '<img class="cover" src="' + item.cover.trim() + '" alt="' + item.title + '" loading="lazy" onerror="this.style.display=\'none\'">' :
                '<div class="cover-placeholder"><i class="fas fa-image"></i></div>';
            var link = siteRoot + (isMap ? 'map/?id=' : 'blog/post.html?id=') + item.id;
            var meta = isMap ? (item.tag ? item.tag + ' · ' : '') + item.date : item.category + ' · ' + item.date;
            return '<div class="work-card" onclick="location.href=\'' + link + '\'">' +
                coverHtml +
                '<div class="title">' + item.title + (item.pinned ? ' <span class="pinned-badge">置顶</span>' : '') + '</div>' +
                '<div class="meta">' + meta + '</div></div>';
        }

        // 置顶作品
        var pinnedHtml = '';
        if (pinnedMapObj) { pinnedMapObj.pinned = true; pinnedHtml += renderWorkCard(pinnedMapObj, 'map'); }
        if (pinnedBlogObj) { pinnedBlogObj.pinned = true; pinnedHtml += renderWorkCard(pinnedBlogObj, 'blog'); }
        if (pinnedHtml) {
            rightHtml.push('<div class="slide-right" style="animation-delay:'+rightDelay+'s;width:100%;"><div class="section-title"><i class="fas fa-thumbtack"></i> 置顶</div><div class="work-grid">' + pinnedHtml + '</div></div>');
            rightDelay += 0.06;
        }

        // 其他地图
        var otherMaps = memberMaps.filter(function(m) { return !pinnedMapObj || m.id !== pinnedMapObj.id; });
        var mapsHtml = otherMaps.length ?
            otherMaps.map(function(m) { return renderWorkCard(m, 'map'); }).join('') :
            '<div class="work-empty">该成员暂无发布的地图</div>';
        rightHtml.push('<div class="slide-right" style="animation-delay:'+rightDelay+'s;width:100%;"><div class="section-title"><i class="fas fa-map"></i> 发布的地图 <span class="count">(' + otherMaps.length + ')</span></div><div class="work-grid">' + mapsHtml + '</div></div>');
        rightDelay += 0.06;

        // 其他博客
        var otherBlogs = memberBlogs.filter(function(b) { return !pinnedBlogObj || b.id !== pinnedBlogObj.id; });
        var blogsHtml = otherBlogs.length ?
            otherBlogs.map(function(b) { return renderWorkCard(b, 'blog'); }).join('') :
            '<div class="work-empty">该成员暂无发布的博客</div>';
        rightHtml.push('<div class="slide-right" style="animation-delay:'+rightDelay+'s;width:100%;"><div class="section-title"><i class="fas fa-pen"></i> 发布的博客 <span class="count">(' + otherBlogs.length + ')</span></div><div class="work-grid">' + blogsHtml + '</div></div>');

        // ---- 组装左右列 ----
        var html = '<div class="modal-columns">';
        html += '<div class="column-left">' + leftHtml.join('') + '</div>';
        html += '<div class="column-right">' + rightHtml.join('') + '</div>';
        html += '</div>';

        modalInner.innerHTML = html;
    }

    // ============================================================
    // 公共API
    // ============================================================
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
            modalContent.classList.remove('has-bg');
            renderMemberModal(member);
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            modalContent.style.backgroundImage = '';
            modalContent.classList.remove('has-bg');
            document.getElementById('modalInner').innerHTML =
                '<div style="padding:60px 20px;text-align:center;color:#4c6a9e;opacity:0.5;">未找到该成员档案</div>';
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // ============================================================
    // 公共解析函数
    // ============================================================
    window.parseDateFromBody = function(body) {
        var patterns = [
            /(\d{4})[-年](\d{1,2})[-月](\d{1,2})[日]?/,
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/
        ];
        for (var i=0; i<patterns.length; i++) {
            var match = body.match(patterns[i]);
            if (match) {
                var year = parseInt(match[1]), month = parseInt(match[2]), day = parseInt(match[3]);
                if (year>=2000 && year<=2100 && month>=1 && month<=12 && day>=1 && day<=31) {
                    return year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0');
                }
            }
        }
        return null;
    };

    window.extractTitlePrefix = function(title) {
        var match = title.match(/^\[([^\]]+)\]\s*(.*)/);
        if (match) { return { prefix: match[1].trim(), cleanTitle: match[2].trim() || title }; }
        return null;
    };

    // 弹窗关闭事件
    document.addEventListener('DOMContentLoaded', function() {
        var modalClose = document.getElementById('modalClose');
        var modalOverlay = document.getElementById('modalOverlay');

        if (modalClose) {
            modalClose.addEventListener('click', function() {
                modalOverlay.classList.remove('active');
                document.body.style.overflow = '';
                var modalContent = document.getElementById('modalContent');
                if (modalContent) { modalContent.style.backgroundImage = '';
                    modalContent.classList.remove('has-bg'); }
            });
        }
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) {
                    modalOverlay.classList.remove('active');
                    document.body.style.overflow = '';
                    var modalContent = document.getElementById('modalContent');
                    if (modalContent) { modalContent.style.backgroundImage = '';
                        modalContent.classList.remove('has-bg'); }
                }
            });
        }
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                var overlay = document.getElementById('modalOverlay');
                if (overlay) {
                    overlay.classList.remove('active');
                    document.body.style.overflow = '';
                    var modalContent = document.getElementById('modalContent');
                    if (modalContent) { modalContent.style.backgroundImage = '';
                        modalContent.classList.remove('has-bg'); }
                }
            }
        });
    });

})();
