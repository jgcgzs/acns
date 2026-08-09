/**
 * 成员档案弹窗 — 正式版（灵动岛集成）
 * 完全仿照苹果灵动岛官方规范：位置、尺寸、交互、动画
 * 依赖：window._memberData, window._mapData, window._blogData
 * 调用：window.openMemberModal(name)
 */

(function() {
    'use strict';

    // ----- 工具函数 -----
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
    var RANK_COLORS = ['#1a7fc4', '#4facfe', '#a855f7', '#f59e0b', '#fbbf24'];
    var DEFAULT_COLOR = '#1a7fc4';

    var STYLE_CLASSES = {
        '标准': 'island-style-标准', '黑暗': 'island-style-黑暗', '恐怖': 'island-style-恐怖',
        '梦幻': 'island-style-梦幻', '简约': 'island-style-简约', '霓虹': 'island-style-霓虹',
        '复古': 'island-style-复古', '海洋': 'island-style-海洋', '森林': 'island-style-森林',
        '星空': 'island-style-星空', '暖阳': 'island-style-暖阳', '冷月': 'island-style-冷月',
        '极光': 'island-style-极光', '蒸汽波': 'island-style-蒸汽波', '赛博': 'island-style-赛博',
        '水墨': 'island-style-水墨'
    };
    var DEFAULT_STYLE = 'island-style-标准';

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

    function parseHonorItem(text) {
        var trimmed = text.trim();
        var match = trimmed.match(/^\[(\d+)\]\s*(.*)/);
        if (match) {
            var rank = parseInt(match[1]);
            var name = match[2].trim() || trimmed;
            var color = (rank >= 1 && rank <= 5) ? RANK_COLORS[rank-1] : DEFAULT_COLOR;
            return { rank: rank, name: name, color: color };
        } else {
            return { rank: null, name: trimmed, color: DEFAULT_COLOR };
        }
    }

    function parseIslandContent(raw) {
        if (!raw) return { content: '', style: DEFAULT_STYLE };
        var parts = raw.split('|').map(function(s) { return s.trim(); });
        if (parts.length === 1) {
            return { content: parts[0], style: DEFAULT_STYLE };
        } else {
            var content = parts.slice(0, -1).join(' | ');
            var styleName = parts[parts.length - 1];
            var styleClass = STYLE_CLASSES[styleName] || DEFAULT_STYLE;
            return { content: content, style: styleClass };
        }
    }

    // ============================================================
    // 灵动岛管理（完全按照苹果官方规范）
    // ============================================================

    var islandState = 'compact';
    var islandScene = 'music';
    var longPressTimer = null;
    var islandInitialized = false;

    // 场景配置（支持音乐、计时、通知）
    var sceneConfigs = {
        music: {
            icon: '🎵',
            text: '正在播放',
            detail: '建筑之魂 · 张三',
            badge: '▶',
            progress: 40,
            expandedContent: [
                { label: '歌曲', value: '建筑之魂' },
                { label: '歌手', value: '张三' },
                { actions: ['⏸ 暂停', '⏭ 下一首'] }
            ]
        },
        timer: {
            icon: '⏱️',
            text: '计时器',
            detail: '05:32',
            badge: '',
            progress: 70,
            expandedContent: [
                { label: '剩余', value: '05:32' },
                { label: '进度', value: '70%', isProgress: true },
                { actions: ['⏸ 暂停', '⏹ 停止'] }
            ]
        },
        notification: {
            icon: '💬',
            text: '新消息',
            detail: '来自 李四',
            badge: '3',
            progress: 0,
            expandedContent: [
                { label: '发件人', value: '李四' },
                { label: '内容', value: '我们明天见' },
                { actions: ['回复', '已读'] }
            ]
        }
    };

    function getCompactWidth() {
        var w = window.innerWidth;
        if (w >= 430) return 250;
        if (w >= 393) return 230;
        return Math.min(200, w - 40);
    }

    function getExpandedWidth() {
        var w = window.innerWidth;
        if (w >= 430) return 408;
        if (w >= 393) return 371;
        return Math.max(280, w - 40);
    }

    function getCurrentScene() {
        return sceneConfigs[islandScene] || sceneConfigs.music;
    }

    // 构建展开内容HTML
    function buildExpandedContent(scene) {
        if (!scene.expandedContent || !scene.expandedContent.length) return '';
        var html = '';
        scene.expandedContent.forEach(function(item) {
            if (item.actions) {
                html += '<div class="island-detail-row">';
                item.actions.forEach(function(action) {
                    html += '<button class="island-action-btn">' + action + '</button>';
                });
                html += '</div>';
            } else if (item.isProgress) {
                html += '<div class="island-detail-row">';
                html += '<span class="label">' + item.label + '</span>';
                html += '<div style="flex:1;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;">';
                html += '<div style="width:' + item.value.replace('%','') + '%;height:100%;background:#fff;border-radius:2px;"></div>';
                html += '</div>';
                html += '</div>';
            } else {
                html += '<div class="island-detail-row">';
                html += '<span class="label">' + item.label + '</span>';
                html += '<span class="value">' + item.value + '</span>';
                html += '</div>';
            }
        });
        return html;
    }

    function updateIsland(island) {
        if (!island) return;
        var state = islandState;
        var cw = getCompactWidth();
        var ew = getExpandedWidth();

        island.classList.remove('state-minimal', 'state-compact', 'state-expanded');

        if (state === 'minimal') {
            island.classList.add('state-minimal');
            island.style.width = '36px';
            island.style.height = '36px';
        } else if (state === 'compact') {
            island.classList.add('state-compact');
            island.style.width = cw + 'px';
            island.style.height = '36px';
        } else if (state === 'expanded') {
            island.classList.add('state-expanded');
            island.style.width = ew + 'px';
            island.style.height = '120px';
        }

        var contentEl = island.querySelector('.island-content');
        if (!contentEl) return;

        var scene = getCurrentScene();
        var isMinimal = state === 'minimal';
        var isExpanded = state === 'expanded';

        if (isMinimal) {
            contentEl.innerHTML = '';
            return;
        }

        var html = '';
        var justify = isExpanded ? 'flex-start' : 'center';
        html += '<div style="display:flex;align-items:center;gap:8px;width:100%;justify-content:' + justify + ';overflow:hidden;">';
        html += '<span class="island-icon">' + scene.icon + '</span>';
        html += '<span class="island-text">' + (isExpanded ? (scene.detail || scene.text) : scene.text) + '</span>';
        if (scene.badge) {
            html += '<span class="island-badge">' + scene.badge + '</span>';
        }
        if (isExpanded) {
            html += '<div class="island-progress"><div class="bar" style="width:' + scene.progress + '%"></div></div>';
        }
        html += '</div>';

        if (isExpanded && scene.expandedContent) {
            html += '<div style="width:100%;margin-top:8px;">' + buildExpandedContent(scene) + '</div>';
        }

        contentEl.innerHTML = html;
    }

    function setIslandState(state) {
        var island = document.getElementById('dynamicIsland');
        if (!island) return;
        islandState = state;
        updateIsland(island);
        // 更新控制按钮高亮（如果存在）
        var btns = document.querySelectorAll('#islandControls .state-btn');
        if (btns.length) {
            btns.forEach(function(btn) {
                btn.classList.toggle('active', btn.dataset.state === state);
            });
        }
    }

    function setScene(scene) {
        islandScene = scene;
        var island = document.getElementById('dynamicIsland');
        if (island) updateIsland(island);
        var btns = document.querySelectorAll('#islandControls .scene-buttons button');
        if (btns.length) {
            btns.forEach(function(btn) {
                btn.classList.toggle('active-scene', btn.dataset.scene === scene);
            });
        }
    }

    function handleIslandClick() {
        if (islandState === 'expanded') {
            setIslandState('compact');
        } else {
            // 模拟打开 App
            console.log('📱 打开成员档案');
            // 如果需要真实跳转，可在此添加
        }
    }

    function startLongPress(e) {
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = setTimeout(function() {
            if (islandState !== 'expanded') {
                setIslandState('expanded');
            }
        }, 400);
    }

    function cancelLongPress() {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    function showIsland() {
        var wrapper = document.getElementById('dynamicIslandWrapper');
        if (wrapper) wrapper.classList.add('active');
    }

    function hideIsland() {
        var wrapper = document.getElementById('dynamicIslandWrapper');
        if (wrapper) wrapper.classList.remove('active');
    }

    function handleResize() {
        var island = document.getElementById('dynamicIsland');
        if (island && islandState !== 'minimal') {
            updateIsland(island);
        }
    }

    // 从成员数据中提取灵动岛场景
    function getSceneFromMember(member) {
        var liveType = member.liveType || member.islandType || '';
        var liveContent = member.liveContent || member.islandContent || '';

        if (liveType && liveContent) {
            var parsed = parseIslandContent(liveContent);
            var content = parsed.content || '';

            if (liveType === '音乐') {
                return {
                    scene: 'music',
                    icon: '🎵',
                    text: '正在播放',
                    detail: content || '音乐',
                    badge: '▶',
                    progress: 40,
                    expandedContent: [
                        { label: '歌曲', value: content || '未命名' },
                        { label: '歌手', value: member.name || '未知' },
                        { actions: ['⏸ 暂停', '⏭ 下一首'] }
                    ]
                };
            } else if (liveType === '视频') {
                return {
                    scene: 'music',
                    icon: '▶️',
                    text: '视频播放中',
                    detail: content || '视频',
                    badge: '●',
                    progress: 60,
                    expandedContent: [
                        { label: '视频', value: content || '未命名' },
                        { label: '时长', value: '03:42' },
                        { actions: ['⏸ 暂停', '⏹ 停止'] }
                    ]
                };
            } else if (liveType === '留言') {
                return {
                    scene: 'notification',
                    icon: '💬',
                    text: '新消息',
                    detail: content || '留言',
                    badge: '1',
                    progress: 0,
                    expandedContent: [
                        { label: '发件人', value: member.name || '未知' },
                        { label: '内容', value: content || '暂无' },
                        { actions: ['回复', '已读'] }
                    ]
                };
            } else if (liveType === '图片') {
                return {
                    scene: 'notification',
                    icon: '🖼️',
                    text: '查看图片',
                    detail: '图片',
                    badge: '',
                    progress: 0,
                    expandedContent: [
                        { label: '标题', value: content || '未命名' },
                        { label: '尺寸', value: '1920×1080' },
                        { actions: ['查看', '下载'] }
                    ]
                };
            }
        }
        return null;
    }

    // 从成员数据更新灵动岛
    function updateIslandFromMember(member) {
        var customScene = getSceneFromMember(member);
        if (customScene) {
            // 动态注册场景
            var sceneName = 'custom_' + Date.now();
            sceneConfigs[sceneName] = customScene;
            islandScene = sceneName;
            var island = document.getElementById('dynamicIsland');
            if (island) updateIsland(island);
            return true;
        }
        return false;
    }

    // 创建灵动岛DOM（如果不存在）
    function ensureIslandDOM() {
        if (document.getElementById('dynamicIslandWrapper')) return;

        var wrapper = document.createElement('div');
        wrapper.className = 'dynamic-island-wrapper';
        wrapper.id = 'dynamicIslandWrapper';

        var island = document.createElement('div');
        island.className = 'dynamic-island state-compact';
        island.id = 'dynamicIsland';

        // 双圆点
        var dots = document.createElement('div');
        dots.className = 'island-dots';
        dots.innerHTML = '<span class="dot camera"></span><span class="dot sensor"></span>';
        island.appendChild(dots);

        // 内容容器
        var content = document.createElement('div');
        content.className = 'island-content';
        island.appendChild(content);

        wrapper.appendChild(island);
        document.body.appendChild(wrapper);

        // 绑定事件
        island.addEventListener('click', handleIslandClick);
        island.addEventListener('mousedown', startLongPress);
        island.addEventListener('mouseup', cancelLongPress);
        island.addEventListener('mouseleave', cancelLongPress);
        island.addEventListener('touchstart', startLongPress);
        island.addEventListener('touchend', cancelLongPress);
        island.addEventListener('touchcancel', cancelLongPress);

        window.addEventListener('resize', handleResize);

        islandInitialized = true;
    }

    // ============================================================
    // 主渲染函数
    // ============================================================

    function renderMemberModal(member) {
        // 归一化
        if (member.groups && typeof member.groups === 'string') {
            member.groups = member.groups.split(/[,，]\s*/).filter(Boolean);
        }

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

        // 更新灵动岛内容
        var hasCustomScene = updateIslandFromMember(member);
        if (!hasCustomScene) {
            // 默认使用音乐场景
            islandScene = 'music';
            var island = document.getElementById('dynamicIsland');
            if (island) updateIsland(island);
        }

        var leftHtml = [], rightHtml = [];
        var delay = 0.05;

        // ----- 左栏 -----
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
        } else {
            leftHtml.push('<div class="card bio-card fade-up" style="animation-delay:'+delay+'s"><span class="muted">暂无简介</span></div>');
        }
        delay += 0.06;

        var days = getDaysSince(member.joinDate);
        if (days !== null && days >= 0) {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>加入工作室</span><span class="num">' + days + '</span><span>天</span></div>');
        } else if (member.joinDate && member.joinDate !== '未知' && member.joinDate !== '') {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>入室时间</span><span>' + member.joinDate + '</span></div>');
        } else {
            leftHtml.push('<div class="card days-card fade-up" style="animation-delay:'+delay+'s"><span>入室时间</span><span class="muted">未录入</span></div>');
        }

        // ----- 右栏 -----
        var rDelay = 0.06;

        // 1. 工作室荣誉
        rightHtml.push('<div class="honor-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">工作室荣誉</div>');
        if (workHonors && workHonors.length) {
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

        // 2. 游戏荣誉
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

        // 3. 作品数据
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
            var pinnedLabel = item.pinned ? '<span class="pinned">置顶</span>' : '';
            return '<div class="work-card" onclick="location.href=\'' + link + '\'">' +
                coverHtml +
                '<div class="work-title">' + pinnedLabel + item.title + '</div>' +
                '<div class="work-meta">' + meta + '</div></div>';
        }

        var allMapItems = [];
        if (pinnedMapObj) { pinnedMapObj.pinned = true; allMapItems.push(pinnedMapObj); }
        var otherMaps = memberMaps.filter(function(m) { return !pinnedMapObj || m.id !== pinnedMapObj.id; });
        allMapItems = allMapItems.concat(otherMaps);

        var allBlogItems = [];
        if (pinnedBlogObj) { pinnedBlogObj.pinned = true; allBlogItems.push(pinnedBlogObj); }
        var otherBlogs = memberBlogs.filter(function(b) { return !pinnedBlogObj || b.id !== pinnedBlogObj.id; });
        allBlogItems = allBlogItems.concat(otherBlogs);

        // 地图
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的地图 <span class="count">(' + allMapItems.length + ')</span></div>');
        if (allMapItems.length) {
            rightHtml.push('<div class="work-scroll"><div class="work-grid">');
            allMapItems.forEach(function(m) { rightHtml.push(renderWorkCard(m, 'map')); });
            rightHtml.push('</div></div>');
        } else {
            rightHtml.push('<div class="work-empty">暂无地图</div>');
        }
        rightHtml.push('</div>');
        rDelay += 0.06;

        // 博客
        rightHtml.push('<div class="work-section fade-up" style="animation-delay:'+rDelay+'s">');
        rightHtml.push('<div class="section-title">发布的博客 <span class="count">(' + allBlogItems.length + ')</span></div>');
        if (allBlogItems.length) {
            rightHtml.push('<div class="work-scroll"><div class="work-grid">');
            allBlogItems.forEach(function(b) { rightHtml.push(renderWorkCard(b, 'blog')); });
            rightHtml.push('</div></div>');
        } else {
            rightHtml.push('<div class="work-empty">暂无博客</div>');
        }
        rightHtml.push('</div>');

        // ----- 组装 -----
        var html = '<div class="modal-columns">';
        html += '<div class="column-left">' + leftHtml.join('') + '</div>';
        html += '<div class="column-right">' + rightHtml.join('') + '</div>';
        html += '</div>';
        modalInner.innerHTML = html;
    }

    // ============================================================
    // 公共 API
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

        // 确保灵动岛DOM存在
        ensureIslandDOM();

        if (member) {
            // 显示灵动岛
            showIsland();
            // 重置状态为紧凑
            setIslandState('compact');
            // 渲染成员
            modalContent.style.backgroundImage = '';
            modalContent.style.backgroundBlendMode = '';
            modalContent.classList.remove('has-bg');
            renderMemberModal(member);
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            hideIsland();
            modalContent.style.backgroundImage = '';
            modalContent.style.backgroundBlendMode = '';
            modalContent.classList.remove('has-bg');
            document.getElementById('modalInner').innerHTML =
                '<div style="padding:60px 20px;text-align:center;color:#4a5a6a;opacity:0.5;">未找到该成员档案</div>';
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // 暴露灵动岛控制（供调试或外部调用）
    window.setIslandState = setIslandState;
    window.setScene = setScene;

    // 关闭事件
    document.addEventListener('DOMContentLoaded', function() {
        var modalClose = document.getElementById('modalClose');
        var modalOverlay = document.getElementById('modalOverlay');

        function closeModal() {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';
            hideIsland();
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
