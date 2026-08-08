// Vercel Serverless Function - 接收问卷提交
// 使用 Supabase 存储数据（免费）

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // 允许跨域（前端页面可能在不同域名下）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST 请求' });
  }

  try {
    const { answers, timestamp, userAgent, qqName, qqNumber, suggestion } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ error: '数据格式错误' });
    }

    if (!qqName || !qqNumber) {
      return res.status(400).json({ error: '请填写QQ名称和QQ号' });
    }

    // 从环境变量读取 Supabase 配置
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      // 开发环境降级：直接返回成功
      console.log('[DEV] 提交数据:', JSON.stringify({ answers, timestamp, userAgent }));
      return res.status(200).json({ success: true, note: '开发模式，数据未持久化' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('submissions')
      .insert([
        {
          qq_name: qqName,
          qq_number: qqNumber,
          answers: answers,
          suggestion: suggestion || '',
          submitted_at: timestamp || new Date().toISOString(),
          user_agent: userAgent || ''
        }
      ])
      .select();

    if (error) {
      console.error('Supabase 写入失败:', error);
      return res.status(500).json({ error: '存储失败' });
    }

    return res.status(200).json({ success: true, id: data?.[0]?.id });
  } catch (e) {
    console.error('提交处理异常:', e);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}