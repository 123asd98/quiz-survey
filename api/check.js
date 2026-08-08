// 检查用户状态：是否有被批准的提议，是否有管理员回复
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { qq } = req.query;
  if (!qq) {
    return res.status(400).json({ error: '缺少QQ号' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ approved: false, reply: '' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查找该用户被批准的提议
    const { data: approvedData } = await supabase
      .from('submissions')
      .select('id')
      .eq('qq_number', qq)
      .eq('approved', true)
      .neq('suggestion', '')
      .order('submitted_at', { ascending: false })
      .limit(1);

    // 查找该用户的管理员回复
    const { data: replyData } = await supabase
      .from('submissions')
      .select('admin_reply')
      .eq('qq_number', qq)
      .neq('admin_reply', '')
      .order('submitted_at', { ascending: false })
      .limit(1);

    const approved = approvedData && approvedData.length > 0;
    const reply = (replyData && replyData.length > 0) ? replyData[0].admin_reply : '';

    return res.status(200).json({ approved, reply });
  } catch (e) {
    return res.status(200).json({ approved: false, reply: '' });
  }
}