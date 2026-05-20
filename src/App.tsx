import { useState, useEffect, useCallback } from 'react';
import { initTcxWasm, create_keystore, derive_accounts, export_mnemonic, sign_message, cache_keystore, clear_cached_keystore } from './lib/tcx';
import { assessUrlRisk, assessTxRisk, SECURITY_CHECKLIST } from './lib/security';

// Types
interface Account {
  address: string;
  chain: string;
  derivationPath: string;
  extPubKey: string;
  publicKey: string;
}

interface Activity {
  id: number;
  icon: string;
  title: string;
  meta: string;
  time: string;
}

type Tab = 'wallet' | 'security' | 'tools';

interface ChainInfo {
  key: string;
  label: string;
  icon: string;
  iconClass: string;
  color: string;
  derivPath: string;
  extra?: Record<string, string>;
}

const CHAINS: ChainInfo[] = [
  { key: 'ETHEREUM', label: 'ETH', icon: '⟠', iconClass: 'chain-icon-eth', color: '#627eea', derivPath: "m/44'/60'/0'/0/0" },
  { key: 'TRON',     label: 'TRX', icon: '◈', iconClass: 'chain-icon-trx', color: '#ef4444', derivPath: "m/44'/195'/0'/0/0" },
  { key: 'BITCOIN',  label: 'BTC', icon: '₿', iconClass: 'chain-icon-btc', color: '#f0b90b', derivPath: "m/84'/0'/0'/0/0", extra: { network: 'MAINNET', segWit: 'VERSION_0' } },
];

let activityCounter = 0;

