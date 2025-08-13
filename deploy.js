const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// First, try to install fs-extra if it's missing
try {
  require('fs-extra');
} catch (e) {
  console.log('Installing fs-extra...');
  execSync('npm install fs-extra --save-dev', { stdio: 'inherit' });
}

// Now require fs-extra after ensuring it's installed
const fsExtra = require('fs-extra');

// Configuration
const buildDir = 'dist'; // or 'build' depending on your setup
const deployBranch = 'gh-pages';

// Log current directory to debug
console.log('Current directory:', process.cwd());

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error(`Error: Build directory "${buildDir}" not found!`);
  console.log('Make sure to run "npm run build" first or check your build directory name.');
  process.exit(1);
}

// Temporary directory for deployment (much shorter path)
const tempDir = path.join('C:', 'temp', 'gh-pages-deploy');
console.log('Using temporary directory:', tempDir);

try {
  // Create C:\temp if it doesn't exist
  if (!fs.existsSync('C:\\temp')) {
    console.log('Creating C:\\temp directory...');
    fs.mkdirSync('C:\\temp', { recursive: true });
  }

  // Clean up any existing temp directory
  if (fs.existsSync(tempDir)) {
    console.log('Removing existing temp directory...');
    fsExtra.removeSync(tempDir);
  }
  
  console.log('Creating temp directory...');
  fsExtra.ensureDirSync(tempDir);
  
  console.log('Building project...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Copying build files to temp directory...');
  console.log(`Copying from ${buildDir} to ${tempDir}`);
  
  // List files in the build directory to debug
  console.log('Files in build directory:');
  fs.readdirSync(buildDir).forEach(file => {
    console.log(`- ${file}`);
  });
  
  // Use plain fs instead of fs-extra if having issues
  const copyDir = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  // Copy build directory to temp directory
  copyDir(buildDir, tempDir);
  
  // Copy CNAME file if it exists
  const cnameFiles = [
    'public/CNAME',
    'CNAME',
    `${buildDir}/CNAME`
  ];
  
  for (const cnameFile of cnameFiles) {
    if (fs.existsSync(cnameFile)) {
      console.log(`Copying CNAME from ${cnameFile}...`);
      fs.copyFileSync(cnameFile, path.join(tempDir, 'CNAME'));
      break;
    }
  }
  
  // Check if CNAME was copied
  if (!fs.existsSync(path.join(tempDir, 'CNAME'))) {
    console.log('Creating CNAME file manually...');
    fs.writeFileSync(path.join(tempDir, 'CNAME'), 'ccode.me');
  }
  
  console.log('Initializing git in temp directory...');
  process.chdir(tempDir);
  execSync('git init', { stdio: 'inherit' });
  execSync('git add .', { stdio: 'inherit' });
  execSync('git config user.name "GitHub Actions"', { stdio: 'inherit' });
  execSync('git config user.email "actions@github.com"', { stdio: 'inherit' });
  execSync('git commit -m "Deploy to GitHub Pages"', { stdio: 'inherit' });
  
  // Push to GitHub Pages
  console.log('Pushing to GitHub Pages...');
  execSync(
    `git push --force https://github.com/CodeCraftman2/CodeCraftman2.github.io.git HEAD:${deployBranch}`,
    { stdio: 'inherit' }
  );
  
  console.log('Deployed successfully!');
  
  // Return to original directory
  process.chdir(path.resolve(__dirname));
  
  // Clean up
  console.log('Cleaning up...');
  fsExtra.removeSync(tempDir);
} catch (err) {
  console.error('Deployment failed:');
  console.error(err);
  
  // Additional debugging
  if (err.message && err.message.includes('ENOENT')) {
    console.error('\nFile not found error details:');
    console.error(err.message);
    console.error('\nPlease check:');
    console.error('1. Build directory exists (should be "dist" or "build")');
    console.error('2. fs-extra is installed (npm install fs-extra --save-dev)');
    console.error('3. Temporary directory is writable (C:\\temp)');
  }
  
  process.exit(1);
}
