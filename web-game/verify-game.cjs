/**
 * 游戏功能验证脚本
 * 检查游戏是否能在浏览器中正常运行
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(50));
console.log('OpenClaw MMO 游戏功能验证');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

function check(name, condition, message) {
    if (condition) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}: ${message}`);
        failed++;
    }
}

// 1. 检查必需文件
console.log('\n[1] 检查必需文件:');
check('index.html 存在', fs.existsSync('index.html'), 'index.html 文件缺失');
check('dist/main.js 存在', fs.existsSync('dist/main.js'), 'dist/main.js 编译产物缺失');
check('MapParser.js 存在', fs.existsSync('dist/engine/MapParser.js'), '地图解析器缺失');

// 2. 检查地图文件
console.log('\n[2] 检查地图文件:');
check('azure_town.tmx 存在', fs.existsSync('assets/tuxemon/maps/azure_town.tmx'), '主地图文件缺失');
check('tilesets 目录存在', fs.existsSync('assets/tuxemon/tilesets'), 'tilesets 目录缺失');

// 3. 检查瓦片图片
console.log('\n[3] 检查瓦片图片:');
const tilesets = ['core_outdoor.png', 'core_buildings.png', 'core_indoor_floors.png', 'core_city_and_country.png'];
tilesets.forEach(ts => {
    check(`${ts} 存在`, fs.existsSync(`assets/tuxemon/tilesets/${ts}`), `瓦片集 ${ts} 缺失`);
});

// 4. 检查 Socket.IO
console.log('\n[4] 检查 Socket.IO:');
try {
    const mainContent = fs.readFileSync('dist/main.js', 'utf8');
    check('Socket.IO 客户端导入', mainContent.includes("from 'socket.io-client'"), 'Socket.IO 客户端未正确导入');
    check('Socket.IO 连接代码', mainContent.includes("io('http://localhost:3000')"), 'Socket.IO 连接代码缺失');
    check('player_join 事件', mainContent.includes("'player_join'"), '玩家加入事件处理缺失');
    check('player_move 事件', mainContent.includes("'player_move'"), '玩家移动事件处理缺失');
} catch (e) {
    check('main.js 读取', false, '无法读取 dist/main.js');
}

// 5. 检查 Socket.IO 服务器
console.log('\n[5] 检查 Socket.IO 服务器:');
check('SocketIOServer.js 存在', fs.existsSync('server/dist/SocketIOServer.js'), 'Socket.IO 服务器代码缺失');
check('服务器入口文件存在', fs.existsSync('server/dist/index.js'), '服务器入口文件缺失');

// 6. 检查游戏引擎
console.log('\n[6] 检查游戏引擎:');
const engineFiles = [
    'dist/engine/Game.js',
    'dist/engine/InputManager.js',
    'dist/engine/PlayerController.js',
    'dist/engine/DialogManager.js',
    'dist/engine/NPCManager.js',
    'dist/engine/CollisionManager.js'
];
engineFiles.forEach(file => {
    const name = path.basename(file);
    check(`${name} 存在`, fs.existsSync(file), `${name} 缺失`);
});

// 7. 检查服务器进程
console.log('\n[7] 检查服务器状态:');
const { execSync } = require('child_process');
try {
    const result = execSync('netstat -ano | grep ":8080"', { encoding: 'utf8' });
    check('HTTP 服务器运行', result.includes('LISTENING'), 'HTTP 服务器未在 8080 端口运行');
} catch (e) {
    check('HTTP 服务器运行', false, '无法检查端口 8080');
}

try {
    const result = execSync('netstat -ano | grep ":3000"', { encoding: 'utf8' });
    check('Socket.IO 服务器运行', result.includes('LISTENING'), 'Socket.IO 服务器未在 3000 端口运行');
} catch (e) {
    check('Socket.IO 服务器运行', false, '无法检查端口 3000');
}

// 总结
console.log('\n' + '='.repeat(50));
console.log(`验证完成: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50));

if (failed === 0) {
    console.log('\n🎉 所有检查通过！游戏应该可以在浏览器中正常运行。');
    console.log('📌 请在浏览器中访问: http://localhost:8080');
    console.log('📌 Socket.IO 测试页面: http://localhost:8080/test-socket.html');
} else {
    console.log('\n⚠️ 存在问题，请检查失败的项。');
    process.exit(1);
}
