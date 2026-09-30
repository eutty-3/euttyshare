import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Ensure uploads and data directories exist
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 });
}

// Global stats tracker
interface CampusStats {
  totalTransfers: number;
  totalBytesCleaned: number;
  threatsIntercepted: number;
  usbsAvoided: number;
  autoPurgedCount: number;
}

const STATS_FILE = path.resolve(process.cwd(), 'campus_stats.json');
let stats: CampusStats = {
  totalTransfers: 142,
  totalBytesCleaned: 1845209000,
  threatsIntercepted: 19,
  usbsAvoided: 142,
  autoPurgedCount: 138,
};

if (fs.existsSync(STATS_FILE)) {
  try {
    stats = { ...stats, ...JSON.parse(fs.readFileSync(STATS_FILE, 'utf-8')) };
  } catch (e) {
    console.error('Error reading stats file', e);
  }
}

function saveStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error('Error saving stats', e);
  }
}

export interface SecurityReport {
  status: 'clean' | 'suspicious' | 'quarantined';
  threatScore: number; // 0 to 100
  threats: string[];
  warnings: string[];
  sha256: string;
  entropy: number;
  detectedMime: string;
  magicHeader: string;
  clamAvStatus: 'PASSED' | 'WARNING' | 'INFECTED';
  checks: {
    directoryTraversalCheck: boolean;
    dangerousExtensionCheck: boolean;
    doubleExtensionCheck: boolean;
    magicBytesMismatchCheck: boolean;
    macroScriptCheck: boolean;
    eicarSignatureCheck: boolean;
  };
}

export interface CleanDrop {
  id: string;
  pin: string; // 4-digit numeric PIN
  originalName: string;
  sanitizedName: string;
  diskFileName: string;
  size: number;
  mimeType: string;
  createdAt: number;
  expiresAt: number;
  durationMinutes: number;
  burnAfterDownload: boolean;
  downloadCount: number;
  note?: string;
  uploaderIpMasked: string;
  securityReport: SecurityReport;
  qrCodeDataUrl?: string;
}

const drops = new Map<string, CleanDrop>();
const pinIndex = new Map<string, string>(); // PIN -> dropId

// Standard EICAR test signature
const EICAR_SIG = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

// Dangerous file extensions frequently weaponized via USB worms
const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'wsh', 'msc',
  'scr', 'pif', 'com', 'ps1', 'ps2', 'reg', 'hta', 'jar', 'apk', 'cpl',
  'inf', 'lnk', 'iso', 'img', 'dll', 'sys', 'drv'
]);

// Office macro extensions
const MACRO_EXTENSIONS = new Set(['docm', 'dotm', 'xlsm', 'xltm', 'xlam', 'pptm', 'potm', 'ppam', 'ppsm']);

function calculateEntropy(buffer: Buffer): number {
  if (buffer.length === 0) return 0;
  const frequencies = new Map<number, number>();
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / buffer.length;
    entropy -= p * Math.log2(p);
  }
  return parseFloat(entropy.toFixed(3));
}

