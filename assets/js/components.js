/**
 * 成员档案弹窗 — 最终版
 * 强制显示荣誉区域，背景优化，移动端作品横向滑动
 */
(function() {

    function getSiteRoot() {
        var path = window.location.pathname;
        if (path.indexOf('/acns/') === 0) return '/acns/';
        var idx = path.indexOf('/acns/');
        if (idx !== -1) return path.substring(0, idx + 6);
        return '/';
    }

    var ATTR_MAP = { '1': '正式成员', '2': '外部成员', '3': '特招成员' };
    var GAME_MAP = { '1': '迷你世界', '2': 'Minecraft', '3': '迷你世界 + Minecraft' };
    var GROUP_MAP = { '1': '建筑组', '2': '玩法组', '3': '模型组', '4': '编辑组', '0': '无' };
    var DEFAULT_BG = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=80'; // 更美观的默认图

    var COLOR_MAP = {
        '红': '#e74c3c', '蓝': '#5f7fff', '绿': '#10b981',
        '紫': '#8b5cf6', '橙': '#f59e0b', '金': '#f1c40f',
        '粉': '#ec4899', '青': '#06b6d4'
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

    function parseHonorItem(line) {
        var text = line.trim();
        var color = '#5f7fff';
        var match = text.match(/^(.+?)[（(]\s*([^）)]+)\s*[）)]$/);
        if (match) {
            text = match[1].trim();
            var c = match[2].trim();
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
        } else {
            var parts = text.split('|');
            if (parts.length === 2) {
                text = parts[0].trim();
                var c2 = parts[1].trim();
                if (COLOR_MAP[c2]) color = COLOR_MAP[c2];
                else if (c2.startsWith('#')) color = c2;
            }
        }
        return { text: text, color: color };
    }

    function renderMemberModal(member) {
        // 数据归一化
        if (member.groups && typeof member.groups === 'string') {
            member.groups = member.groups.split(/[,，]\s*/).filter(Boolean);
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

        // 背景：优先使用自定义，否则用默认图，不再使用强混合模式
        var bgUrl = (member.background && member.background.trim().startsWith('http')) 
            ? member.background.trim() 
            : DEFAULT_BG;
        modalContent.style.backgroundImage = 'url(' + bgUrl + ')';
        modalContent.style.backgroundSize = 'cover';
        modalContent.style.backgroundPosition = 'center';
        modalContent.style.backgroundBlendMode = 'normal'; // 不再淡化
        modalContent.classList.add('has-bg');

        // 左列
        var leftHtml = [];
        var delay = 0.05;

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

        if (member.id && member.id !== '未知' && member.id.length >= 10) {
            leftHtml.push(renderIdCard(member.id, delay));
        } else {
            leftHtml.push('<div class="card id-card fade-up" style="animation-delay:'+delay+'s"><span class="muted">编号 ' + member.id + '</span></div>');
        }
        delay += 0.06;

        if (member.bio && member.bio.trim()) {
            leftHtml.push('<div class="card bio-card fade-up" style="animation-delay:'+delay+'s">' + member.bio + '</div>');
            delay += 0.06;
        }

        var days = getDaysSince(member.joinDate);
        var daysHtml = '';
        if (days !== null && days >= 0) {
            daysHtml = '<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>加入工作室</span><span class="num">' + days + '</span><span>天</span></div>';
        } else if (member.joinDate && member.joinDate !== '未知' && member.joinDate !== '') {
            daysHtml = '<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>入室时间</span><span>' + member.joinDate + '</span></div>';
        } else {
            daysHtml = '<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>入室时间</span><span class="muted">未录入</span></div>';
        }
        leftHtml.push(daysHtml);
        delay += 0.06;

        // 右列
        var rightHtml = [];
        var rDelay = 0.06;

        // --- 强制显示荣誉区域（工作室荣誉） ---
        rightHtml.push('<div class="honor-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">工作室荣誉</div>');
        rightHtml.push('<div class="honor-list">');
        if (member.honors_work && member.honors_work.length) {
            var items = member.honors_work.map(function(h) {
                var p = parseHonorItem(h);
                return '<span class="honor-tag" style="background:' + p.color + ';">' + p.text + '</span>';
            }).join('');
            rightHtml.push(items);
        } else {
            rightHtml.push('<span class="honor-empty">暂无</span>');
        }
        rightHtml.push('</div></div>');
        rDelay += 0.06;

        // --- 强制显示荣誉区域（游戏荣誉） ---
        rightHtml.push('<div class="honor-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">游戏荣誉</div>');
        rightHtml.push('<div class="honor-list">');
        if (member.honors_game && member.honors_game.length) {
            var items = member.honors_game.map(function(h) {
                var p = parseHonorItem(h);
                return '<span class="honor-tag" style="background:' + p.color + ';">' + p.text + '</span>';
            }).join('');
            rightHtml.push(items);
        } else {
            rightHtml.push('<span class="honor-empty">暂无</span>');
        }
        rightHtml.push('</div></div>');
        rDelay += 0.06;

        // --- 作品 ---
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

        var pinnedHtml = '';
        if (pinnedMapObj) { pinnedMapObj.pinned = true; pinnedHtml += renderWorkCard(pinnedMapObj, 'map'); }
        if (pinnedBlogObj) { pinnedBlogObj.pinned = true; pinnedHtml += renderWorkCard(pinnedBlogObj, 'blog'); }
        if (pinnedHtml) {
            rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
            rightHtml.push('<div class="section-title">置顶作品</div>');
            rightHtml.push('<div class="work-grid">' + pinnedHtml + '</div></div>');
            rDelay += 0.06;
        }

        // 地图列表（移动端将用横向滚动）
        var otherMaps = memberMaps.filter(function(m) { return !pinnedMapObj || m.id !== pinnedMapObj.id; });
        var mapsHtml = otherMaps.length ?
            otherMaps.map(function(m) { return renderWorkCard(m, 'map'); }).join('') :
            '<div class="work-empty">暂无发布的地图</div>';
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的地图 <span class="count">(' + otherMaps.length + ')</span></div>');
        rightHtml.push('<div class="work-grid horizontal-scroll">' + mapsHtml + '</div></div>');
        rDelay += 0.06;

        // 博客列表
        var otherBlogs = memberBlogs.filter(function(b) { return !pinnedBlogObj || b.id !== pinnedBlogObj.id; });
        var blogsHtml = otherBlogs.length ?
            otherBlogs.map(function(b) { return renderWorkCard(b, 'blog'); }).join('') :
            '<div class="work-empty">暂无发布的博客</div>';
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的博客 <span class="count">(' + otherBlogs.length + ')</span></div>');
        rightHtml.push('<div class="work-grid horizontal-scroll">' + blogsHtml + '</div></div>');
        rDelay += 0.06;

        // 灵动岛
        if (member.island) {
            var islandType = member.island.type || '留言';
            var islandContent = member.island.content || '这里有一片灵动岛';
            var islandHtml = '';
            if (islandType === '音乐') {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+rDelay+'s;background:rgba(240,244,255,0.7);">' +
                    '<div class="island-title">灵动岛 · 音乐</div>' +
                    '<audio controls style="width:100%;border-radius:6px;"><source src="' + islandContent + '" type="audio/mpeg">您的浏览器不支持音频播放。</audio></div>';
            } else if (islandType === '动画') {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+rDelay+'s;background:rgba(255,245,245,0.7);">' +
                    '<div class="island-title">灵动岛 · 动画</div>' +
                    '<div style="padding:16px 0;text-align:center;font-size:20px;color:#7f6b6b;">' + islandContent + '</div></div>';
            } else {
                islandHtml = '<div class="card island-card fade-up" style="animation-delay:'+rDelay+'s;background:rgba(240,250,255,0.7);">' +
                    '<div class="island-title">灵动岛 · 留言</div>' +
                    '<div style="font-size:14px;color:#1e293b;line-height:1.6;">' + islandContent + '</div></div>';
            }
            rightHtml.push(islandHtml);
        }

        // 组装
        var html = '<div class="modal-columns">';
        html += '<div class="column-left">' + leftHtml.join('') + '</div>';
        html += '<div class="column-right">' + rightHtml.join('') + '</div>';
        html += '</div>';
        modalInner.innerHTML = html;
    }

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

    document.addEventListener('DOMContentLoaded', function() {
        var modalClose = document.getElementById('modalClose');
        var modalOverlay = document.getElementById('modalOverlay');

        function closeModal() {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
            var modalContent = document.getElementById('modalContent');
            if (modalContent) {
                modalContent.style.backgroundImage = '';
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
