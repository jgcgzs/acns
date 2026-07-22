/**
 * 公共组件 - 成员档案弹窗
 * 依赖：jQuery（可选，但不用也可），无需外部依赖
 * 使用方式：
 *   1. 页面加载成员数据到 window._memberData
 *   2. 加载地图数据到 window._mapData
 *   3. 加载博客数据到 window._blogData
 *   4. 调用 window.openMemberModal(name) 打开弹窗
 */

(function() {

    // ============================================================
    // 编号解析工具
    // ============================================================
    var ATTR_MAP = { '1': '正式成员', '2': '外部成员', '3': '特招成员' };
    var GAME_MAP = { '1': '迷你世界', '2': '安慕希(MC)', '3': '迷你+安慕希' };
    var GROUP_MAP = { '1': '建筑组', '2': '玩法组', '3': '模型组', '4': '编辑组', '0': '无' };
    var DEFAULT_BG = 'https://user-assets.sxlcdn.com/images/1138507/FmpO0QT0oZTcs8whHzHAjM_5Jss2.png?imageMogr2/strip/auto-orient/thumbnail/1200x9000%3E/quality/90!/format/png';

    function parseIdNumber(id) {
        if (!id || id === '未知' || id.length < 10) return null;
        var s = id.trim();
        if (s.length < 10) return null;
        var attr = s.charAt(0);
        var game = s.charAt(1);
        var year = s.substring(2, 4);
        var month = s.substring(4, 6);
        var day = s.substring(6, 8);
        var group1 = s.charAt(8);
        var group2 = s.charAt(9);
        var dup = s.length > 10 ? s.charAt(10) : '';

        var attrName = ATTR_MAP[attr] || '未知属性';
        var gameName = GAME_MAP[game] || '未知平台';
        var group1Name = GROUP_MAP[group1] || '未知';
        var group2Name = GROUP_MAP[group2] || '无';
        var groupDisplay = group2 === '0' ? group1Name : group1Name + ' + ' + group2Name;
        var dateStr = '20' + year + '-' + month + '-' + day;
        var y = parseInt('20' + year), m = parseInt(month), d = parseInt(day);
        var validDate = (y >= 2020 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31);
        if (!validDate) dateStr = '日期无效';
        return { raw: id, attrName: attrName, gameName: gameName, date: dateStr, groupDisplay: groupDisplay, dup: dup || '无' };
    }

    function renderIdParseDetail(id) {
        var info = parseIdNumber(id);
        if (!info) return '<div class="id-parse-detail"><span style="opacity:0.4;">编号格式无效</span></div>';
        var html = '<div class="id-parse-detail"><div class="label">编号解析</div><div class="parts">';
        html += '<span>' + info.attrName + ' <span style="opacity:0.3;">(' + id.charAt(0) + ')</span></span>';
        html += '<span>' + info.gameName + ' <span style="opacity:0.3;">(' + id.charAt(1) + ')</span></span>';
        html += '<span>' + info.date + '</span>';
        html += '<span>' + info.groupDisplay + '</span>';
        if (info.dup && info.dup !== '无') html += '<span>防重#' + info.dup + '</span>';
        html += '</div><div style="font-size:11px;color:var(--text-muted);opacity:0.4;margin-top:2px;">完整编号：' + info.raw + '</div></div>';
        return html;
    }

    function getDaysSince(joinDate) {
        if (!joinDate || joinDate === '未知' || joinDate === '') return null;
        var parts = joinDate.split('-');
        if (parts.length !== 3) return null;
        var y = parseInt(parts[0]), m = parseInt(parts[1]) - 1, d = parseInt(parts[2]);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
        var start = new Date(y, m, d);
        var now = new Date();
        var diff = now - start;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    // ============================================================
    // 渲染弹窗（核心函数）
    // ============================================================
    function renderMemberModal(member) {
        var bgUrl = (member.background && member.background.trim().startsWith('http')) ? member.background.trim() : DEFAULT_BG;
        var modalContent = document.getElementById('modalContent');
        var modalInner = document.getElementById('modalInner');
        if (!modalContent || !modalInner) return;

        modalContent.style.backgroundImage = 'url(' + bgUrl + ')';
        modalContent.classList.add('has-bg');

        var avatarHtml = (member.avatar && member.avatar.trim().startsWith('http')) ?
            '<img src="' + member.avatar.trim() + '" alt="' + member.name + '" loading="lazy" onerror="this.style.display=\'none\'">' :
            member.name.charAt(0);
        var groupsHtml = member.groups && member.groups.length ?
            member.groups.map(function(g) { return '<span class="g">' + g + '</span>'; }).join('') : '';

        var days = getDaysSince(member.joinDate);
        var daysHtml = (days !== null && days >= 0) ?
            '<div class="modal-days"><span>加入工作室</span><span class="num">' + days + '</span><span>天</span></div>' :
            (member.joinDate && member.joinDate !== '未知' && member.joinDate !== '') ?
            '<div class="modal-days"><span>入室时间</span><span>' + member.joinDate + '</span></div>' :
            '<div class="modal-days"><span>入室时间</span><span style="opacity:0.4;">未知</span></div>';

        var idDetailHtml = (member.id && member.id !== '未知' && member.id.length >= 10) ?
            renderIdParseDetail(member.id) :
            '<div class="id-parse-detail"><span style="opacity:0.4;">编号：' + member.id + '</span></div>';

        var bioHtml = (member.bio && member.bio.trim()) ? '<div class="modal-bio">' + member.bio + '</div>' : '';

        // 从全局数据查找关联地图和博客
        var allMaps = window._mapData || [];
        var allBlogs = window._blogData || [];
        var memberMaps = allMaps.filter(function(m) { return m.author === member.name || m.author.includes(member.name); });
        var memberBlogs = allBlogs.filter(function(b) { return b.author === member.name || b.author.includes(member.name); });

        // 置顶
        var pinnedMapObj = null, pinnedBlogObj = null;
        if (member.pinnedMap && member.pinnedMap.trim()) {
            var mapId = parseInt(member.pinnedMap.trim());
            if (!isNaN(mapId)) pinnedMapObj = allMaps.find(function(m) { return m.id === mapId; });
        }
        if (member.pinnedBlog && member.pinnedBlog.trim()) {
            var blogId = parseInt(member.pinnedBlog.trim());
            if (!isNaN(blogId)) pinnedBlogObj = allBlogs.find(function(b) { return b.id === blogId; });
        }

        var pinnedMapHtml = '', pinnedBlogHtml = '';
        if (pinnedMapObj) {
            var coverHtml = (pinnedMapObj.cover && pinnedMapObj.cover.trim().startsWith('http')) ?
                '<img class="wcover" src="' + pinnedMapObj.cover.trim() + '" alt="' + pinnedMapObj.title + '" loading="lazy" onerror="this.style.display=\'none\'">' :
                '<div class="wcover-placeholder"><i class="fas fa-image"></i></div>';
            pinnedMapHtml = '<div class="modal-work-card" onclick="location.href=\'./map/?id=' + pinnedMapObj.id + '\'">' +
                coverHtml + '<div class="wtitle">' + pinnedMapObj.title + ' <span class="pinned-badge">置顶</span></div>' +
                '<div class="wmeta">' + (pinnedMapObj.tag ? pinnedMapObj.tag + ' · ' : '') + pinnedMapObj.date + '</div></div>';
        }
        if (pinnedBlogObj) {
            pinnedBlogHtml = '<div class="modal-work-card" onclick="location.href=\'./blog/post.html?id=' + pinnedBlogObj.id + '\'">' +
                '<div class="wtitle">' + pinnedBlogObj.title + ' <span class="pinned-badge">置顶</span></div>' +
                '<div class="wmeta">' + pinnedBlogObj.category + ' · ' + pinnedBlogObj.date + '</div></div>';
        }

        var otherMaps = memberMaps.filter(function(m) { return !pinnedMapObj || m.id !== pinnedMapObj.id; });
        var otherBlogs = memberBlogs.filter(function(b) { return !pinnedBlogObj || b.id !== pinnedBlogObj.id; });

        var mapsHtml = otherMaps.length ?
            otherMaps.map(function(m) {
                var coverHtml = (m.cover && m.cover.trim().startsWith('http')) ?
                    '<img class="wcover" src="' + m.cover.trim() + '" alt="' + m.title + '" loading="lazy" onerror="this.style.display=\'none\'">' :
                    '<div class="wcover-placeholder"><i class="fas fa-image"></i></div>';
                return '<div class="modal-work-card" onclick="location.href=\'./map/?id=' + m.id + '\'">' +
                    coverHtml + '<div class="wtitle">' + m.title + '</div>' +
                    '<div class="wmeta">' + (m.tag ? m.tag + ' · ' : '') + m.date + '</div></div>';
            }).join('') :
            '<div class="modal-work-empty">该成员暂无发布的地图</div>';

        var blogsHtml = otherBlogs.length ?
            otherBlogs.map(function(b) {
                return '<div class="modal-work-card" onclick="location.href=\'./blog/post.html?id=' + b.id + '\'">' +
                    '<div class="wtitle">' + b.title + '</div>' +
                    '<div class="wmeta">' + b.category + ' · ' + b.date + '</div></div>';
            }).join('') :
            '<div class="modal-work-empty">该成员暂无发布的博客</div>';

        var html = '<div class="modal-member"><div class="mavatar">' + avatarHtml + '</div><div class="minfo">' +
            '<div class="mname">' + member.name + '</div>' +
            (member.role ? '<div class="mrole">' + member.role + '</div>' : '') +
            (groupsHtml ? '<div class="mgroups">' + groupsHtml + '</div>' : '') +
            '<div class="mmeta"><span><i class="fas fa-id-card"></i> ' + member.id + '</span>' +
            '<span><i class="fas fa-gamepad"></i> ' + member.minid + '</span></div></div></div>';

        html += idDetailHtml + bioHtml + daysHtml;

        var hasPinned = pinnedMapObj || pinnedBlogObj;
        if (hasPinned) {
            html += '<div class="modal-section-title">置顶</div><div class="modal-works">';
            if (pinnedMapHtml) html += pinnedMapHtml;
            if (pinnedBlogHtml) html += pinnedBlogHtml;
            if (pinnedMapHtml && !pinnedBlogHtml) html += '<div style="grid-column:span 2;"></div>';
            html += '</div>';
        }

        html += '<div class="modal-section-title">发布的地图 <span class="count">(' + otherMaps.length + ')</span></div>' +
            '<div class="modal-works">' + mapsHtml + '</div>';
        html += '<div class="modal-section-title">发布的博客 <span class="count">(' + otherBlogs.length + ')</span></div>' +
            '<div class="modal-works">' + blogsHtml + '</div>';

        modalInner.innerHTML = html;
    }

    // ============================================================
    // 公共API：打开成员弹窗
    // ============================================================
    window.openMemberModal = function(name) {
        var allMembers = window._memberData || [];
        var member = allMembers.find(function(m) { return m.name === name; });
        var modalOverlay = document.getElementById('modalOverlay');
        var modalContent = document.getElementById('modalContent');

        if (!modalOverlay || !modalContent) {
            console.warn('弹窗元素未找到，请确保页面包含 #modalOverlay 和 #modalContent');
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
                '<div style="padding:40px 20px;text-align:center;color:#4a5a6a;">未找到该成员档案</div>';
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // ============================================================
    // 公共解析函数（供各页面使用）
    // ============================================================
    window.parseDateFromBody = function(body) {
        var patterns = [
            /(\d{4})[-年](\d{1,2})[-月](\d{1,2})[日]?/,
            /(\d{4})\/(\d{1,2})\/(\d{1,2})/
        ];
        for (var i = 0; i < patterns.length; i++) {
            var match = body.match(patterns[i]);
            if (match) {
                var year = parseInt(match[1]), month = parseInt(match[2]), day = parseInt(match[3]);
                if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
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

    // 弹窗关闭事件（统一绑定）
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