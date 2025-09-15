const fs = require('fs');

console.log('=== Railway Directory Structure ===');
console.log('Root directory contents:');
fs.readdirSync('.').forEach(file => {
    const stats = fs.statSync(file);
    console.log(`${stats.isDirectory() ? 'DIR ' : 'FILE'} ${file}`);
});

console.log('\n=== Package.json Analysis ===');
try {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    console.log('Root package.json name:', pkg.name);
    console.log('Root package.json type:', pkg.type || 'commonjs');
    console.log('Root package.json main:', pkg.main);
    if (pkg.scripts) {
        console.log('Available scripts:', Object.keys(pkg.scripts));
    }
} catch (e) {
    console.log('No root package.json found');
}

console.log('\n=== Looking for Admin Bot ===');
['meowchi-admin-bot-v2', 'admin-bot', 'src'].forEach(dir => {
    try {
        const contents = fs.readdirSync(dir);
        console.log(`${dir}/ contents:`, contents);
        
        // Check for package.json in subdirectory
        try {
            const subPkg = JSON.parse(fs.readFileSync(`${dir}/package.json`, 'utf8'));
            console.log(`${dir}/package.json name:`, subPkg.name);
        } catch (e) {
            console.log(`${dir}/package.json: not found`);
        }
    } catch (e) {
        console.log(`${dir}/: not found`);
    }
});

console.log('\n=== All JS/JSON Files ===');
function findFiles(dir, prefix = '') {
    try {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = `${dir}/${file}`;
            try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                    findFiles(fullPath, prefix + file + '/');
                } else if (file.endsWith('.js') || file.endsWith('.json')) {
                    console.log(prefix + file);
                }
            } catch (e) {
                // Skip files we can't read
            }
        });
    } catch (e) {
        // Skip directories we can't read
    }
}
findFiles('.');
