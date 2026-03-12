const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
const outputDir = path.join(__dirname, '../public/icons');
const publicDir = path.join(__dirname, '../public');

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);

    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate favicons from diamond.svg (no white background)
  const diamondSvg = path.join(publicDir, 'diamond.svg');

  // Generate favicon (32x32)
  await sharp(diamondSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('Generated: favicon.png');

  // Generate favicon-16 for tab icon
  await sharp(diamondSvg)
    .resize(16, 16)
    .png()
    .toFile(path.join(publicDir, 'favicon-16x16.png'));
  console.log('Generated: favicon-16x16.png');

  // Generate favicon-32 for tab icon
  await sharp(diamondSvg)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('Generated: favicon-32x32.png');

  console.log('All icons generated successfully!');
}

generateIcons().catch(console.error);
