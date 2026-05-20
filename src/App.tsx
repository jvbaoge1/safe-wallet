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

type Tab = 'wallet' | 'security' | 'tools';

const CHAINS = ['ETHEREUM', 'TRON', 'BITCOIN'];

function App() {
  const [wasmReady, setWasmReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('wallet');
  const [password, setPassword] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [keystore, setKeystore] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedChain, setSelectedChain] = useState('ETHEREUM');
  const [signMessage, setSignMessageText] = useState('');
  const [signature, setSignature] = useState('');
  const [checkUrl, setCheckUrl] = useState('');
  const [checkResult, setCheckResult] = useState<ReturnType<typeof assessUrlRisk> | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

      // Derive accounts for all chains
      const accs = JSON.parse(derive_accounts(JSON.stringify({
        key: password,
        derivations: [
          { chain: 'ETHEREUM', derivationPath: "m/44'/60'/0'/0/0", chainId: '1', network: 'MAINNET' },
          { chain: 'TRON', derivationPath: "m/44'/195'/0'/0/0", network: 'MAINNET' },
          { chain: 'BITCOIN', derivationPath: "m/84'/0'/0'/0/0", network: 'MAINNET', segWit: 'VERSION_0' },
        ],
      })));
      setAccounts(accs);
      setMnemonic('');
      setLoading('');
      setSuccess('Wallet created successfully! Multi-chain accounts derived.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Failed to create wallet');
      setLoading('');
    }
  }, [password, mnemonicInput]);

  // Export mnemonic
  const handleExportMnemonic = useCallback(() => {
    if (!keystore || !password) { setError('Wallet not unlocked'); return; }
    try {
      const result = JSON.parse(export_mnemonic(JSON.stringify({ key: password })));
      setMnemonic(result.mnemonic);
    } catch (e: any) {
      setError(e.message || 'Failed to export mnemonic');
    }
  }, [keystore, password]);

  // Sign message
  const handleSignMessage = useCallback(() => {
    if (!keystore || !password || !signMessage) { setError('Fill in all fields'); return; }
    setLoading('Signing...');
    try {
      const chain = selectedChain;
      const derivationPath = chain === 'ETHEREUM' ? "m/44'/60'/0'/0/0" : chain === 'TRON' ? "m/44'/195'/0'/0/0" : "m/84'/0'/0'/0/0";
      const input = chain === 'ETHEREUM'
          ? { message: signMessage, signatureType: 'PersonalSign' }
          : chain === 'TRON'
          ? { value: signMessage, header: 'TRON', version: 2 }
          : { message: signMessage };
      const result = JSON.parse(sign_message(JSON.stringify({
        key: password,
        chain,
        input,
        // TRON doesn't use derivationPath in sign_message; ETH and BTC do
        ...(chain !== 'TRON' ? { derivationPath } : {}),
        ...(chain === 'BITCOIN' ? { network: 'MAINNET', segWit: 'VERSION_0' } : {}),
      })));
      setSignature(result.signature || result.signatures?.[0] || JSON.stringify(result));
      setLoading('');
      setSuccess('Message signed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to sign');
      setLoading('');
    }
  }, [keystore, password, signMessage, selectedChain]);

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
  }, []);

  // Check URL
  const handleCheckUrl = useCallback(() => {
    if (!checkUrl.trim()) return;
    const r = assessUrlRisk(checkUrl.trim());
    setCheckResult(r);
  }, [checkUrl]);

  // Clear URL result when input changes
  const handleUrlChange = useCallback((val: string) => {
    setCheckUrl(val);
    setCheckResult(null);
  }, []);

  // Toggle checklist
  const toggleCheck = (id: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Current account for selected chain
  const currentAccount = accounts.find(a => a.chain === selectedChain);

  if (!wasmReady) {
    return (
      <div className="app">
        <div className="header">
          <h1>SafeWallet</h1>
          <p className="subtitle">Powered by Token Core (tcx-wasm)</p>
          <span className="badge">imToken 10th Anniversary Co-creation</span>
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
        <p className="subtitle">Security-First Wallet Demo</p>
        <span className="badge">
          {keystore ? 'Wallet Unlocked' : 'Token Core Ready'}
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
        {error && <div className="alert alert-danger" onClick={() => setError('')}>{error} (click to dismiss)</div>}
        {success && <div className="alert alert-success" onClick={() => setSuccess('')}>{success}</div>}
        {loading && <div className="alert alert-info"><div className="spinner" style={{display:'inline-block',width:14,height:14,marginRight:6,verticalAlign:'middle'}}/>{loading}</div>}

        {/* === WALLET TAB === */}
        {activeTab === 'wallet' && (
          <>
            {!keystore ? (
              /* Create / Import Wallet */
              <div className="card">
                <div className="card-title">Create / Import Wallet</div>
                <p style={{fontSize:13, color:'var(--text-secondary)', marginBottom:16}}>
                  Uses <strong>tcx-wasm create_keystore</strong> to generate a secure HD wallet locally in your browser.
                </p>

                <div className="input-group">
                  <label>Password (to encrypt keystore)</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label>Mnemonic (optional, leave empty for random generation)</label>
                  <textarea
                    className="input"
                    placeholder="e.g. inject kidney empty canal shadow pact comfort wife crush horse wife sketch"
                    value={mnemonicInput}
                    onChange={e => setMnemonicInput(e.target.value)}
                  />
                </div>

                <div className="alert alert-warning" style={{fontSize:12}}>
                  All operations run locally in your browser via WebAssembly. No data is sent to any server.
                </div>

                <button className="btn btn-primary" onClick={handleCreateWallet} disabled={!password || !!loading}>
                  {mnemonicInput.trim() ? 'Import Wallet' : 'Create New Wallet'}
                </button>
              </div>
            ) : (
              /* Wallet Dashboard */
              <>
                {/* Chain Selector & Address */}
                <div className="card">
                  <div className="card-title">My Accounts</div>
                  <div className="chain-tabs">
                    {CHAINS.map(c => (
                      <div key={c} className={`chain-tab ${selectedChain === c ? 'active' : ''}`} onClick={() => setSelectedChain(c)}>
                        {c === 'ETHEREUM' ? 'ETH' : c === 'TRON' ? 'TRX' : 'BTC'}
                      </div>
                    ))}
                  </div>
                  {currentAccount && (
                    <>
                      <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                        <span className="address-label">{currentAccount.chain}</span>
                        <span className="status-tag connected">Active</span>
                      </div>
                      <div className="address-display" style={{position:'relative'}}>
                        {currentAccount.address}
                        <button className="copy-btn" style={{position:'absolute',top:6,right:6}} onClick={() => navigator.clipboard?.writeText(currentAccount.address)}>Copy</button>
                      </div>
                      <div style={{fontSize:11, color:'var(--text-muted)', marginTop:4}}>
                        Path: {currentAccount.derivationPath}
                      </div>
                    </>
                  )}
                </div>

                {/* Multi-chain Summary */}
                <div className="card">
                  <div className="card-title">Multi-Chain Derivation</div>
                  <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:8}}>
                    Powered by <strong>tcx-wasm derive_accounts</strong> - single mnemonic derives all chains.
                  </p>
                  {accounts.map(acc => (
                    <div key={acc.chain} style={{padding:'8px 0', borderBottom:'1px solid var(--border)'}}>
                      <div style={{fontSize:13, fontWeight:600}}>
                        {acc.chain === 'ETHEREUM' ? 'ETH' : acc.chain === 'TRON' ? 'TRX' : 'BTC'}
                      </div>
                      <div className="address-display" style={{margin:4, padding:8, fontSize:11}}>
                        {acc.address}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mnemonic Export */}
                <div className="card">
                  <div className="card-title">Mnemonic Backup</div>
                  <div className="alert alert-danger" style={{fontSize:12}}>
                    Never share your mnemonic with anyone! Store it offline on paper only.
                  </div>
                  {!mnemonic ? (
                    <button className="btn btn-danger" onClick={handleExportMnemonic}>
                      Show Mnemonic (use with caution)
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
                      <button className="btn btn-secondary" onClick={() => setMnemonic('')} style={{marginTop:8}}>
                        Hide Mnemonic
                      </button>
                    </>
                  )}
                </div>

                <button className="btn btn-secondary" onClick={handleClear}>
                  Lock Wallet &amp; Clear
                </button>
              </>
            )}
          </>
        )}

        {/* === SECURITY TAB === */}
        {activeTab === 'security' && (
          <>
            {/* URL Risk Checker */}
            <div className="card">
              <div className="card-title">URL Safety Checker</div>
              <div className="input-group">
                <label>Enter a URL to check</label>
                <div style={{display:'flex', gap:8}}>
                  <input
                    className="input"
                    placeholder="e.g. TOKEN.IM.HOMES"
                    value={checkUrl}
                    onChange={e => handleUrlChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCheckUrl()}
                    style={{flex:1}}
                  />
                  <button className="btn btn-primary btn-small" onClick={handleCheckUrl} disabled={!checkUrl.trim()}>
                    Check
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

            {/* Transaction Risk */}
            {keystore && (
              <div className="card">
                <div className="card-title">Transaction Risk Assessment</div>
                <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:8}}>
                  Before signing any transaction, verify the risk level.
                </p>
                {(() => {
                  const r = assessTxRisk(currentAccount?.address || '', '1000000000000000000');
                  return (
                    <div className={`risk-bar risk-${r.level}`}>
                      <div className="risk-dot" style={{background: r.color}} />
                      <div>
                        <strong>{r.label}</strong> — {r.message}
                      </div>
                    </div>
                  );
                })()}
                {(() => {
                  const r = assessTxRisk('0x0000000000000000000000000000000000000001', '100000000000000000000000');
                  return (
                    <div className={`risk-bar risk-${r.level}`} style={{marginTop:8}}>
                      <div className="risk-dot" style={{background: r.color}} />
                      <div>
                        <strong>{r.label}</strong> — {r.message}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Security Checklist */}
            <div className="card">
              <div className="card-title">Security Checklist ({checkedItems.size}/{SECURITY_CHECKLIST.length})</div>
              {SECURITY_CHECKLIST.map(item => {
                const done = checkedItems.has(item.id);
                return (
                  <div key={item.id} className="check-item" style={{cursor:'pointer'}} onClick={() => toggleCheck(item.id)}>
                    <div className={`check-icon ${done ? 'done' : item.severity}`}>
                      {done ? '\u2713' : item.severity === 'danger' ? '!' : item.severity === 'warning' ? '\u26A0' : 'i'}
                    </div>
                    <div>
                      <div className="check-label" style={{textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1}}>
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
            {/* Message Signing */}
            <div className="card">
              <div className="card-title">Message Signing</div>
              <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:12}}>
                Powered by <strong>tcx-wasm sign_message</strong>. Sign any message locally — never expose your private key.
              </p>
              {!keystore ? (
                <div className="alert alert-warning">Please create/import a wallet first in the Wallet tab.</div>
              ) : (
                <>
                  <div className="chain-tabs">
                    {CHAINS.map(c => (
                      <div key={c} className={`chain-tab ${selectedChain === c ? 'active' : ''}`} onClick={() => setSelectedChain(c)}>
                        {c === 'ETHEREUM' ? 'ETH' : c === 'TRON' ? 'TRX' : 'BTC'}
                      </div>
                    ))}
                  </div>
                  <div className="input-group">
                    <label>Message to sign</label>
                    <textarea
                      className="input"
                      placeholder="Enter message..."
                      value={signMessage}
                      onChange={e => setSignMessageText(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={handleSignMessage} disabled={!signMessage || !!loading}>
                    Sign Message ({selectedChain})
                  </button>
                  {signature && (
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:12, fontWeight:600, marginBottom:4}}>Signature:</div>
                      <div className="address-display" style={{fontSize:11, maxHeight:80, overflow:'auto'}}>
                        {signature}
                      </div>
                      <button className="copy-btn" onClick={() => navigator.clipboard?.writeText(signature)}>
                        Copy
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Token Core Capabilities */}
            <div className="card">
              <div className="card-title">Token Core (tcx-wasm) Capabilities</div>
              <p style={{fontSize:12, color:'var(--text-secondary)', marginBottom:12}}>
                This demo uses the following Token Core APIs running in WebAssembly:
              </p>
              {[
                { api: 'create_keystore', desc: 'Create encrypted HD wallet keystore (PBKDF2 600K rounds)', used: !!keystore },
                { api: 'derive_accounts', desc: 'Derive multi-chain addresses (ETH, TRON, BTC) from single mnemonic', used: accounts.length > 0 },
                { api: 'export_mnemonic', desc: 'Decrypt and export mnemonic from encrypted keystore', used: !!mnemonic },
                { api: 'sign_message', desc: 'Sign messages (PersonalSign, TRON, BIP-322) locally in browser', used: !!signature },
                { api: 'sign_tx', desc: 'Sign transactions (EIP-155, EIP-1559, TRON, BTC UTXO) locally', used: false },
                { api: 'cache_keystore', desc: 'Cache keystore in WASM memory for batch operations', used: !!keystore },
              ].map(item => (
                <div key={item.api} style={{display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
                  <span className={`status-tag ${item.used ? 'connected' : 'disconnected'}`}>
                    {item.used ? 'Used' : 'Available'}
                  </span>
                  <div>
                    <div style={{fontSize:13, fontWeight:600, fontFamily:'monospace'}}>{item.api}</div>
                    <div style={{fontSize:11, color:'var(--text-secondary)'}}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="card">
              <div className="card-title">About This Demo</div>
              <div style={{fontSize:13, color:'var(--text-secondary)'}}>
                <p><strong>SafeWallet</strong> is a security-focused wallet demo built for the imToken 10th Anniversary AI Co-creation.</p>
                <p style={{marginTop:8}}>It demonstrates:</p>
                <ul style={{paddingLeft:20, marginTop:4}}>
                  <li>Integration with <strong>Token Core (tcx-wasm)</strong> for local key management</li>
                  <li>Multi-chain account derivation (Ethereum, Tron, Bitcoin)</li>
                  <li>Built-in security risk assessment (URL checker, transaction risk)</li>
                  <li>Security checklist for wallet safety best practices</li>
                  <li>All operations run 100% locally — zero data leaves the browser</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="footer">
        Built with Token UI + Token Core (tcx-wasm) for imToken 10th Anniversary<br />
        @imTokenCN | #imToken10周年 | #AI共创
      </div>
    </div>
  );
}

export default App;
