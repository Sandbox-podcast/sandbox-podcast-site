/** Reprend l'habillage de .tape dans sandbox-room-content.module.css, à l'échelle 4. */
export function drawSandboxProjectCover(
  ctx: CanvasRenderingContext2D,
  project: { name: string; color: string },
  image: HTMLImageElement | undefined,
  fontFamily: string,
) {
  const width = 66;
  const height = 98;
  ctx.scale(4, 4);
  ctx.fillStyle = '#18191b';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(3, 1, width - 4, height - 2);
  ctx.clip();
  ctx.fillStyle = '#172534';
  ctx.fillRect(3, 1, width - 4, height - 2);
  if (image) {
    const scale = Math.max((width - 4) / image.naturalWidth, (height - 2) / image.naturalHeight);
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    ctx.drawImage(
      image,
      3 + (width - 4 - imageWidth) / 2,
      (height - imageHeight) / 2,
      imageWidth,
      imageHeight,
    );
  } else {
    ctx.fillStyle = project.color;
    ctx.font = `700 20px ${fontFamily}`;
    ctx.fillText(project.name.slice(0, 2), 8, 52);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, height);
  shade.addColorStop(0.5, '#080e1800');
  shade.addColorStop(0.75, '#080e18c9');
  shade.addColorStop(1, '#080e18');
  ctx.fillStyle = shade;
  ctx.fillRect(3, 1, width - 4, height - 2);
  ctx.fillStyle = '#0b141be8';
  ctx.fillRect(3, 1, width - 4, 8);
  ctx.fillStyle = project.color;
  ctx.fillRect(3, 9, width - 4, 1);
  ctx.fillStyle = '#fff5df';
  ctx.textBaseline = 'top';
  ctx.font = `400 4px ${fontFamily}`;
  ctx.fillText('SANDBOX', 5, 3);
  ctx.font = `800 4px ${fontFamily}`;
  ctx.textAlign = 'right';
  ctx.fillText('VHS', width - 3, 3);
  ctx.textAlign = 'left';
  ctx.font = `800 8px ${fontFamily}`;
  const lines: string[] = [];
  for (const word of project.name.split(/\s+/)) {
    const previous = lines.at(-1);
    if (previous && ctx.measureText(`${previous} ${word}`).width <= width - 12) {
      lines[lines.length - 1] = `${previous} ${word}`;
    } else {
      lines.push(word);
    }
  }
  ctx.fillStyle = '#fff0cc';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  for (const [index, line] of lines.entries()) {
    ctx.fillText(line, 7, height - 6 - (lines.length - index) * 8.64);
  }
  ctx.restore();
  ctx.strokeStyle = '#bba78a80';
  ctx.lineWidth = 0.65;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}
