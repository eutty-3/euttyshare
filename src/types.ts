export interface SecurityReport {
  status: 'clean' | 'suspicious' | 'quarantined';
  threatScore: number;
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
  pin: string;
  originalName: string;
  sanitizedName: string;
  size: number;
  mimeType: string;
  createdAt: number;
  expiresAt: number;
  durationMinutes: number;
  burnAfterDownload: boolean;
  downloadCount: number;
  note?: string;
  securityReport: SecurityReport;
  qrCodeDataUrl?: string;
  downloadUrl: string;
  secondsRemaining?: number;
}

export interface ActiveDropSummary {
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
}

export interface CampusStats {
  totalTransfers: number;
  totalBytesCleaned: number;
  threatsIntercepted: number;
  usbsAvoided: number;
  autoPurgedCount: number;
  activeDropsCount: number;
  quarantinePolicy: string;
  defaultRetentionMinutes: number;
  maxUploadSizeMb: number;
}
