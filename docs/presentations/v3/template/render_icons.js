const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const fa = require('react-icons/fa');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Shared icon library for every v3-track lesson deck. Add new [icon, color, fileName]
// jobs here as future decks need them — don't fork this script per deck.
const jobs = [
  // structural (title / goal / try-it / recap) — reused by every deck
  ['FaRobot', 'FFFFFF', 'robot_white'],
  ['FaBullseye', 'FFFFFF', 'bullseye_white'],
  ['FaCode', 'FFFFFF', 'code_white'],
  ['FaFileCode', '1B9AAA', 'filecode_teal'],
  ['FaCube', 'FFFFFF', 'cube_white'],
  ['FaHeartbeat', 'FFFFFF', 'heartbeat_white'],
  ['FaPlay', 'FFFFFF', 'play_white'],
  ['FaCommentDots', 'FFFFFF', 'commentdots_white'],
  ['FaClipboardCheck', 'FFFFFF', 'clipboardcheck_white'],
  ['FaGraduationCap', 'FFFFFF', 'graduationcap_white'],
  ['FaArrowRight', 'FFFFFF', 'arrowright_white'],
  ['FaLightbulb', 'FFFFFF', 'lightbulb_white'],
  ['FaTag', 'FFFFFF', 'tag_white'],
  ['FaListUl', 'FFFFFF', 'listul_white'],
  ['FaCheckCircle', 'FFFFFF', 'checkcircle_white'],
  ['FaExclamationTriangle', 'FFFFFF', 'exclamationtriangle_white'],
  // setup-lesson specific
  ['FaDownload', 'FFFFFF', 'download_white'],
  ['FaCoffee', 'FFFFFF', 'coffee_white'],
  ['FaFolderOpen', 'FFFFFF', 'folderopen_white'],
  ['FaCloudUploadAlt', 'FFFFFF', 'clouduploadalt_white'],
  ['FaSyncAlt', 'FFFFFF', 'syncalt_white'],
  ['FaKey', 'FFFFFF', 'key_white'],
  ['FaTerminal', 'FFFFFF', 'terminal_white'],
  ['FaGithub', 'FFFFFF', 'github_white'],
  // git-branching specific
  ['FaCodeBranch', 'FFFFFF', 'codebranch_white'],
  ['FaCompressArrowsAlt', 'FFFFFF', 'compressarrowsalt_white'],
  ['FaHistory', 'FFFFFF', 'history_white'],
  ['FaSitemap', 'FFFFFF', 'sitemap_white'],
  // lessons 1-5 specific
  ['FaPlug', 'FFFFFF', 'plug_white'],
  ['FaCog', 'FFFFFF', 'cog_white'],
  ['FaGamepad', 'FFFFFF', 'gamepad_white'],
  ['FaListOl', 'FFFFFF', 'listol_white'],
  ['FaChartLine', 'FFFFFF', 'chartline_white'],
  ['FaBroadcastTower', 'FFFFFF', 'broadcasttower_white'],
  ['FaFlask', 'FFFFFF', 'flask_white'],
  ['FaCompass', 'FFFFFF', 'compass_white'],
  ['FaBolt', 'FFFFFF', 'bolt_white'],
];

async function main() {
  for (const [iconName, color, fileName] of jobs) {
    const Icon = fa[iconName];
    if (!Icon) { console.error('missing icon', iconName); continue; }
    const el = React.createElement(Icon, { color: '#' + color, size: 256 });
    const svg = ReactDOMServer.renderToStaticMarkup(el);
    const fullSvg = svg.includes('xmlns=')
      ? svg
      : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
    const outPath = path.join(outDir, fileName + '.png');
    await sharp(Buffer.from(fullSvg)).resize(256, 256).png().toFile(outPath);
    console.log('wrote', outPath);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