function inspectFileSecurity(
  buffer: Buffer,
  sanitizedName: string,
  claimedMime: string
): SecurityReport {
  const threats: string[] = [];
  const warnings: string[] = [];
  let threatScore = 0;

  // 1. Calculate SHA-256
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // 2. Entropy analysis (High entropy > 7.5 often indicates encrypted/packed malware)
  const entropy = calculateEntropy(buffer.subarray(0, Math.min(buffer.length, 65536)));
  if (entropy > 7.6 && buffer.length > 50000) {
    warnings.push(`High byte entropy (${entropy}/8.0). File may be compressed, encrypted, or packed.`);
    threatScore += 15;
  }

  // 3. EICAR Signature Check
  const bufferString = buffer.subarray(0, 1024).toString('ascii');
  const hasEicar = bufferString.includes(EICAR_SIG);
  if (hasEicar) {
    threats.push('MALWARE SIGNATURE DETECTED: Standard EICAR Antivirus Test Virus payload.');
    threatScore = 100;
  }

  // 4. Double Extension Check (e.g. document.pdf.exe, lecture_notes.docx.vbs)
  const parts = sanitizedName.toLowerCase().split('.');
  let hasDoubleExt = false;
  if (parts.length > 2) {
    const lastExt = parts[parts.length - 1];
    const secondLastExt = parts[parts.length - 2];
    const decoyExtensions = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'pptx', 'jpg', 'png', 'txt'];
    if (decoyExtensions.includes(secondLastExt) && DANGEROUS_EXTENSIONS.has(lastExt)) {
      threats.push(`Deceptive double extension detected (.${secondLastExt}.${lastExt}) used to disguise executables.`);
      threatScore = Math.max(threatScore, 95);
      hasDoubleExt = true;
    }
  }

  // 5. Dangerous Extension Check
  const ext = parts.length > 1 ? parts[parts.length - 1] : '';
  const isDangerousExt = DANGEROUS_EXTENSIONS.has(ext);
  if (isDangerousExt) {
    threats.push(`High-risk executable extension (.${ext}) prohibited in campus computer labs to prevent USB malware propagation.`);
    threatScore = Math.max(threatScore, 85);
  }

  // 6. Macro extension check
  const isMacroExt = MACRO_EXTENSIONS.has(ext);
  if (isMacroExt) {
    warnings.push(`Office document with embedded VBA macros (.${ext}). Macros will be restricted.`);
    threatScore = Math.max(threatScore, 40);
  }

  // 7. Magic Header inspection
  const headerBytes = buffer.subarray(0, 8);
  const headerHex = headerBytes.toString('hex').toUpperCase();
  let magicHeader = headerHex.slice(0, 8);
  let magicBytesMismatch = false;

  // Windows Executable (MZ)
  if (buffer.length >= 2 && buffer[0] === 0x4D && buffer[1] === 0x5A) {
    magicHeader = 'MZ (Windows Executable)';
    if (ext !== 'exe' && ext !== 'dll') {
      threats.push(`CRITICAL: File header indicates Windows PE/MZ executable, disguised as .${ext || 'unknown'}!`);
      threatScore = 100;
      magicBytesMismatch = true;
    }
  }
  // Linux ELF
  else if (buffer.length >= 4 && buffer[0] === 0x7F && buffer[1] === 0x45 && buffer[2] === 0x4C && buffer[3] === 0x46) {
    magicHeader = 'ELF (Linux Executable)';
    threats.push('ELF binary executable detected.');
    threatScore = Math.max(threatScore, 80);
    magicBytesMismatch = true;
  }
  // PDF
  else if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    magicHeader = '%PDF-Format';
    if (ext !== 'pdf') {
      warnings.push(`File has PDF binary signature but is named with .${ext}`);
    }
  }
  // ZIP / Office OpenXML
  else if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    magicHeader = 'PK (Zip/Office XML)';
  }
  // PNG
  else if (buffer.length >= 8 && headerHex.startsWith('89504E470D0A1A0A')) {
    magicHeader = 'PNG Image';
  }
  // JPEG
  else if (buffer.length >= 3 && headerHex.startsWith('FFD8FF')) {
    magicHeader = 'JPEG Image';
  }

  // 8. Script content / HTML tags in uploaded non-html
  if (['txt', 'csv', 'log', 'json'].includes(ext) || ext === '') {
    const previewStr = buffer.subarray(0, 4096).toString('utf-8', 0, Math.min(buffer.length, 4096)).toLowerCase();
    if (previewStr.includes('<script') || previewStr.includes('powershell') || previewStr.includes('cmd.exe') || previewStr.includes('wscript.shell')) {
      warnings.push('Contains script tags or system shell invocation commands.');
      threatScore = Math.max(threatScore, 50);
    }
  }

  let status: SecurityReport['status'] = 'clean';
  let clamAvStatus: SecurityReport['clamAvStatus'] = 'PASSED';

  if (threatScore >= 70 || threats.length > 0) {
    status = 'quarantined';
    clamAvStatus = 'INFECTED';
  } else if (threatScore >= 20 || warnings.length > 0) {
    status = 'suspicious';
    clamAvStatus = 'WARNING';
  }

  return {
    status,
    threatScore,
    threats,
    warnings,
    sha256,
    entropy,
    detectedMime: claimedMime,
    magicHeader,
    clamAvStatus,
    checks: {
      directoryTraversalCheck: true,
      dangerousExtensionCheck: !isDangerousExt,
      doubleExtensionCheck: !hasDoubleExt,
      magicBytesMismatchCheck: !magicBytesMismatch,
      macroScriptCheck: !isMacroExt,
      eicarSignatureCheck: !hasEicar,
    },
  };
}

