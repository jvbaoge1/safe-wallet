import init, {
  create_keystore,
  derive_accounts,
  export_mnemonic,
  sign_message,
  cache_keystore,
  clear_cached_keystore,
} from '@consenlabs/tcx-wasm';
import type { InitOutput } from '@consenlabs/tcx-wasm';

let wasmInstance: InitOutput | null = null;

export async function initTcxWasm(): Promise<void> {
  if (wasmInstance) return;
  wasmInstance = await init('./tcx_wasm_bg.wasm');
}

export { create_keystore, derive_accounts, export_mnemonic, sign_message, cache_keystore, clear_cached_keystore };
