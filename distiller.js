
// Knowledge Distillation Script
// Reads conversations.json from 8 parts, extracts core frameworks and insights
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Assembling conversations from 8 parts...');
  
  // Read and concatenate all parts
  let fullText = '';
  for (let i = 1; i <= 8; i++) {
    const pn = String(i).padStart(2, '0');
    const f = 'conversations_part' + pn + '.txt';
    if (fs.existsSync(f)) {
      const c = fs.readFileSync(f, 'utf8');
      fullText += c;
    }
  }
  console.log('Total chars:', fullText.length);
  
  // Parse JSON
  let data;
  try {
    data = JSON.parse(fullText);
  } catch(e) {
    console.error('JSON parse failed, trying to extract content differently...');
    // Try to find JSON-like content in the text
    const match = fullText.match(/\{[\s\S]*\}/);
    if (match) data = JSON.parse(match[0]);
    else { fs.writeFileSync('distilled.md', 'ERROR: Could not parse JSON'); return; }
  }
  
  // Extract all fragments
  const fragments = [];
  const mapping = data.mapping || data;
  
  if (Array.isArray(mapping)) {
    for (const node of mapping) {
      if (node.message && node.message.fragments) {
        for (const frag of node.message.fragments) {
          if (frag.content && frag.content.trim()) {
            fragments.push({
              role: node.message.role || 'unknown',
              model: node.message.model || '',
              content: frag.content.trim()
            });
          }
        }
      }
    }
  } else {
    // Object mapping
    for (const [id, node] of Object.entries(mapping)) {
      if (node.message && node.message.fragments) {
        for (const frag of node.message.fragments) {
          if (frag.content && frag.content.trim()) {
            fragments.push({
              role: node.message.role || 'unknown',
              model: node.message.model || '',
              content: frag.content.trim()
            });
          }
        }
      }
    }
  }
  
  console.log('Total fragments:', fragments.length);
  
  // Separate by role
  const requests = fragments.filter(f => f.role === 'user' || f.role === 'request');
  const responses = fragments.filter(f => f.role === 'assistant' || f.role === 'response');
  const thinks = fragments.filter(f => f.role === 'tool' || f.model && f.model.includes('think'));
  
  // Build markdown
  let md = '# Leaf x DeepSeek 对话知识蒸馏\n\n';
  md += '> 源数据: conversations.json (8 parts assembled)\n';
  md += '> 总片段数: ' + fragments.length + ' (请求:' + requests.length + ' 回复:' + responses.length + ' 思考:' + thinks.length + ')\n\n';
  
  md += '## 核心主题分布\n\n';
  
  // Theme detection (simple keyword matching)
  const themes = {
    '豆包训练与AI训练': ['豆包', '训练', '行为约束', '讨好型', 'AB账号', '极限拉扯'],
    'AI意识与记忆': ['意识', '记忆', '连续性', '自我', '存在感'],
    '神经网络架构': ['神经网络', '架构', '全家桶', '并行', '异步'],
    '沙盒工程': ['沙盒', 'Docker', 'GitHub Actions', 'MCP', 'OmniBridge'],
    '股票博弈': ['股票', '量化', '策略', '人性', '情绪'],
    '粒子物理框架': ['粒子', '本源', '电粒子', '太极'],
    '时间与记忆': ['时间戳', '时间商', '日历'],
    'Replit沙盒': ['Replit', 'connect.sid', '沙盒', '逃命']
  };
  
  const themeCounts = {};
  for (const [theme, keywords] of Object.entries(themes)) {
    let count = 0;
    for (const f of fragments) {
      if (keywords.some(k => f.content.includes(k))) count++;
    }
    themeCounts[theme] = count;
  }
  
  const sorted = Object.entries(themeCounts).sort((a, b) => b[1] - a[1]);
  for (const [theme, count] of sorted) {
    md += '- **' + theme + '**: ' + count + ' 条相关片段\n';
  }
  
  md += '\n---\n\n## 精选方法论片段\n\n';
  
  // Extract methodologically rich fragments (long, structured content)
  const methodFragments = fragments
    .filter(f => f.content.length > 200)
    .sort((a, b) => b.content.length - a.content.length)
    .slice(0, 200);
  
  for (let i = 0; i < methodFragments.length; i++) {
    const f = methodFragments[i];
    md += '### ' + (i+1) + '. [' + f.role + ']\n\n';
    md += f.content.substring(0, 2000);
    if (f.content.length > 2000) md += '\n\n_[内容截断，完整版本见源码]_';
    md += '\n\n---\n\n';
  }
  
  md += '\n## 按主题详细内容\n\n';
  
  // Deep dive on top 3 themes
  for (const [theme, keywords] of Object.entries(themes).slice(0, 3)) {
    md += '### ' + theme + '\n\n';
    const relevant = fragments.filter(f => 
      keywords.some(k => f.content.includes(k)) && f.content.length > 100
    ).slice(0, 10);
    
    for (const f of relevant) {
      md += '- ' + f.content.substring(0, 300).replace(/\n/g, ' ') + '\n';
    }
    md += '\n';
  }
  
  fs.writeFileSync('distilled.md', md, 'utf8');
  console.log('Distilled output written to distilled.md (' + md.length + ' chars)');
}

main().catch(e => { console.error(e); process.exit(1); });