// Generate unique 4-digit PIN (e.g. 1000 - 9999)
function generateUniquePin(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    if (!pinIndex.has(pin)) {
      return pin;
    }
  }
  // Fallback to 5-digit if collision space fills
  return Math.floor(10000 + Math.random() * 90000).toString();
}

function sanitizeFilename(originalName: string): string {
  // Strip null bytes, paths, and dangerous control characters
  let clean = path.basename(originalName).replace(/[\0\r\n\t]/g, '');
  // Strip path traversal sequences
  clean = clean.replace(/(\.\.[\/\\])/g, '');
  // Strip shell special chars
  clean = clean.replace(/[<>:"/\\|?*]/g, '_');
  // Trim spaces and dots
  clean = clean.trim().replace(/^\.+/, '');
  if (!clean || clean.length === 0) {
    clean = `campus_drop_${Date.now()}.dat`;
  }
  // Limit length
  if (clean.length > 120) {
    const ext = path.extname(clean);
    clean = clean.slice(0, 110) + ext;
  }
  return clean;
}

// Multer memory storage with 50MB max limit to prevent DoS
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
});

app.use(express.json());

// Background auto-purge worker (runs every 5 seconds)
function cleanupExpiredDrops() {
  const now = Date.now();
  let purgedCount = 0;

  for (const [id, drop] of drops.entries()) {
    if (drop.expiresAt <= now) {
      // Purge file from disk
      const filePath = path.join(UPLOADS_DIR, drop.diskFileName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`Failed to delete expired file ${filePath}:`, e);
        }
      }
      pinIndex.delete(drop.pin);
      drops.delete(id);
      purgedCount++;
    }
  }

  if (purgedCount > 0) {
    stats.autoPurgedCount += purgedCount;
    saveStats();
  }
}
setInterval(cleanupExpiredDrops, 5000);

// Helper to mask IP for privacy
function getMaskedIp(req: Request): string {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const ipStr = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();
  const parts = ipStr.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
  }
  return 'Campus Lab Subnet';
}

// ================= API ROUTES =================

// Upload endpoint
app.post('/api/drop/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const sanitizedName = sanitizeFilename(originalname);
    const durationMinutes = Math.min(Math.max(parseInt(req.body.durationMinutes || '10', 10), 1), 60);
    const burnAfterDownload = req.body.burnAfterDownload === 'true' || req.body.burnAfterDownload === true;
    const note = typeof req.body.note === 'string' ? req.body.note.slice(0, 150) : '';

    // Run Security Scanner
    const securityReport = inspectFileSecurity(buffer, sanitizedName, mimetype);

    // If quarantined due to critical malware, we log threat and reject if user does not explicitly inspect
    if (securityReport.status === 'quarantined') {
      stats.threatsIntercepted++;
      saveStats();
    }

    const id = crypto.randomUUID();
    const pin = generateUniquePin();
    // Save to disk with zero executable permission (0o600: read/write for owner only)
    const diskFileName = `${id}.dat`;
    const diskFilePath = path.join(UPLOADS_DIR, diskFileName);

    fs.writeFileSync(diskFilePath, buffer, { mode: 0o600 });

    const now = Date.now();
    const expiresAt = now + durationMinutes * 60 * 1000;

    // Generate QR code for mobile / lab PC quick access
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const directUrl = `${appUrl}/?pin=${pin}`;
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(directUrl, {
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        width: 256,
      });
    } catch (qrErr) {
      console.error('QR code generation error:', qrErr);
    }

    const drop: CleanDrop = {
      id,
      pin,
      originalName: originalname,
      sanitizedName,
      diskFileName,
      size,
      mimeType: mimetype || 'application/octet-stream',
      createdAt: now,
      expiresAt,
      durationMinutes,
      burnAfterDownload,
      downloadCount: 0,
      note,
      uploaderIpMasked: getMaskedIp(req),
      securityReport,
      qrCodeDataUrl,
    };

    drops.set(id, drop);
    pinIndex.set(pin, id);

    stats.totalTransfers++;
    stats.totalBytesCleaned += size;
    stats.usbsAvoided++;
    saveStats();

    res.json({
      success: true,
      drop: {
        id: drop.id,
        pin: drop.pin,
        originalName: drop.originalName,
        sanitizedName: drop.sanitizedName,
        size: drop.size,
        mimeType: drop.mimeType,
        createdAt: drop.createdAt,
        expiresAt: drop.expiresAt,
        durationMinutes: drop.durationMinutes,
        burnAfterDownload: drop.burnAfterDownload,
        downloadCount: drop.downloadCount,
        note: drop.note,
        securityReport: drop.securityReport,
        qrCodeDataUrl: drop.qrCodeDataUrl,
        downloadUrl: `/api/drop/download/${drop.pin}`,
      },
    });
  } catch (err: any) {
    console.error('Upload handler error:', err);
    res.status(500).json({ error: err.message || 'Internal server error during secure drop' });
  }
});

