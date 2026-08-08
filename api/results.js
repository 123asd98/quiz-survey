// 管理员查看所有提交结果
// 支持: 删除(?del=id) / 批准(?approve=id) / 回复(?reply=id&text=xxx)

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 预检
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔐 密码验证
  const password = process.env.RESULTS_PASSWORD;
  const inputPwd = req.query.pwd || '';

  if (password && inputPwd !== password) {
    return res.status(200).send(`
      <html><head><meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <title>密码验证</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:"Microsoft YaHei",sans-serif; background:#f5f5f4; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:20px; }
        .box { background:#fff; border:1px solid #e0dedb; border-radius:10px; padding:32px 24px; text-align:center; max-width:360px; width:100%; }
        .box h2 { color:#b71c1c; margin-bottom:12px; font-size:18px; }
        .box p { color:#666; font-size:13px; margin-bottom:20px; }
        .box input { width:100%; padding:12px 14px; border:1px solid #e0dedb; border-radius:6px; font-size:14px; outline:none; margin-bottom:14px; }
        .box input:focus { border-color:#0b57d0; }
        .box button { width:100%; padding:12px; background:#0b57d0; color:#fff; border:none; border-radius:6px; font-size:14px; cursor:pointer; }
        .box .err { color:#b71c1c; font-size:12px; margin-top:10px; }
      </style>
      </head><body>
      <div class="box">
        <h2>🔒 问卷结果</h2>
        <p>请输入管理密码查看</p>
        <input type="password" id="pwdInput" placeholder="输入密码" onkeydown="if(event.key==='Enter')check()">
        <button onclick="check()">验证</button>
        <div class="err" id="errMsg"></div>
      </div>
      <script>
        function check() {
          var pwd = document.getElementById('pwdInput').value;
          if (!pwd) return;
          location.href = location.pathname + '?pwd=' + encodeURIComponent(pwd);
        }
      </script>
      </body></html>
    `);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).send(`
      <html><body style="font-family:sans-serif;padding:40px;background:#f5f5f4;">
        <h2>📋 问卷结果</h2>
        <p>未配置 Supabase，当前无数据存储。</p>
        <p>请配置环境变量 SUPABASE_URL 和 SUPABASE_KEY。</p>
      </body></html>
    `);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🗑️ 删除操作
    if (req.query.del) {
      const id = req.query.del;
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // ✅ 批准操作
    if (req.query.approve) {
      const id = req.query.approve;
      const { error } = await supabase.from('submissions').update({ approved: true }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // 📬 回复操作
    if (req.query.reply) {
      const id = req.query.reply;
      const text = req.query.text || '';
      const { error } = await supabase.from('submissions').update({ admin_reply: text }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    }

    // 查询所有数据
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      return res.status(500).send(`<p>查询失败: ${error.message}</p>`);
    }

    const QUESTIONS = [
      '发现有人落水，你应该？',
      '群主更新的主要时间是？',
      '你希望群里面全体小说作家吗？',
      '瑟瑟大王普遍发？',
      '群友溺水了，你应该？',
      '群里面的风气是？',
      '当你在平台刷到了群友的小说时？',
      '当你发现有人恶意书评，你感觉评论者是？',
      '当你发现曼波溺水了以后？',
      '三个群的群友全部掉进了水里，你选择？',
      '你觉得绿帽哥该死吗？',
      '你觉得Shark对小小人鼠是真心的吗？',
      '你更喜欢叫群主什么？',
      '你更喜欢叫小小人鼠什么？',
      '你更喜欢叫我什么？',
      '你是小小人鼠，你在某天突然感觉被监视了，你决定？'
    ];

    let html = `
    <html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>问卷结果统计</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:"Microsoft YaHei",sans-serif; background:#f5f5f4; padding:20px; color:#333; }
      h1 { color:#b71c1c; margin-bottom:6px; font-size:22px; }
      .count { color:#888; font-size:13px; margin-bottom:20px; }
      .sub-card { background:#fff; border:1px solid #e0dedb; border-radius:8px; padding:16px; margin-bottom:12px; position:relative; }
      .sub-card .time { font-size:11px; color:#999; margin-bottom:8px; padding-right:70px; }
      .sub-card table { width:100%; border-collapse:collapse; font-size:13px; }
      .sub-card td { padding:4px 6px; border-bottom:1px solid #f0efe9; }
      .sub-card td:first-child { color:#888; width:36px; text-align:center; }
      .sub-card td:nth-child(2) { color:#555; width:40%; }
      .sub-card td:last-child { font-weight:600; color:#222; }
      .sugg { margin-top:10px; background:#fff8e1; border:1px solid #ffe082; border-radius:6px; padding:8px 10px; font-size:12px; color:#8d6e00; }
      .sugg b { color:#6d4c00; }
      .admin-box { margin-top:8px; background:#e8f5e9; border:1px solid #a5d6a7; border-radius:6px; padding:8px 10px; font-size:12px; color:#2e7d32; }
      .approved-badge { color:#2e7d32; font-weight:700; }
      .actions { margin-top:10px; display:flex; gap:8px; flex-wrap:wrap; }
      .act-btn { border:none; border-radius:5px; padding:5px 12px; font-size:11px; cursor:pointer; color:#fff; }
      .act-del { background:#b71c1c; }
      .act-del:hover { background:#8e1414; }
      .act-appr { background:#2e7d32; }
      .act-appr:hover { background:#1b5e20; }
      .act-reply { background:#0b57d0; }
      .act-reply:hover { background:#0842a0; }
      .reply-input { width:100%; padding:6px 10px; border:1px solid #e0dedb; border-radius:5px; font-size:12px; margin-top:6px; font-family:inherit; }
      .no-data { text-align:center; padding:60px 20px; color:#999; }
      .refresh { display:inline-block; margin-top:10px; padding:8px 20px; background:#0b57d0; color:#fff; text-decoration:none; border-radius:6px; font-size:13px; }
    </style>
    </head><body>
    <h1>📋 问卷结果</h1>
    <div class="count">共收到 <strong>${data.length}</strong> 份提交</div>
    <a href="javascript:location.reload()" class="refresh">🔄 刷新</a>
    `;

    if (data.length === 0) {
      html += '<div class="no-data">暂无提交数据</div>';
    } else {
      data.forEach(function(row, ri) {
        var answers = row.answers;
        var time = row.submitted_at ? new Date(row.submitted_at).toLocaleString('zh-CN') : '未知时间';
        var qqName = row.qq_name || '';
        var qqNumber = row.qq_number || '';
        var suggestion = row.suggestion || '';
        var adminReply = row.admin_reply || '';
        var approved = !!row.approved;
        var rowId = row.id || '';
        html += '<div class="sub-card" id="card-' + rowId + '">';
        html += '<div class="time">#' + (ri + 1) + ' · ' + time + ' · <strong>' + qqName + '</strong> (' + qqNumber + ')' + (approved ? ' <span class="approved-badge">✅ 已批准</span>' : '') + '</div>';
        html += '<table>';
        if (answers && Array.isArray(answers)) {
          answers.forEach(function(a, qi) {
            var qText = QUESTIONS[qi] || ('Q' + (qi + 1));
            var aText = (a.answer !== undefined && a.answer !== null && a.answer >= 0)
              ? a.answerText || ('选项' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[a.answer])
              : '<span style="color:#ccc">(未答)</span>';
            html += '<tr><td>' + (qi + 1) + '</td><td>' + qText + '</td><td>' + aText + '</td></tr>';
          });
        }
        html += '</table>';
        if (suggestion) {
          html += '<div class="sugg"><b>💬 意见：</b>' + suggestion.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
        }
        if (adminReply) {
          html += '<div class="admin-box">📬 <b>已回复：</b>' + adminReply.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
        }
        html += '<div class="actions">';
        html += '<button class="act-btn act-del" onclick="delRow(\'' + rowId + '\')">✕ 删除</button>';
        if (!approved) {
          html += '<button class="act-btn act-appr" onclick="approveRow(\'' + rowId + '\')">✅ 批准</button>';
        }
        html += '</div>';
        html += '<div class="admin-box" style="background:#e3f2fd;border-color:#90caf9;color:#0b57d0;">';
        html += '<b>📬 回复意见：</b>';
        html += '<input class="reply-input" id="reply-' + rowId + '" placeholder="输入回复内容，回复后该用户下次填写会看到">';
        html += '<button class="act-btn act-reply" style="margin-top:6px;" onclick="replyRow(\'' + rowId + '\')">发送回复</button>';
        html += '</div>';
        html += '</div>';
      });
    }

    html += '<script>' +
      'function delRow(id){' +
        'if(!confirm("确定删除这条记录吗？"))return;' +
        'var xhr=new XMLHttpRequest();' +
        'xhr.open("GET", location.pathname + "?pwd=" + encodeURIComponent("'+inputPwd+'") + "&del=" + id, true);' +
        'xhr.onload=function(){ if(xhr.status===200){ location.reload(); } else { alert("删除失败"); } };' +
        'xhr.onerror=function(){ alert("网络错误"); };' +
        'xhr.send();' +
      '}' +
      'function approveRow(id){' +
        'if(!confirm("批准这条提议？批准后该用户下次填写会看到「您的想法被加入了」"))return;' +
        'var xhr=new XMLHttpRequest();' +
        'xhr.open("GET", location.pathname + "?pwd=" + encodeURIComponent("'+inputPwd+'") + "&approve=" + id, true);' +
        'xhr.onload=function(){ if(xhr.status===200){ location.reload(); } else { alert("批准失败"); } };' +
        'xhr.onerror=function(){ alert("网络错误"); };' +
        'xhr.send();' +
      '}' +
      'function replyRow(id){' +
        'var text=document.getElementById("reply-"+id).value;' +
        'if(!text){ alert("请输入回复内容"); return; }' +
        'var xhr=new XMLHttpRequest();' +
        'xhr.open("GET", location.pathname + "?pwd=" + encodeURIComponent("'+inputPwd+'") + "&reply=" + id + "&text=" + encodeURIComponent(text), true);' +
        'xhr.onload=function(){ if(xhr.status===200){ location.reload(); } else { alert("回复失败"); } };' +
        'xhr.onerror=function(){ alert("网络错误"); };' +
        'xhr.send();' +
      '}' +
    '</script>';
    html += '</body></html>';
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('<p>错误: ' + e.message + '</p>');
  }
}