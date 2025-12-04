import sharp from 'sharp';
import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';

// Create a simple icon with the app's blue color and corner fold
async function createIcon(size, isMaskable = false) {
  const cornerSize = Math.floor(size * 0.333);
  const borderRadius = isMaskable ? 0 : Math.floor(size * 0.1875); // 96/512 ratio
  
  // Create SVG for the icon
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      ${isMaskable 
        ? `<rect width="${size}" height="${size}" fill="#4A90E2"/>` 
        : `<rect width="${size}" height="${size}" rx="${borderRadius}" fill="#4A90E2"/>`
      }
      <path d="M${size} ${size - cornerSize}L${size - cornerSize} ${size}H${size}V${size - cornerSize}Z" fill="white" fill-opacity="0.3"/>
    </svg>
  `;
  
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  console.log('Generating PWA icons...');
  
  // Generate icons
  const icon192 = await createIcon(192);
  const icon512 = await createIcon(512);
  const iconMaskable512 = await createIcon(512, true);
  
  // Write to public folder
  await writeFile('public/icon-192.png', icon192);
  await writeFile('public/icon-512.png', icon512);
  await writeFile('public/icon-maskable-512.png', iconMaskable512);
  
  console.log('✓ Generated icon-192.png');
  console.log('✓ Generated icon-512.png');
  console.log('✓ Generated icon-maskable-512.png');
  console.log('Done!');
}

main().catch(console.error);

