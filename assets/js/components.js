// ============================================================
// components.js – 成员档案弹窗逻辑（独立于主站）
// 依赖全局变量：_memberData, _mapData, _blogData
// 提供函数：openMemberModal(name)
// ============================================================

(function() {
    'use strict';

    var overlay = document.getElementById('modalOverlay');
    var closeBtn = document.getElementById('modalClose');
    var bodyContainer = document.getElementById('modalBody');

    if (!overlay || !closeBtn || !bodyContainer) {
        console.warn('弹窗元素缺失');
        return;
    }

    function closeModal() {
        overlay.classList.remove('active');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeModal();
    });

    // ============================================================
    // 编号解析（取前10位）
    // ============================================================
    function parseId(idStr) {
        if (!idStr || idStr.length < 10) {
            return { attr: '未知', game: '未知', joinDate: '未知', group1: '未加入', group2: '未加入' };
        }
        var digits = idStr.replace(/\D/g, '');
        if (digits.length < 10) {
            return { attr: '未知', game: '未知', joinDate: '未知', group1: '未加入', group2: '未加入' };
        }
        var code = digits.slice(0, 10);
        var attrCode = parseInt(code.charAt(0));
        var gameCode = parseInt(code.charAt(1));
        var year = parseInt(code.slice(2, 4));
        var month = parseInt(code.slice(4, 6));
        var day = parseInt(code.slice(6, 8));
        var g1 = parseInt(code.charAt(8));
        var g2 = parseInt(code.charAt(9));

        var attrMap = { 1: '正式成员', 2: '外部成员', 3: '特招成员' };
        var gameMap = { 1: '迷你世界', 2: 'Minecraft', 3: '迷你世界、Minecraft' };
        var groupMap = { 1: '建筑组', 2: '玩法组', 3: '模型组', 4: '编辑组' };

        var attr = attrMap[attrCode] || '未知';
        var game = gameMap[gameCode] || '未知';
        var joinDate = (year > 0 && month > 0 && day > 0) ?
            '20' + String(year).padStart(2, '0') + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0') :
            '未知';
        var group1 = groupMap[g1] || '未加入';
        var group2 = groupMap[g2] || '未加入';

        return { attr, game, joinDate, group1, group2 };
    }

    // ============================================================
    // 荣誉解析
    // ============================================================
    function parseHonors(str) {
        if (!str) return [];
        var items = str.split(/[,，、\s]+/).filter(function(s) { return s.trim().length > 0; });
        var result = [];
        items.forEach(function(item) {
            var match = item.match(/\[(\d)\]\s*(.+)/);
            if (match) {
                var rank = parseInt(match[1]);
                var name = match[2].trim();
                if (rank >= 1 && rank <= 5) {
                    result.push({ rank: rank, name: name });
                }
            }
        });
        result.sort(function(a, b) { return a.rank - b.rank; });
        return result;
    }

    // ============================================================
    // 获取成员的地图和博客（通过作者精确匹配）
    // ============================================================
    function getMemberMaps(memberName, allMaps) {
        if (!allMaps) return [];
        return allMaps.filter(function(map) {
            return map.author && map.author.trim() === memberName.trim();
        }).sort(function(a, b) {
            return new Date(b.date) - new Date(a.date);
        });
    }

    function getMemberBlogs(memberName, allBlogs) {
        if (!allBlogs) return [];
        return allBlogs.filter(function(blog) {
            return blog.author && blog.author.trim() === memberName.trim();
        }).sort(function(a, b) {
            return new Date(b.date) - new Date(a.date);
        });
    }

    // ============================================================
    // 打开弹窗
    // ============================================================
    window.openMemberModal = function(name) {
        var members = window._memberData || [];
        var maps = window._mapData || [];
        var blogs = window._blogData || [];

        var member = members.find(function(m) { return m.name === name; });
        if (!member) {
            bodyContainer.innerHTML = '<p style="color:#4a5a6a;">未找到成员信息</p>';
            overlay.style.display = 'flex';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            return;
        }

        var idInfo = parseId(member.id);

        // 荣誉解析（从 member 对象中读取 workHonors 和 gameHonors）
        var workHonors = parseHonors(member.workHonors || '');
        var gameHonors = parseHonors(member.gameHonors || '');

        var memberMaps = getMemberMaps(member.name, maps);
        var memberBlogs = getMemberBlogs(member.name, blogs);

        // ---- 左栏 ----
        var avatarHtml = (member.avatar && member.avatar.trim().startsWith('http')) ?
            '<img src="' + member.avatar.trim() + '" alt="' + member.name + '" loading="lazy">' :
            member.name.charAt(0);

        var badgeClass = '';
        if (idInfo.attr === '正式成员') badgeClass = 'green';
        else if (idInfo.attr === '外部成员') badgeClass = 'blue';
        else if (idInfo.attr === '特招成员') badgeClass = 'purple';

        var groups = [];
        if (idInfo.group1 !== '未加入') groups.push(idInfo.group1);
        if (idInfo.group2 !== '未加入') groups.push(idInfo.group2);
        var groupsHtml = groups.length ?
            groups.map(function(g) { return '<span class="group-tag">' + g + '</span>'; }).join('') :
            '<span class="group-tag placeholder">未加入任何组</span>';

        function honorHtml(records) {
            if (!records.length) return '<div class="honor-empty">似乎什么都没有呢</div>';
            var html = '<div class="honor-list">';
            records.forEach(function(h) {
                html += '<span class="honor-tag rank-' + h.rank + '">[' + h.rank + '] ' + h.name + '</span>';
            });
            html += '</div>';
            return html;
        }
        var workHonorHtml = honorHtml(workHonors);
        var gameHonorHtml = honorHtml(gameHonors);

        var islandHtml = '';
        if (member.liveType && member.liveContent) {
            var contentHtml = '';
            if (member.liveType === '留言') {
                contentHtml = '<div class="island-content">' + member.liveContent + '</div>';
            } else if (member.liveType === '音乐') {
                contentHtml = '<div class="island-content"><audio controls src="' + member.liveContent + '"></audio></div>';
            } else if (member.liveType === '动画') {
                contentHtml = '<div class="island-content"><div class="animation-box ' + member.liveContent + '">动画效果</div></div>';
            }
            if (contentHtml) {
                islandHtml = '<div class="live-island"><div class="island-type"><i class="fas fa-bolt"></i> 灵动岛 · ' + member.liveType + '</div>' + contentHtml + '</div>';
            }
        }

        var bioHtml = member.bio ? '<div class="member-bio">' + member.bio + '</div>' : '';

        var leftHtml = `
            <div class="left-card">
                <div class="member-avatar-lg">${avatarHtml}</div>
                <div class="member-name-lg">${member.name}</div>
                <div class="member-role-lg">${member.role || '成员'}</div>
                ${badgeClass ? '<div class="member-badge-lg '+badgeClass+'">'+idInfo.attr+'</div>' : ''}
                <div class="detail-row"><i class="fas fa-id-card"></i><span class="label">编号</span><span class="value">${member.id}</span></div>
                <div class="detail-row"><i class="fas fa-user-tag"></i><span class="label">属性</span><span class="value">${idInfo.attr}</span></div>
                <div class="detail-row"><i class="fas fa-gamepad"></i><span class="label">游戏</span><span class="value">${idInfo.game}</span></div>
                <div class="detail-row"><i class="fas fa-calendar-alt"></i><span class="label">入室日期</span><span class="value">${idInfo.joinDate}</span></div>
                <div class="detail-row"><i class="fas fa-users"></i><span class="label">组别</span></div>
                <div class="group-tags">${groupsHtml}</div>
                <div class="detail-row"><i class="fas fa-hashtag"></i><span class="label">迷你号</span><span class="value">${member.minid || '未知'}</span></div>
                ${bioHtml}
            </div>
            <div class="left-card">
                <div style="font-weight:600;font-size:14px;color:#1a2a3a;margin-bottom:4px;">工作室荣誉</div>
                ${workHonorHtml}
            </div>
            <div class="left-card">
                <div style="font-weight:600;font-size:14px;color:#1a2a3a;margin-bottom:4px;">游戏荣誉</div>
                ${gameHonorHtml}
            </div>
            ${islandHtml ? '<div class="left-card">' + islandHtml + '</div>' : ''}
        `;

        // ---- 右栏 ----
        function mapItemsHtml(items) {
            if (!items.length) return '<div class="item-empty">似乎什么都没有呢</div>';
            var html = '';
            items.forEach(function(item) {
                var coverHtml = (item.cover && item.cover.trim().startsWith('http')) ?
                    '<img class="item-cover" src="' + item.cover + '" alt="' + item.title + '" loading="lazy">' :
                    '<div class="item-cover-placeholder"><i class="fas fa-map"></i></div>';
                var featured = item.title.startsWith('[精选]') ? '<span class="featured">精选</span>' : '';
                var titleDisplay = item.title.replace(/^\[精选\]/, '').trim();
                var tagHtml = item.tag ? '<span class="tag">' + item.tag + '</span>' : '';
                var dateHtml = (item.date && item.date !== '未知') ? '<span class="date"><i class="far fa-calendar-alt"></i> ' + item.date + '</span>' : '';
                html += `
                    <div class="item-card" onclick="window.open('https://jgcgzs.github.io/acns/map/?id=${item.id}','_blank')">
                        ${coverHtml}
                        <div class="item-title">${featured} ${titleDisplay}</div>
                        <div class="item-meta">
                            <span class="author"><i class="fas fa-user"></i> ${item.author || '未知作者'}</span>
                            ${tagHtml}
                            ${dateHtml}
                        </div>
                    </div>
                `;
            });
            return html;
        }

        function blogItemsHtml(items) {
            if (!items.length) return '<div class="item-empty">似乎什么都没有呢</div>';
            var html = '';
            items.forEach(function(item) {
                var dateHtml = (item.date && item.date !== '未知') ? '<span class="date"><i class="far fa-calendar-alt"></i> ' + item.date + '</span>' : '';
                var catHtml = item.category ? '<span class="tag">' + item.category + '</span>' : '';
                html += `
                    <div class="item-card" onclick="window.open('https://jgcgzs.github.io/acns/blog/post.html?id=${item.id}','_blank')">
                        <div class="item-title">${item.title}</div>
                        <div class="item-meta">
                            <span class="author"><i class="fas fa-user"></i> ${item.author || '未知作者'}</span>
                            ${catHtml}
                            ${dateHtml}
                        </div>
                    </div>
                `;
            });
            return html;
        }

        var rightHtml = `
            <div class="right-section">
                <div class="section-label">地图作品 <span class="count">${memberMaps.length}</span></div>
                ${mapItemsHtml(memberMaps)}
            </div>
            <div class="right-section">
                <div class="section-label">博客文章 <span class="count">${memberBlogs.length}</span></div>
                ${blogItemsHtml(memberBlogs)}
            </div>
        `;

        var fullHtml = `<div class="modal-inner"><div class="modal-left">${leftHtml}</div><div class="modal-right">${rightHtml}</div></div>`;
        bodyContainer.innerHTML = fullHtml;

        overlay.style.display = 'flex';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };
})();