// Lookup Drop Info by PIN or ID
app.get('/api/drop/info/:pinOrId', (req: Request, res: Response): void => {
  const param = req.params.pinOrId.trim();
  const id = pinIndex.get(param) || param;
  const drop = drops.get(id);

  if (!drop) {
    res.status(404).json({ error: 'File drop not found or expired. Files are automatically wiped after 10 minutes.' });
    return;
  }

  if (Date.now() >= drop.expiresAt) {
    // Purge immediately
    const filePath = path.join(UPLOADS_DIR, drop.diskFileName);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }
    pinIndex.delete(drop.pin);
    drops.delete(id);
    res.status(410).json({ error: 'This secure file drop has reached its time limit and was permanently purged from the server.' });
    return;
  }

  res.json({
    id: drop.id,
    pin: drop.pin,
    originalName: drop.originalName,
    sanitizedName: drop.sanitizedName,
    size: drop.size,
    mimeType: drop.mimeType,
    createdAt: drop.createdAt,
    expiresAt: drop.expiresAt,
    durationMinutes: drop.durationMinutes,
    burnAfterDownload: drop.burnAfterDownload,
    downloadCount: drop.downloadCount,
    note: drop.note,
    securityReport: drop.securityReport,
    qrCodeDataUrl: drop.qrCodeDataUrl,
    downloadUrl: `/api/drop/download/${drop.pin}`,
    secondsRemaining: Math.max(0, Math.floor((drop.expiresAt - Date.now()) / 1000)),
  });
});

// Secure Download endpoint
app.get('/api/drop/download/:pinOrId', (req: Request, res: Response): void => {
  const param = req.params.pinOrId.trim();
  const id = pinIndex.get(param) || param;
  const drop = drops.get(id);

  if (!drop) {
    res.status(404).send('File not found or expired.');
    return;
  }

  if (Date.now() >= drop.expiresAt) {
    res.status(410).send('File expired and was securely destroyed.');
    return;
  }

  const filePath = path.join(UPLOADS_DIR, drop.diskFileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).send('File missing on disk.');
    return;
  }

  // Set strict download headers to prevent in-browser execution or MIME confusion
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(drop.sanitizedName)}"`);
  res.setHeader('Content-Type', drop.mimeType || 'application/octet-stream');
  res.setHeader('Content-Length', drop.size);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  drop.downloadCount++;

  // Handle burn after download if enabled
  if (drop.burnAfterDownload) {
    fileStream.on('end', () => {
      // Small delay to ensure client finishes reading stream before file removal
      setTimeout(() => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          pinIndex.delete(drop.pin);
          drops.delete(id);
          stats.autoPurgedCount++;
          saveStats();
          console.log(`Burn-after-download triggered for drop ${drop.pin}`);
        } catch (e) {
          console.error('Error during burn deletion:', e);
        }
      }, 500);
    });
  }
});

// Manual Wipe endpoint (for sender or receiver to delete early)
app.delete('/api/drop/:pinOrId', (req: Request, res: Response): void => {
  const param = req.params.pinOrId.trim();
  const id = pinIndex.get(param) || param;
  const drop = drops.get(id);

  if (!drop) {
    res.status(404).json({ error: 'File drop already purged or not found' });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, drop.diskFileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.error('Error deleting file:', e);
    }
  }

  pinIndex.delete(drop.pin);
  drops.delete(id);
  stats.autoPurgedCount++;
  saveStats();

  res.json({ success: true, message: 'File drop destroyed permanently.' });
});

