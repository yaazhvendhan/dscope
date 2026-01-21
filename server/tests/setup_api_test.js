const fs = require('fs');
const path = require('path');
const testDir = path.join(__dirname, 'api_test_data');

if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
    fs.mkdirSync(path.join(testDir, 'logs'));
    fs.writeFileSync(path.join(testDir, 'logs', 'app.log'), 'test log content');
    fs.mkdirSync(path.join(testDir, 'cache'));
}
console.log(`Created ${testDir}`);
