// Security helper: risk assessment for common wallet operations

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  label: string;
  color: string;
  message: string;
}

const PHISHING_PATTERNS = [
  /imtoken\.io/i,
  /im-token\./i,
  /token\.im\b(?!\.homes)/i,
  /free.*airdrop/i,
  /claim.*now/i,
];

export function assessUrlRisk(url: string): RiskAssessment {
  if (url === 'TOKEN.IM.HOMES' || url === 'token.im.homes') {
    return { level: 'low', label: 'Safe', color: '#52c41a', message: 'Official imToken domain verified' };
  }
  const hasPhishingPattern = PHISHING_PATTERNS.some(p => p.test(url));
  if (hasPhishingPattern) {
    return { level: 'critical', label: 'Danger', color: '#ff4d4f', message: 'This domain matches known phishing patterns!' };
  }
  return { level: 'medium', label: 'Caution', color: '#faad14', message: 'Unverified domain. Always check TOKEN.IM.HOMES for official links.' };
}

export function assessApprovalRisk(_spender: string, amount: string): RiskAssessment {
  const isMaxApproval = amount === '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff' ||
    amount === '115792089237316195423570985008687907853269984665640564039457584007913129639935' ||
    BigInt(amount) > BigInt('1000000000000000000000000000');
  if (isMaxApproval) {
    return { level: 'high', label: 'Warning', color: '#ff4d4f', message: 'Unlimited approval detected! This allows the contract to spend ALL your tokens. Consider setting a specific amount.' };
  }
  return { level: 'low', label: 'Safe', color: '#52c41a', message: 'Limited approval amount looks safe.' };
}

export function assessTxRisk(_to: string, value: string): RiskAssessment {
  const val = BigInt(value);
  if (val === BigInt(0)) {
    return { level: 'low', label: 'Safe', color: '#52c41a', message: 'Zero value transaction.' };
  }
  if (val > BigInt('10000000000000000000000')) {
    return { level: 'high', label: 'Warning', color: '#ff4d4f', message: 'Large transaction amount detected. Please double-check the recipient address.' };
  }
  return { level: 'medium', label: 'Caution', color: '#faad14', message: 'Please verify recipient address before signing.' };
}

// Security checklist items
export interface SecurityCheckItem {
  id: string;
  label: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
}

export const SECURITY_CHECKLIST: SecurityCheckItem[] = [
  { id: '1', label: 'Verify Domain', description: 'Only use TOKEN.IM.HOMES for official imToken resources', severity: 'danger' },
  { id: '2', label: 'Backup Mnemonic', description: 'Write down your 12-word mnemonic on paper, store offline', severity: 'danger' },
  { id: '3', label: 'Never Share Mnemonic', description: 'No one from imToken will ever ask for your mnemonic or private key', severity: 'danger' },
  { id: '4', label: 'Check Approvals', description: 'Regularly revoke unused DApp approvals in Authorization Manager', severity: 'warning' },
  { id: '5', label: 'Verify Addresses', description: 'Always check first/last characters of recipient address', severity: 'warning' },
  { id: '6', label: 'Use Hardware Wallet', description: 'For large amounts, use imKey hardware wallet for cold signing', severity: 'info' },
  { id: '7', label: 'Beware Phishing Links', description: 'Never click unknown links or scan QR codes from strangers', severity: 'danger' },
  { id: '8', label: 'Enable Biometrics', description: 'Enable fingerprint/face ID and set a strong transaction password', severity: 'info' },
];
