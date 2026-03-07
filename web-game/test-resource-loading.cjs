/**
 * 测试 Tuxemon 资源加载
 *
 * 运行方式：
 * node test-resource-loading.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('=== Tuxemon 资源加载测试 ===\n');

// 1. 检查目录结构
console.log('1. 检查目录结构...');
const tuxemonDir = path.join(__dirname, 'assets', 'tuxemon');

if (!fs.existsSync(tuxemonDir)) {
  console.error('❌ assets/tuxemon/ 目录不存在');
  process.exit(1);
}

const subdirs = ['monsters', 'techniques', 'items', 'npcs', 'maps', 'music', 'sounds', 'gfx'];
for (const subdir of subdirs) {
  const subdirPath = path.join(tuxemonDir, subdir);
  const exists = fs.existsSync(subdirPath);
  console.log(`   ${exists ? '✅' : '❌'} ${subdir}/`);
}

// 2. 检查怪物资源
console.log('\n2. 检查怪物资源...');
const monstersDir = path.join(tuxemonDir, 'monsters');
const monsterFiles = fs.readdirSync(monstersDir).filter(f => f.endsWith('.json'));
console.log(`   ✅ 发现 ${monsterFiles.length} 个怪物 JSON 文件`);

// 检查怪物模板
const templatePath = path.join(monstersDir, 'monster_templates.json');
if (fs.existsSync(templatePath)) {
  const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
  console.log(`   ✅ monster_templates.json 包含 ${templateData.length} 个怪物模板`);

  // 显示几个示例
  console.log('   示例怪物:');
  templateData.slice(0, 3).forEach(m => {
    console.log(`      - ${m.name} (${m.types.join(', ')}) - HP:${m.hp} ATK:${m.attack}`);
  });
} else {
  console.log('   ❌ monster_templates.json 不存在');
}

// 3. 检查技能资源
console.log('\n3. 检查技能资源...');
const techniquesDir = path.join(tuxemonDir, 'techniques');
const templatePath2 = path.join(techniquesDir, 'skill_templates.json');
if (fs.existsSync(templatePath2)) {
  const skillData = JSON.parse(fs.readFileSync(templatePath2, 'utf-8'));
  console.log(`   ✅ skill_templates.json 包含 ${skillData.length} 个技能模板`);

  // 显示几个示例
  console.log('   示例技能:');
  skillData.slice(0, 3).forEach(s => {
    console.log(`      - ${s.name} (${s.types?.[0] || 'normal'}) - 威力:${s.power} PP:${s.pp}`);
  });
} else {
  console.log('   ❌ skill_templates.json 不存在');
}

// 4. 检查怪物详细数据
console.log('\n4. 检查怪物详细数据...');
const sampleMonsterFiles = ['aardart.json', 'cardiling.json', 'dollfin.json'];
for (const filename of sampleMonsterFiles) {
  const monsterPath = path.join(monstersDir, filename);
  if (fs.existsSync(monsterPath)) {
    const monsterData = JSON.parse(fs.readFileSync(monsterPath, 'utf-8'));
    console.log(`   ✅ ${filename}:`);
    console.log(`      名称: ${monsterData.slug}`);
    console.log(`      类型: ${monsterData.types?.join(', ')}`);
    console.log(`      技能数: ${monsterData.moveset?.length || 0}`);
    if (monsterData.evolutions && monsterData.evolutions.length > 0) {
      console.log(`      进化: ${monsterData.evolutions[0].monster_slug} (Lv.${monsterData.evolutions[0].at_level})`);
    }
  } else {
    console.log(`   ❌ ${filename} 不存在`);
  }
}

console.log('\n=== 测试完成 ===');
console.log('\n下一步：');
console.log('1. 启动开发服务器测试游戏');
console.log('2. 打开浏览器控制台查看资源加载日志');
console.log('3. 使用 window.monsterDataLoader 和 window.techniqueDataLoader 测试');
