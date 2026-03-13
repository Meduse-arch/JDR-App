const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Rename resource variables
    content = content.replace(/\bhp_actuel\b/g, 'hp');
    content = content.replace(/\bmana_actuel\b/g, 'mana');
    content = content.replace(/\bstam_actuel\b/g, 'stam');

    // 2. Modify specific selects to use the view v_personnages
    content = content.replace(/from\('personnages'\)(\s*\n*\s*)\.select/g, "from('v_personnages')$1.select");

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated: ' + filePath);
    }
  }
});
