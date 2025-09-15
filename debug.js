const fs = require('fs');
console.log('=== Railway Directory Structure ===');
console.log('Root directory contents:');
fs.readdirSync('.').forEach(file => console.log('-', file));
console.log('\nChecking for admin bot directory...');
try {
    const adminDir = fs.readdirSync('meowchi-admin-bot-v2');
    console.log('Admin bot directory contents:');
    adminDir.forEach(file => console.log('-', file));
} catch (e) {
    console.log('meowchi-admin-bot-v2 directory not found:', e.message);
}
