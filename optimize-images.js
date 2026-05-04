const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputDir = 'src/assets/images';
const outputDir = 'src/assets/images/optimized';

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function optimizeImages() {
  console.log('🚀 Starting image optimization with Sharp...');

  // Get all image files
  const files = fs.readdirSync(inputDir).filter(file =>
    /\.(jpg|jpeg|png)$/i.test(file)
  );

  console.log(`📁 Found ${files.length} images to optimize`);

  let totalOriginalSize = 0;
  let totalOptimizedSize = 0;
  let totalWebpSize = 0;

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    const webpPath = path.join(outputDir, file.replace(/\.(jpg|jpeg|png)$/i, '.webp'));

    try {
      console.log(`🔄 Optimizing: ${file}`);

      // Get original file size
      const originalSize = fs.statSync(inputPath).size;
      totalOriginalSize += originalSize;

      // Optimize JPEG images
      if (/\.jpe?g$/i.test(file)) {
        await sharp(inputPath)
          .jpeg({
            quality: 80,
            progressive: true,
            mozjpeg: true
          })
          .toFile(outputPath);
      }
      // Optimize PNG images
      else if (/\.png$/i.test(file)) {
        await sharp(inputPath)
          .png({
            quality: 80,
            compressionLevel: 6,
            palette: true
          })
          .toFile(outputPath);
      }

      // Convert to WebP for even better compression
      await sharp(inputPath)
        .webp({
          quality: 75,
          effort: 6
        })
        .toFile(webpPath);

      // Get new file sizes
      const optimizedSize = fs.statSync(outputPath).size;
      const webpSize = fs.statSync(webpPath).size;
      totalOptimizedSize += optimizedSize;
      totalWebpSize += webpSize;

      const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
      const webpSavings = ((originalSize - webpSize) / originalSize * 100).toFixed(1);

      console.log(`✅ ${file}:`);
      console.log(`   Original: ${(originalSize / 1024).toFixed(1)} KB`);
      console.log(`   Optimized: ${(optimizedSize / 1024).toFixed(1)} KB (${savings}% smaller)`);
      console.log(`   WebP: ${(webpSize / 1024).toFixed(1)} KB (${webpSavings}% smaller)`);

    } catch (error) {
      console.error(`❌ Error optimizing ${file}:`, error.message);
    }
  }

  // Summary
  const totalSavings = ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize * 100).toFixed(1);
  const totalWebpSavings = ((totalOriginalSize - totalWebpSize) / totalOriginalSize * 100).toFixed(1);

  console.log('\n🎉 Image optimization complete!');
  console.log(`📂 Optimized images saved to: ${outputDir}`);
  console.log(`📊 Total Results:`);
  console.log(`   Original: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Optimized: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)} MB (${totalSavings}% smaller)`);
  console.log(`   WebP: ${(totalWebpSize / 1024 / 1024).toFixed(2)} MB (${totalWebpSavings}% smaller)`);
}

optimizeImages().catch(console.error);