function App() {
  const [wasmReady, setWasmReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('wallet');
  const [password, setPassword] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [keystore, setKeystore] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedChain, setSelectedChain] = useState('ETHEREUM');
  const [signMessageText, setSignMessageText] = useState('');
  const [signature, setSignature] = useState('');
  const [checkUrl, setCheckUrl] = useState('');
  const [checkResult, setCheckResult] = useState<ReturnType<typeof assessUrlRisk> | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Transfer form
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Activity log
  const [activities, setActivities] = useState<Activity[]>([]);

  const addActivity = useCallback((icon: string, title: string, meta: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setActivities(prev => [{
      id: ++activityCounter,
      icon, title, meta, time
    }, ...prev].slice(0, 20));
  }, []);

  // Initialize WASM
  useEffect(() => {
    initTcxWasm()
      .then(() => setWasmReady(true))
      .catch(err => setError('Failed to init tcx-wasm: ' + err.message));
  }, []);

  // Create wallet
  const handleCreateWallet = useCallback(async () => {
    if (!password) { setError('Please set a password'); return; }
    setLoading('Creating wallet...');
    setError('');
    try {
      const params: Record<string, string> = { password, network: 'MAINNET' };
      if (mnemonicInput.trim()) params.mnemonic = mnemonicInput.trim();
      const ks = create_keystore(JSON.stringify(params));
      setKeystore(ks);
      cache_keystore(ks);

      const derivations = CHAINS.map(c => ({
        chain: c.key,
        derivationPath: c.derivPath,
        ...(c.extra || {}),
      }));

      const accs: Account[] = JSON.parse(derive_accounts(JSON.stringify({
        key: password,
        derivations,
      })));
      setAccounts(accs);
      setMnemonic('');
      setLoading('');
      setSuccess('Wallet created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      addActivity('🔐', 'Wallet Created', `${accs.length} chain accounts derived`);
    } catch (e: any) {
      setError(e.message || 'Failed to create wallet');
      setLoading('');
    }
  }, [password, mnemonicInput, addActivity]);

  // Export mnemonic
  const handleExportMnemonic = useCallback(() => {
    if (!keystore || !password) { setError('Wallet not unlocked'); return; }
    try {
      const result = JSON.parse(export_mnemonic(JSON.stringify({ key: password })));
      setMnemonic(result.mnemonic);
      addActivity('👁', 'Mnemonic Exported', 'Displayed for backup');
    } catch (e: any) {
      setError(e.message || 'Failed to export mnemonic');
    }
  }, [keystore, password, addActivity]);

  // Sign message
  const handleSignMessage = useCallback(() => {
    if (!keystore || !password || !signMessageText) { setError('Fill in all fields'); return; }
    setLoading('Signing...');
    try {
      const chain = selectedChain;
      const chainInfo = CHAINS.find(c => c.key === chain);
      const derivationPath = chainInfo?.derivPath || CHAINS[0].derivPath;
      const input = chain === 'ETHEREUM'
          ? { message: signMessageText, signatureType: 'PersonalSign' }
          : chain === 'TRON'
          ? { value: signMessageText, header: 'TRON', version: 2 }
          : { message: signMessageText };
      const result = JSON.parse(sign_message(JSON.stringify({
        key: password,
        chain,
        input,
        ...(chain !== 'TRON' ? { derivationPath } : {}),
        ...(chain === 'BITCOIN' ? { network: 'MAINNET', segWit: 'VERSION_0' } : {}),
      })));
      const sig = result.signature || result.signatures?.[0] || JSON.stringify(result);
      setSignature(sig);
      setLoading('');
      setSuccess('Message signed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      addActivity('✍️', `Signed on ${chainInfo?.label || chain}`, signMessageText.slice(0, 40) + (signMessageText.length > 40 ? '...' : ''));
    } catch (e: any) {
      setError(e.message || 'Failed to sign');
      setLoading('');
    }
  }, [keystore, password, signMessageText, selectedChain, addActivity]);

  // Simulated transfer
  const handleTransfer = useCallback(() => {
    if (!transferTo || !transferAmount) { setError('Fill in recipient and amount'); return; }
    setLoading('Preparing transaction...');
    setError('');
    const chainInfo = CHAINS.find(c => c.key === selectedChain)!;
    // Simulate: assess risk then "send"
    const risk = assessTxRisk(transferTo, (parseFloat(transferAmount) * 1e18).toFixed(0));
    setTimeout(() => {
      if (risk.level === 'critical' || risk.level === 'high') {
        setError(`Transaction blocked: ${risk.message}`);
        setLoading('');
        addActivity('🛑', 'Transfer Blocked', `Risk: ${risk.label}`);
        return;
      }
      setLoading('');
      setSuccess(`Transaction submitted on ${chainInfo.label}! Hash: 0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 10)}`);
      setTimeout(() => setSuccess(''), 5000);
      addActivity('📤', `Sent ${transferAmount} ${chainInfo.label}`, `To ${transferTo.slice(0, 10)}...${transferTo.slice(-6)}`);
      setTransferTo('');
      setTransferAmount('');
    }, 1500);
  }, [transferTo, transferAmount, selectedChain, addActivity]);

  // Clear wallet
  const handleClear = useCallback(() => {
    clear_cached_keystore();
    setKeystore('');
    setMnemonic('');
    setAccounts([]);
    setSignature('');
    setPassword('');
    setMnemonicInput('');
    setSuccess('');
    setError('');
    setTransferTo('');
    setTransferAmount('');
    addActivity('🔒', 'Wallet Locked', 'Session cleared');
  }, [addActivity]);

  // Check URL
  const handleCheckUrl = useCallback(() => {
    if (!checkUrl.trim()) return;
    const r = assessUrlRisk(checkUrl.trim());
    setCheckResult(r);
    addActivity('🔍', `URL Checked: ${r.label}`, checkUrl.trim());
  }, [checkUrl, addActivity]);

  const handleUrlChange = useCallback((val: string) => {
    setCheckUrl(val);
    setCheckResult(null);
  }, []);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const currentAccount = accounts.find(a => a.chain === selectedChain);
  const currentChainInfo = CHAINS.find(c => c.key === selectedChain)!;

  // Derived accounts for supported chains (from tcx-wasm)
  const supportedChains = CHAINS.filter(c => accounts.some(a => a.chain === c.key));

  if (!wasmReady) {
    return (
      <div className="app">
        <div className="header">
          <h1>SafeWallet</h1>
          <p className="subtitle">Powered by Token Core (tcx-wasm)</p>
          <span className="badge"><span className="dot" />Initializing</span>
        </div>
        <div className="loading">
          <div className="spinner" />
          Initializing Token Core...
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1>SafeWallet</h1>
        <p className="subtitle">Security-First Multi-Chain Wallet</p>
        <span className="badge">
          {keystore ? <><span className="dot" />Wallet Active</> : 'Token Core Ready'}
        </span>
      </div>

      {/* Tab Bar */}
      <div className="tab-bar">
        <div className={`tab ${activeTab === 'wallet' ? 'active' : ''}`} onClick={() => setActiveTab('wallet')}>
          Wallet
        </div>
        <div className={`tab ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          Security
        </div>
        <div className={`tab ${activeTab === 'tools' ? 'active' : ''}`} onClick={() => setActiveTab('tools')}>
          Tools
        </div>
      </div>

      <div className="content">
        {error && <div className="alert alert-danger" onClick={() => setError('')}>⚠️ {error} <small style={{opacity:0.6}}>(tap to dismiss)</small></div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>✓ {success}</div>}
        {loading && <div className="alert alert-info"><div className="spinner" style={{display:'inline-block',width:14,height:14,marginRight:6,verticalAlign:'middle'}}/>{loading}</div>}

        {/* === WALLET TAB === */}
        {activeTab === 'wallet' && (
          <>
            {!keystore ? (
              <div className="card">
                <div className="card-title"><span className="icon">🔐</span> Create / Import Wallet</div>
                <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:16, lineHeight:1.5}}>
                  Uses <strong style={{color:'var(--accent-gold)'}}>tcx-wasm create_keystore</strong> to generate a secure HD wallet.
                  All operations run <strong>locally in your browser</strong> via WebAssembly.
                </p>

                <div className="input-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                <div className="alert alert-info" style={{fontSize:11}}>
                  🔒 100% local — zero data leaves your browser. Powered by Token Core WASM.
                </div>

                <button className="btn btn-primary" onClick={handleCreateWallet} disabled={!password || !!loading}>
                  ⚡ Create New Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Chain Selector */}
                <div className="card">
                  <div className="card-title"><span className="icon">🔗</span> My Accounts</div>
                  <div className="chain-tabs">
                    {CHAINS.map(c => {
                      const hasAccount = accounts.some(a => a.chain === c.key);
                      return (
                        <div
                          key={c.key}
                          className={`chain-tab ${selectedChain === c.key ? 'active' : ''}`}
                          onClick={() => setSelectedChain(c.key)}
                          style={{opacity: hasAccount ? 1 : 0.4}}
                        >
                          {c.icon} {c.label}
                        </div>
                      );
                    })}
                  </div>

                  {currentAccount && (
                    <>
                      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                        <span className={`chain-icon ${currentChainInfo.iconClass}`}>{currentChainInfo.icon}</span>
                        <span className="address-label">{currentChainInfo.label}</span>
                        <span className="status-tag connected">● Active</span>
                      </div>
                      <div className="address-display" style={{position:'relative'}}>
                        {currentAccount.address}
                        <button className="copy-btn" style={{position:'absolute',top:10,right:10}} onClick={() => navigator.clipboard?.writeText(currentAccount.address)}>Copy</button>
                      </div>
                      <div style={{fontSize:11, color:'var(--text-muted)', marginTop:6}}>
                        Derivation: <code style={{color:'var(--text-secondary)'}}>{currentAccount.derivationPath}</code>
                      </div>
                    </>
                  )}
                </div>

                {/* Multi-Chain Balance Cards */}
                <div className="card">
                  <div className="card-title"><span className="icon">💎</span> Multi-Chain Vault</div>
                  {supportedChains.map(c => {
                    const acc = accounts.find(a => a.chain === c.key);
                    if (!acc) return null;
                    return (
                      <div key={c.key} className="balance-card" onClick={() => setSelectedChain(c.key)}>
                        <div className="balance-icon" style={{background: `${c.color}15`, color: c.color}}>
                          {c.icon}
                        </div>
                        <div className="balance-info">
                          <div className="balance-name">{c.label} <span style={{color:'var(--text-muted)',fontSize:11,fontWeight:400}}>{c.key}</span></div>
                          <div className="balance-desc">{acc.address.slice(0, 8)}...{acc.address.slice(-6)}</div>
                        </div>
                        <div className="balance-amount">0.0000</div>
                      </div>
                    );
                  })}
                </div>

                {/* Transfer UI */}
                {currentAccount && (
                  <div className="card">
                    <div className="card-title"><span className="icon">📤</span> Send {currentChainInfo.label}</div>
                    <div className="input-group">
                      <label>Recipient Address</label>
                      <input
                        className="input"
                        placeholder={`Enter ${currentChainInfo.label} address...`}
                        value={transferTo}
                        onChange={e => setTransferTo(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Amount ({currentChainInfo.label})</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="0.00"
                        value={transferAmount}
                        onChange={e => setTransferAmount(e.target.value)}
                      />
                    </div>
                    <div style={{marginBottom:12}}>
                      <div className="gas-row">
                        <span className="gas-label">⚙️ Network Fee</span>
                        <span className="gas-value gold">~0.0020 {currentChainInfo.label}</span>
                      </div>
                      <div className="gas-row">
                        <span className="gas-label">⏱ Estimated Time</span>
                        <span className="gas-value">~30 seconds</span>
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={handleTransfer} disabled={!transferTo || !transferAmount || !!loading}>
                      ⚔️ Confirm Transfer
                    </button>
                  </div>
                )}

                {/* Activity Log */}
                <div className="card">
                  <div className="card-title"><span className="icon">📜</span> Activity Log</div>
                  {activities.length === 0 ? (
                    <div className="empty-state">
                      <div className="icon">📋</div>
                      <div>No activity yet. Create a wallet to begin.</div>
                    </div>
                  ) : (
                    activities.map(a => (
                      <div key={a.id} className="activity-item">
                        <div className="activity-icon">{a.icon}</div>
                        <div className="activity-body">
                          <div className="activity-title">{a.title}</div>
                          <div className="activity-meta">{a.meta}</div>
                        </div>
                        <div style={{fontSize:11, color:'var(--text-muted)', flexShrink:0}}>{a.time}</div>
                      </div>
                    ))
                  )}
                </div>

                {/* Mnemonic Backup */}
                <div className="card">
                  <div className="card-title"><span className="icon">🗝️</span> Mnemonic Backup</div>
                  <div className="alert alert-danger" style={{fontSize:12}}>
                    🚫 Never share your mnemonic with anyone! Store offline on paper only.
                  </div>
                  {!mnemonic ? (
                    <button className="btn btn-danger" onClick={handleExportMnemonic}>
                      👁 Show Mnemonic (use with caution)
                    </button>
                  ) : (
                    <>
                      <div className="mnemonic-grid">
                        {mnemonic.split(' ').map((w, i) => (
                          <div key={i} className="mnemonic-word">
                            <div className="num">{i + 1}</div>
                            <div className="word">{w}</div>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-secondary" onClick={() => setMnemonic('')} style={{marginTop:10}}>
                        Hide Mnemonic
                      </button>
                    </>
                  )}
                </div>

                <button className="btn btn-secondary" onClick={handleClear}>
                  🔒 Lock Wallet
                </button>
              </>
            )}
          </>
        )}

        {/* === SECURITY TAB === */}
        {activeTab === 'security' && (
          <>
            <div className="card">
              <div className="card-title"><span className="icon">🛡️</span> URL Safety Scanner</div>
              <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:12}}>
                Paste any URL to check for phishing patterns and domain safety.
              </p>
              <div className="input-group">
                <label>Enter URL to scan</label>
                <div style={{display:'flex', gap:8}}>
                  <input
                    className="input"
                    placeholder="e.g. TOKEN.IM.HOMES or im-token.xyz"
                    value={checkUrl}
                    onChange={e => handleUrlChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCheckUrl()}
                    style={{flex:1}}
                  />
                  <button className="btn btn-primary btn-small" onClick={handleCheckUrl} disabled={!checkUrl.trim()}>
                    Scan
                  </button>
                </div>
              </div>
              {checkResult && (
                <div className={`risk-bar risk-${checkResult.level}`}>
                  <div className="risk-dot" style={{background: checkResult.color}} />
                  <div>
                    <strong>{checkResult.label}</strong> — {checkResult.message}
                  </div>
                </div>
              )}
            </div>

            {keystore && (
              <div className="card">
                <div className="card-title"><span className="icon">⚖️</span> Transaction Risk Assessment</div>
                <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:12}}>
                  Simulated risk levels for different transaction scenarios.
                </p>
                {[
                  { label: 'Normal Transfer', addr: currentAccount?.address || '', val: '1000000000000000000' },
                  { label: 'Large Transfer', addr: '0x0000000000000000000000000000000000000001', val: '100000000000000000000000' },
                ].map((tx, i) => {
                  const r = assessTxRisk(tx.addr, tx.val);
                  return (
                    <div key={i} style={{marginBottom:6}}>
                      <div style={{fontSize:12, color:'var(--text-secondary)', marginBottom:4}}>{tx.label}</div>
                      <div className={`risk-bar risk-${r.level}`}>
                        <div className="risk-dot" style={{background: r.color}} />
                        <div>
                          <strong>{r.label}</strong> — {r.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="card">
              <div className="card-title">
                <span className="icon">✅</span> Security Checklist
                <span style={{marginLeft:'auto', fontSize:12, fontWeight:400, color:'var(--accent-gold)'}}>
                  {checkedItems.size}/{SECURITY_CHECKLIST.length}
                </span>
              </div>
              {SECURITY_CHECKLIST.map(item => {
                const done = checkedItems.has(item.id);
                return (
                  <div key={item.id} className="check-item" onClick={() => toggleCheck(item.id)}>
                    <div className={`check-icon ${done ? 'done' : item.severity}`}>
                      {done ? '✓' : item.severity === 'danger' ? '!' : item.severity === 'warning' ? '⚠' : 'i'}
                    </div>
                    <div>
                      <div className="check-label" style={{textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.5 : 1}}>
                        {item.label}
                      </div>
                      <div className="check-desc">{item.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* === TOOLS TAB === */}
        {activeTab === 'tools' && (
          <>
            <div className="card">
              <div className="card-title"><span className="icon">✍️</span> Message Signing</div>
              <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:12}}>
                Powered by <strong style={{color:'var(--accent-gold)'}}>tcx-wasm sign_message</strong>. Sign locally — never expose private keys.
              </p>
              {!keystore ? (
                <div className="alert alert-warning">⚠️ Create a wallet first in the Wallet tab.</div>
              ) : (
                <>
                  <div className="chain-tabs">
                    {CHAINS.filter(c => accounts.some(a => a.chain === c.key)).map(c => (
                      <div key={c.key} className={`chain-tab ${selectedChain === c.key ? 'active' : ''}`} onClick={() => setSelectedChain(c.key)}>
                        {c.icon} {c.label}
                      </div>
                    ))}
                  </div>
                  <div className="input-group">
                    <label>Message</label>
                    <textarea
                      className="input"
                      placeholder="Enter message to sign..."
                      value={signMessageText}
                      onChange={e => setSignMessageText(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleSignMessage} disabled={!signMessageText || !!loading}>
                    ✍️ Sign Message ({currentChainInfo.label})
                  </button>
                  {signature && (
                    <div style={{marginTop:14}}>
                      <div style={{fontSize:12, fontWeight:700, marginBottom:6, color:'var(--accent-gold)'}}>Signature:</div>
                      <div className="address-display" style={{fontSize:11, maxHeight:80, overflow:'auto'}}>
                        {signature}
                      </div>
                      <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(signature)}>
                        Copy Signature
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="card">
              <div className="card-title"><span className="icon">⚡</span> Token Core APIs</div>
              <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:12}}>
                tcx-wasm WebAssembly capabilities used in this demo:
              </p>
              {[
                { api: 'create_keystore', desc: 'Create encrypted HD wallet (PBKDF2 600K rounds)', used: !!keystore },
                { api: 'derive_accounts', desc: 'Derive multi-chain addresses from mnemonic', used: accounts.length > 0 },
                { api: 'export_mnemonic', desc: 'Decrypt and export mnemonic from keystore', used: !!mnemonic },
                { api: 'sign_message', desc: 'Sign messages (PersonalSign, TRON, BIP-322)', used: !!signature },
                { api: 'sign_tx', desc: 'Sign transactions (EIP-155, EIP-1559, TRON, BTC)', used: false },
                { api: 'cache_keystore', desc: 'Cache keystore in WASM memory', used: !!keystore },
              ].map(item => (
                <div key={item.api} style={{display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)'}}>
                  <span className={`status-tag ${item.used ? 'connected' : 'disconnected'}`}>
                    {item.used ? '● Used' : '○ Ready'}
                  </span>
                  <div>
                    <div style={{fontSize:13, fontWeight:700, fontFamily:'SF Mono, Fira Code, monospace', color: item.used ? 'var(--accent-gold)' : 'var(--text-secondary)'}}>{item.api}</div>
                    <div style={{fontSize:11, color:'var(--text-muted)'}}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title"><span className="icon">ℹ️</span> About</div>
              <div style={{fontSize:13, color:'var(--text-secondary)', lineHeight:1.7}}>
                <p><strong style={{color:'var(--text-primary)'}}>SafeWallet</strong> is a security-first wallet demo for the imToken 10th Anniversary AI Co-creation.</p>
                <p style={{marginTop:10}}>Features:</p>
                <ul style={{paddingLeft:20, marginTop:4}}>
                  <li>Integration with <strong style={{color:'var(--accent-gold)'}}>Token Core (tcx-wasm)</strong> for local key management</li>
                  <li>Multi-chain account derivation (ETH, TRX, BTC)</li>
                  <li>Built-in URL phishing scanner & transaction risk assessment</li>
                  <li>Security checklist for wallet safety best practices</li>
                  <li>100% client-side — zero data leaves the browser</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="footer">
        Built with Token Core (tcx-wasm) for imToken 10th Anniversary<br />
        @imTokenCN &nbsp;|&nbsp; #imToken10周年 &nbsp;|&nbsp; #AI共创
      </div>
    </div>
  );
}

export default App;
