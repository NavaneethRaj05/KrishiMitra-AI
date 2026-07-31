const fs = require('fs');
const path = require('path');

function initMockAssets() {
  const assetsDir = path.join(__dirname, '../app/assets');
  const corpusDir = path.join(assetsDir, 'corpus');
  const modelsDir = path.join(assetsDir, 'models');

  // Create directories
  fs.mkdirSync(corpusDir, { recursive: true });
  fs.mkdirSync(modelsDir, { recursive: true });

  // 1. Create a dummy binary file for agri_fts.db (SQLite database)
  const dbPath = path.join(corpusDir, 'agri_fts.db');
  if (!fs.existsSync(dbPath)) {
    // Write a dummy SQLite database header (SQLite format 3 header prefix)
    const sqliteHeader = Buffer.from('SQLite format 3\0\x04\x00\x01\x01\x00@  \0\0\0\x01\0\0\0\x01\0\0\0\0\0\0\0\0', 'binary');
    fs.writeFileSync(dbPath, sqliteHeader);
    console.log(`✅ Created placeholder SQLite DB at ${dbPath}`);
  }

  // 2. Create dummy model files
  const models = ['crop_advisor.onnx', 'disease_detector.onnx', 'intent_classifier.onnx'];
  models.forEach((model) => {
    const modelPath = path.join(modelsDir, model);
    if (!fs.existsSync(modelPath)) {
      fs.writeFileSync(modelPath, Buffer.from('ONNX_MOCK_MODEL_DATA_VAL_VAANI'));
      console.log(`✅ Created dummy weights at ${modelPath}`);
    }
  });

  // 3. Create simple valid 1x1 pixel mock PNGs
  const dummyPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4340000000d49444154789cc260000100000c00011208c18f0000000049454e44ae426082', 'hex');
  const images = ['icon.png', 'splash.png', 'favicon.png'];
  images.forEach((img) => {
    const imgPath = path.join(assetsDir, img);
    if (!fs.existsSync(imgPath)) {
      fs.writeFileSync(imgPath, dummyPng);
      console.log(`✅ Created placeholder PNG asset at ${imgPath}`);
    }
  });

  console.log('🎉 Vaani mock assets initialized successfully.');
}

initMockAssets();
