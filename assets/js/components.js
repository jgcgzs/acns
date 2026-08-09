/**
 * 成员档案弹窗 — 正式版（灵动岛集成）
 * 完全仿照苹果灵动岛规范：弹性动画、液态玻璃、内容切换
 * 依赖：window._memberData, window._mapData, window._blogData
 * 调用：window.openMemberModal(name)
 */

(function() {
    'use strict';

    // ----- 工具函数（原版保留）-----
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
        if (!raw) return { content: '', style: '' };
        var parts = raw.split('|').map(function(s) { return s.trim(); });
        if (parts.length === 1) {
            return { content: parts[0], style: '' };
        } else {
            var content = parts.slice(0, -1).join(' | ');
            var styleName = parts[parts.length - 1];
            return { content: content, style: styleName };
        }
    }

    // ================================================================
    // 灵动岛管理 — 完整弹簧动画系统
    // ================================================================

    var islandState = 'hidden';      // 'hidden' | 'compact'
    var currentScene = 'music';
    var isVisible = false;
    var autoSwitchTimer = null;
    var autoSwitchEnabled = true;
    var switchInterval = 5000;
    var displayMode = 'content';     // 'content' | 'name'
    var memberName = '';
    var islandContent = '';
    var isAnimating = false;

    // 场景配置
    var scenes = {
        music: { icon: '🎵', text: '正在播放', badge: '▶' },
        timer: { icon: '⏱️', text: '计时器 05:32', badge: '' },
        notification: { icon: '💬', text: '新消息', badge: '3' },
        faceid: { icon: '😊', text: 'Face ID 认证中', badge: '●' },
        navigation: { icon: '🗺️', text: '导航中 15分钟', badge: '🚗' }
    };

    function getScene() {
        return scenes[currentScene] || scenes.music;
    }

    function getCompactWidth() {
        var w = window.innerWidth;
        if (w >= 430) return 250;
        if (w >= 393) return 230;
        return Math.min(200, w - 40);
    }

    function getDisplayText() {
        var scene = getScene();
        if (displayMode === 'name' && memberName) {
            return memberName;
        }
        return islandContent || scene.text;
    }

    // 执行整体回弹动画（收缩 → 更新 → 回弹）
    function performBounceAnimation(callback) {
        var contentEl = document.getElementById('islandContent');
        if (!contentEl || isAnimating) {
            if (callback) callback();
            return;
        }
        isAnimating = true;

        contentEl.classList.remove('bounce-in');
        contentEl.classList.add('bounce-out');

        setTimeout(function() {
            if (callback) callback();
            contentEl.classList.remove('bounce-out');
            contentEl.classList.add('bounce-in');
            setTimeout(function() {
                isAnimating = false;
            }, 550);
        }, 380);
    }

    // 应用UI（不触发动画）
    function applyIslandUI() {
        var island = document.getElementById('dynamicIsland');
        if (!island) return;

        var scene = getScene();
        var cw = getCompactWidth();

        island.classList.remove('state-hidden', 'state-compact', 'visible');

        if (islandState === 'hidden' || !isVisible) {
            island.classList.add('state-hidden');
            island.style.width = '36px';
            island.style.height = '36px';
            island.style.pointerEvents = 'none';
            return;
        }

        island.classList.add('state-compact', 'visible');
        island.style.width = cw + 'px';
        island.style.height = '36px';
        island.style.pointerEvents = 'auto';

        var iconEl = document.getElementById('islandIcon');
        var badgeEl = document.getElementById('islandBadge');
        var textEl = document.getElementById('islandText');

        if (iconEl) iconEl.textContent = scene.icon;
        if (badgeEl) {
            if (scene.badge) {
                badgeEl.textContent = scene.badge;
                badgeEl.style.display = '';
            } else {
                badgeEl.style.display = 'none';
            }
        }
        if (textEl) {
            textEl.textContent = getDisplayText();
            textEl.classList.remove('switching');
            textEl.classList.add('switch-in');
        }
    }

    // ---- 状态切换（隐藏 ↔ 紧凑）----
    function setIslandState(state) {
        if (isAnimating) return;
        var island = document.getElementById('dynamicIsland');
        if (!island) return;
        var wrapper = document.getElementById('dynamicIslandWrapper');

        if (state === 'compact' && islandState === 'hidden') {
            // 展开动画
            isVisible = true;
            islandState = 'compact';
            displayMode = 'content';
            if (wrapper) wrapper.classList.add('active');

            island.classList.remove('visible', 'state-compact');
            island.classList.add('state-hidden');
            island.style.width = '36px';
            island.style.height = '36px';
            island.style.opacity = '0';
            island.style.transform = 'scale(0.5)';
            island.style.pointerEvents = 'none';

            void island.offsetWidth;

            applyIslandUI();

            island.classList.remove('state-hidden');
            island.classList.add('state-compact', 'visible');
            island.style.width = getCompactWidth() + 'px';
            island.style.height = '36px';
            island.style.opacity = '1';
            island.style.transform = 'scale(1)';
            island.style.pointerEvents = 'auto';

            if (autoSwitchEnabled) startAutoSwitch();

        } else if (state === 'hidden' && islandState === 'compact') {
            // 收拢动画
            stopAutoSwitch();

            island.classList.remove('visible', 'state-compact');
            island.classList.add('state-hidden');
            island.style.width = '36px';
            island.style.height = '36px';
            island.style.opacity = '0';
            island.style.transform = 'scale(0.4)';
            island.style.pointerEvents = 'none';

            isVisible = false;
            islandState = 'hidden';

            setTimeout(function() {
                if (wrapper && islandState === 'hidden') {
                    wrapper.classList.remove('active');
                }
            }, 650);
        }
    }

    // ---- 内容切换（整体回弹）----
    function switchContent(newText, newIcon, newBadge) {
        if (islandState === 'hidden' || !isVisible) return;

        var textEl = document.getElementById('islandText');
        var iconEl = document.getElementById('islandIcon');
        var badgeEl = document.getElementById('islandBadge');

        if (!textEl) return;

        performBounceAnimation(function() {
            if (newIcon !== undefined && iconEl) iconEl.textContent = newIcon;
            if (newBadge !== undefined) {
                if (badgeEl) {
                    if (newBadge) {
                        badgeEl.textContent = newBadge;
                        badgeEl.style.display = '';
                    } else {
                        badgeEl.style.display = 'none';
                    }
                }
            }
            if (newText !== undefined) {
                textEl.textContent = newText;
            }
            textEl.classList.remove('switching');
            textEl.classList.add('switch-in');
        });
    }

    // ---- 切换显示模式（内容 ↔ 名字）----
    function toggleDisplayMode() {
        if (islandState === 'hidden' || !isVisible || isAnimating) return;

        var scene = getScene();
        var currentText = getDisplayText();
        var newText;

        if (displayMode === 'content') {
            displayMode = 'name';
            newText = memberName || '成员';
        } else {
            displayMode = 'content';
            newText = islandContent || scene.text;
        }

        if (currentText === newText) {
            displayMode = (displayMode === 'content') ? 'name' : 'content';
            newText = (displayMode === 'content') ? (islandContent || scene.text) : (memberName || '成员');
        }

        switchContent(newText);
    }

    // ---- 切换场景 ----
    function switchScene(scene) {
        if (currentScene === scene && islandState === 'compact') {
            triggerBounce();
            return;
        }

        currentScene = scene;
        var sceneData = getScene();
        var newText = displayMode === 'name' ? (memberName || '成员') : (islandContent || sceneData.text);
        switchContent(newText, sceneData.icon, sceneData.badge);
    }

    // ---- 手动触发回弹演示 ----
    function triggerBounce() {
        if (islandState === 'hidden' || !isVisible) return;
        var contentEl = document.getElementById('islandContent');
        if (!contentEl) return;

        contentEl.classList.remove('bounce-in');
        contentEl.classList.add('bounce-out');

        setTimeout(function() {
            contentEl.classList.remove('bounce-out');
            contentEl.classList.add('bounce-in');
        }, 400);
    }

    // ---- 自动切换 ----
    function startAutoSwitch() {
        stopAutoSwitch();
        if (!autoSwitchEnabled || islandState === 'hidden' || !isVisible) return;
        autoSwitchTimer = setInterval(function() {
            toggleDisplayMode();
        }, switchInterval);
    }

    function stopAutoSwitch() {
        if (autoSwitchTimer) {
            clearInterval(autoSwitchTimer);
            autoSwitchTimer = null;
        }
    }

    function toggleAutoSwitch() {
        autoSwitchEnabled = !autoSwitchEnabled;
        if (autoSwitchEnabled && isVisible && islandState !== 'hidden') {
            startAutoSwitch();
        } else {
            stopAutoSwitch();
        }
    }

    // ---- 交互事件 ----
    function handleIslandClick() {
        if (islandState === 'compact') {
            toggleDisplayMode();
        }
    }

    var swipeStartY = 0;
    var isSwiping = false;

    function handleTouchStart(e) {
        var touch = e.touches[0];
        swipeStartY = touch.clientY;
        isSwiping = true;
    }

    function handleTouchMove(e) {
        if (!isSwiping) return;
        var touch = e.touches[0];
        var deltaY = touch.clientY - swipeStartY;

        if (deltaY < -40) {
            if (islandState === 'compact') {
                setIslandState('hidden');
                isSwiping = false;
            }
        } else if (deltaY > 40) {
            if (islandState === 'hidden') {
                setIslandState('compact');
                isSwiping = false;
            }
        }
    }

    function handleTouchEnd() {
        isSwiping = false;
    }

    function handleWheel(e) {
        var delta = e.deltaY;
        if (delta < -30) {
            if (islandState === 'compact') {
                setIslandState('hidden');
                e.preventDefault();
            }
        } else if (delta > 30) {
            if (islandState === 'hidden') {
                setIslandState('compact');
                e.preventDefault();
            }
        }
    }

    function handleResize() {
        if (islandState === 'compact' && isVisible) {
            var island = document.getElementById('dynamicIsland');
            if (island) {
                island.style.width = getCompactWidth() + 'px';
            }
        }
    }

    // 鼠标跟随光晕
    function setupCursorGlow() {
        var modal = document.getElementById('modalContent');
        var glow = document.getElementById('cursorGlow');
        if (!modal || !glow) return;
        modal.addEventListener('mousemove', function(e) {
            var rect = modal.getBoundingClientRect();
            glow.style.left = (e.clientX - rect.left) + 'px';
            glow.style.top = (e.clientY - rect.top) + 'px';
        });
    }

    // ---- 从成员数据提取灵动岛内容 ----
    function getIslandContent(member) {
        var liveType = member.liveType || member.islandType || '';
        var liveContent = member.liveContent || member.islandContent || '';

        if (liveType && liveContent) {
            var parsed = parseIslandContent(liveContent);
            var content = parsed.content || '';
            if (liveType === '音乐') {
                return { icon: '🎵', text: content || '正在播放', badge: '▶' };
            } else if (liveType === '视频') {
                return { icon: '▶️', text: content || '视频播放中', badge: '●' };
            } else if (liveType === '留言') {
                return { icon: '💬', text: content || '新消息', badge: '1' };
            } else if (liveType === '图片') {
                return { icon: '🖼️', text: content || '查看图片', badge: '' };
            }
        }
        return null;
    }

    // ---- 创建灵动岛DOM ----
    function ensureIslandDOM() {
        if (document.getElementById('dynamicIslandWrapper')) return;

        var wrapper = document.createElement('div');
        wrapper.className = 'dynamic-island-wrapper';
        wrapper.id = 'dynamicIslandWrapper';

        var island = document.createElement('div');
        island.className = 'dynamic-island';
        island.id = 'dynamicIsland';

        var dots = document.createElement('div');
        dots.className = 'island-dots';
        dots.innerHTML = '<span class="dot camera"></span><span class="dot sensor"></span>';
        island.appendChild(dots);

        var content = document.createElement('div');
        content.className = 'island-content';
        content.id = 'islandContent';
        content.innerHTML = `
            <span class="island-icon" id="islandIcon">🎵</span>
            <span class="island-text switch-in" id="islandText">正在播放</span>
            <span class="island-badge" id="islandBadge">▶</span>
        `;
        island.appendChild(content);

        wrapper.appendChild(island);
        document.body.appendChild(wrapper);

        // 绑定事件
        island.addEventListener('click', handleIslandClick);
        island.addEventListener('touchstart', handleTouchStart);
        island.addEventListener('touchmove', handleTouchMove);
        island.addEventListener('touchend', handleTouchEnd);
        island.addEventListener('touchcancel', handleTouchEnd);
        island.addEventListener('wheel', handleWheel, { passive: false });

        window.addEventListener('resize', handleResize);

        // 初始隐藏
        islandState = 'hidden';
        isVisible = false;
        wrapper.classList.remove('active');

        // 鼠标光晕
        setTimeout(setupCursorGlow, 100);
    }

    // ================================================================
    // 主渲染函数（原版保留，增加灵动岛逻辑）
    // ================================================================

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

        // 设置背景
        var bgUrl = (member.background && member.background.trim().startsWith('http')) 
            ? member.background.trim() 
            : 'https://user-assets.sxlcdn.com/images/1138507/FmpO0QT0oZTcs8whHzHAjM_5Jss2.png?imageMogr2/strip/auto-orient/thumbnail/1200x9000%3E/quality/90!/format/png';
        modalContent.style.backgroundImage = 'url(' + bgUrl + ')';
        modalContent.style.backgroundSize = 'cover';
        modalContent.style.backgroundPosition = 'center';
        modalContent.style.backgroundBlendMode = 'normal';
        modalContent.classList.add('has-bg');

        // ---- 灵动岛逻辑 ----
        var islandData = getIslandContent(member);
        memberName = member.name || '成员';
        var hasLiveContent = !!(member.liveContent || member.islandContent);

        if (hasLiveContent && islandData) {
            islandContent = islandData.text || '内容';
            // 注册自定义场景
            var customScene = {
                icon: islandData.icon || '📱',
                text: islandData.text || '内容',
                badge: islandData.badge || '',
            };
            var sceneName = 'custom_' + Date.now();
            scenes[sceneName] = customScene;
            currentScene = sceneName;
            displayMode = 'content';

            // 执行展开动画
            var island = document.getElementById('dynamicIsland');
            var wrapper = document.getElementById('dynamicIslandWrapper');
            if (island && wrapper) {
                isVisible = true;
                islandState = 'compact';

                wrapper.classList.add('active');

                island.classList.remove('visible', 'state-compact');
                island.classList.add('state-hidden');
                island.style.width = '36px';
                island.style.height = '36px';
                island.style.opacity = '0';
                island.style.transform = 'scale(0.5)';
                island.style.pointerEvents = 'none';

                void island.offsetWidth;

                applyIslandUI();

                island.classList.remove('state-hidden');
                island.classList.add('state-compact', 'visible');
                island.style.width = getCompactWidth() + 'px';
                island.style.height = '36px';
                island.style.opacity = '1';
                island.style.transform = 'scale(1)';
                island.style.pointerEvents = 'auto';

                if (autoSwitchEnabled) startAutoSwitch();
            }
        } else {
            // 没有内容：确保隐藏
            isVisible = false;
            islandState = 'hidden';
            stopAutoSwitch();
            var island = document.getElementById('dynamicIsland');
            var wrapper = document.getElementById('dynamicIslandWrapper');
            if (island) {
                island.classList.remove('visible', 'state-compact');
                island.classList.add('state-hidden');
                island.style.width = '36px';
                island.style.height = '36px';
                island.style.opacity = '0';
                island.style.transform = 'scale(0.4)';
                island.style.pointerEvents = 'none';
            }
            if (wrapper) wrapper.classList.remove('active');
        }

        // ---- 渲染左右列（原版完全保留）----
        var leftHtml = [], rightHtml = [];
        var delay = 0.05;

        // 左栏
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

        // 右栏
        var rDelay = 0.06;

        // 工作室荣誉
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

        // 游戏荣誉
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

        // 作品数据
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

        // 组装
        var html = '<div class="modal-columns">';
        html += '<div class="column-left">' + leftHtml.join('') + '</div>';
        html += '<div class="column-right">' + rightHtml.join('') + '</div>';
        html += '</div>';
        modalInner.innerHTML = html;
    }

    // ================================================================
    // 公共 API
    // ================================================================

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
            // 重置
            isVisible = false;
            islandState = 'hidden';
            stopAutoSwitch();

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
                '<div style="padding:60px 20px;text-align:center;color:rgba(255,255,255,0.3);">未找到该成员档案</div>';
            modalOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    };

    // 暴露灵动岛控制（供调试）
    window.setIslandState = setIslandState;
    window.switchScene = switchScene;
    window.toggleAutoSwitch = toggleAutoSwitch;
    window.triggerBounce = triggerBounce;

    // ---- 关闭事件 ----
    document.addEventListener('DOMContentLoaded', function() {
        var modalClose = document.getElementById('modalClose');
        var modalOverlay = document.getElementById('modalOverlay');

        function closeModal() {
            modalOverlay.classList.remove('active');
            document.body.style.overflow = '';

            // 收拢灵动岛
            stopAutoSwitch();
            var island = document.getElementById('dynamicIsland');
            var wrapper = document.getElementById('dynamicIslandWrapper');
            if (island) {
                island.classList.remove('visible', 'state-compact');
                island.classList.add('state-hidden');
                island.style.width = '36px';
                island.style.height = '36px';
                island.style.opacity = '0';
                island.style.transform = 'scale(0.4)';
                island.style.pointerEvents = 'none';
            }
            if (wrapper) wrapper.classList.remove('active');
            islandState = 'hidden';
            isVisible = false;

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