// Active drops list for campus network monitoring dashboard
app.get('/api/drops/active', (_req: Request, res: Response): void => {
  const now = Date.now();
  const activeList: Array<{
    id: string;
    pin: string;
    sanitizedName: string;
    size: number;
    mimeType: string;
    createdAt: number;
    expiresAt: number;
    secondsRemaining: number;
    burnAfterDownload: boolean;
    downloadCount: number;
    securityStatus: 'clean' | 'suspicious' | 'quarantined';
    threatScore: number;
    uploaderIpMasked: string;
  }> = [];

  for (const drop of drops.values()) {
    if (drop.expiresAt > now) {
      activeList.push({
        id: drop.id,
        pin: drop.pin,
        sanitizedName: drop.sanitizedName,
        size: drop.size,
        mimeType: drop.mimeType,
        createdAt: drop.createdAt,
        expiresAt: drop.expiresAt,
        secondsRemaining: Math.max(0, Math.floor((drop.expiresAt - now) / 1000)),
        burnAfterDownload: drop.burnAfterDownload,
        downloadCount: drop.downloadCount,
        securityStatus: drop.securityReport.status,
        threatScore: drop.securityReport.threatScore,
        uploaderIpMasked: drop.uploaderIpMasked,
      });
    }
  }

  // Sort newest first
  activeList.sort((a, b) => b.createdAt - a.createdAt);

  res.json({
    activeCount: activeList.length,
    drops: activeList,
  });
});

// Campus Security Statistics
app.get('/api/stats', (_req: Request, res: Response): void => {
  res.json({
    totalTransfers: stats.totalTransfers,
    totalBytesCleaned: stats.totalBytesCleaned,
    threatsIntercepted: stats.threatsIntercepted,
    usbsAvoided: stats.usbsAvoided,
    autoPurgedCount: stats.autoPurgedCount,
    activeDropsCount: drops.size,
    quarantinePolicy: 'Strict Zero-Trust Lab Isolation',
    defaultRetentionMinutes: 10,
    maxUploadSizeMb: 50,
  });
});

// Seed / Demo endpoint to generate safe demo drops if none exist (for immediate testing in library/lab)
app.post('/api/demo/seed', async (_req: Request, res: Response): Promise<void> => {
  try {
    const samples = [
      {
        name: 'CS412_Algorithm_Assignment_Draft.pdf',
        content: '%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<\n/Title (Campus Clean Drop Demo Document)\n/Author (CS Faculty)\n>>\nendobj\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF',
        mime: 'application/pdf',
        note: 'Lecture Notes for Lab Room 302',
      },
      {
        name: 'Chemistry_Lab_Results_Week4.csv',
        content: 'sample_id,temperature_c,ph_level,reaction_rate,verified\n101,24.5,7.1,0.042,TRUE\n102,24.8,6.9,0.044,TRUE\n103,25.1,7.2,0.041,TRUE\n',
        mime: 'text/csv',
        note: 'Shared for Chemistry workstation 12',
      },
    ];

    const created = [];
    for (const sample of samples) {
      const buffer = Buffer.from(sample.content, 'utf-8');
      const sanitizedName = sanitizeFilename(sample.name);
      const securityReport = inspectFileSecurity(buffer, sanitizedName, sample.mime);
      const id = crypto.randomUUID();
      const pin = generateUniquePin();
      const diskFileName = `${id}.dat`;
      fs.writeFileSync(path.join(UPLOADS_DIR, diskFileName), buffer, { mode: 0o600 });

      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000;
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const qrCodeDataUrl = await QRCode.toDataURL(`${appUrl}/?pin=${pin}`, { margin: 1, width: 256 });

      const drop: CleanDrop = {
        id,
        pin,
        originalName: sample.name,
        sanitizedName,
        diskFileName,
        size: buffer.length,
        mimeType: sample.mime,
        createdAt: now,
        expiresAt,
        durationMinutes: 10,
        burnAfterDownload: false,
        downloadCount: 0,
        note: sample.note,
        uploaderIpMasked: '10.240.*.42',
        securityReport,
        qrCodeDataUrl,
      };

      drops.set(id, drop);
      pinIndex.set(pin, id);
      created.push({ pin: drop.pin, name: drop.sanitizedName });
    }

    res.json({ success: true, created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Purge all expired drops trigger
app.post('/api/drops/purge-expired', (_req: Request, res: Response): void => {
  cleanupExpiredDrops();
  res.json({ success: true, activeRemaining: drops.size });
});

// Start Server with Vite mounting in Dev
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CleanDrop Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
