// 管理员查看所有提交结果
// 访问方式: https://你的域名.vercel.app/api/results

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

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
      '你觉得绿帽哥该死吗？'
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
      .sub-card { background:#fff; border:1px solid #e0dedb; border-radius:8px; padding:16px; margin-bottom:12px; }
      .sub-card .time { font-size:11px; color:#999; margin-bottom:8px; }
      .sub-card table { width:100%; border-collapse:collapse; font-size:13px; }
      .sub-card td { padding:4px 6px; border-bottom:1px solid #f0efe9; }
      .sub-card td:first-child { color:#888; width:36px; text-align:center; }
      .sub-card td:nth-child(2) { color:#555; width:40%; }
      .sub-card td:last-child { font-weight:600; color:#222; }
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
        html += '<div class="sub-card">';
        html += '<div class="time">#' + (ri + 1) + ' · ' + time + ' · <strong>' + qqName + '</strong> (' + qqNumber + ')</div>';
        html += '<table>';
        if (answers && Array.isArray(answers)) {
          answers.forEach(function(a, qi) {
            var qText = QUESTIONS[qi] || ('Q' + (qi + 1));
            var aText = (a.answer !== undefined && a.answer !== null && a.answer >= 0)
              ? a.answerText || ('选项' + 'ABCD'[a.answer])
              : '<span style="color:#ccc">(未答)</span>';
            html += '<tr><td>' + (qi + 1) + '</td><td>' + qText + '</td><td>' + aText + '</td></tr>';
          });
        }
        html += '</table></div>';
      });
    }

    html += '</body></html>';
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('<p>错误: ' + e.message + '</p>');
  }
}