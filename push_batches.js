const fs = require('fs');
const { execSync } = require('child_process');

const dir = 'Catalog_Images_Processed';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

const batchSize = 10;
let batch = [];
let batchIndex = 1;
const totalBatches = Math.ceil(files.length / batchSize);

// First commit .gitignore change
try {
    console.log('Committing .gitignore...');
    execSync('git add .gitignore', { stdio: 'inherit' });
    execSync('git commit -m "Allow tracking of Catalog_Images_Processed"', { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    console.log('.gitignore push successful\n');
} catch (e) {
    if (e.message.includes('nothing to commit')) {
        console.log('.gitignore already committed or no changes.');
    } else {
        console.error('Failed to commit/push .gitignore', e.message);
        // Dont exit, maybe branch is just up to date
    }
}

for (let i = 0; i < files.length; i++) {
    batch.push(files[i]);

    if (batch.length === batchSize || i === files.length - 1) {
        console.log(`\n============ Pushing batch ${batchIndex}/${totalBatches} ============`);

        try {
            for (const file of batch) {
                execSync(`git add "${dir}/${file}"`, { stdio: 'inherit' });
            }
            execSync(`git commit -m "Add product images batch ${batchIndex}/${totalBatches}"`, { stdio: 'inherit' });
            execSync(`git push origin main`, { stdio: 'inherit' });
            console.log(`✅ Successfully pushed batch ${batchIndex}`);
        } catch (e) {
            console.error(`❌ Failed at batch ${batchIndex}`);
            console.error(e.message);
            process.exit(1);
        }

        batch = [];
        batchIndex++;
    }
}

console.log('🎉 All images pushed successfully!');
