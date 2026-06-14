# Browser Cockpit / 娴忚鍣ㄩ┚椹惰埍

The browser cockpit is the runnable FC AI Companion product surface.
娴忚鍣ㄩ┚椹惰埍鏄?FC AI Companion 褰撳墠鍙繍琛岀殑浜у搧鐣岄潰銆?
It hosts / 瀹冨寘鍚細

- a JSNES-based local NES/FC runtime / 鍩轰簬 JSNES 鐨勬湰鍦?NES/FC 杩愯鏃?- 1P/2P input routing for human, AI, mixed, panel, gamepad, TAS-watch, and system inputs / 1P/2P 浜虹被銆丄I銆佹贩鍚堛€侀潰鏉裤€佹墜鏌勩€乀AS 瑙傜湅鍜岀郴缁熻緭鍏ヨ矾鐢?- RAM-backed tactical state panels / 鍩轰簬 RAM 鐘舵€佺殑鎴樻湳闈㈡澘
- local-only ROM and TAS loading endpoints for development / 浠呯敤浜庢湰鍦板紑鍙戠殑 ROM 涓?TAS 鍔犺浇绔偣

## Run Locally / 鏈湴杩愯

From the repository root / 浠庝粨搴撴牴鐩綍杩愯锛?
```powershell
npm install
npm run dev:cockpit
```

Open / 鎵撳紑锛?
```text
http://127.0.0.1:5173/
```

For a smoke-style local launch / 鏈湴鍐掔儫鍚姩鍦板潃锛?
```text
http://127.0.0.1:5173/?autoload=1&autorun=1&smoke=1
```

## ROM Loading / ROM 鍔犺浇

ROMs are not included in this repository. Use only files that you are legally allowed to use.
鏈粨搴撲笉鍖呭惈 ROM銆傝鍙娇鐢ㄤ綘鏈夊悎娉曚娇鐢ㄦ潈鐨勬湰鍦版枃浠躲€?
The Vite development server reads ROMs from / Vite 寮€鍙戞湇鍔″櫒鍙粠浠ヤ笅浣嶇疆璇诲彇 ROM锛?
- `FC_AI_COMPANION_ROM_PATH`, for one explicit ROM file / 鎸囧悜鍗曚釜 ROM 鏂囦欢
- `FC_AI_COMPANION_ROM_DIR`, for a local ROM library directory / 鎸囧悜鏈湴 ROM 鐩綍
- a sibling `../ROM` directory as the default local development fallback / 榛樿鍥為€€鍒颁粨搴撳悓绾?`../ROM` 鐩綍

Example on Windows PowerShell / Windows PowerShell 绀轰緥锛?
```powershell
$env:FC_AI_COMPANION_ROM_PATH = "D:\Ai-Play\ROM\contra_us_test.nes"
npm run dev:cockpit
```

Example on macOS/Linux / macOS/Linux 绀轰緥锛?
```bash
FC_AI_COMPANION_ROM_PATH="$HOME/ROM/contra_us_test.nes" npm run dev:cockpit
```

The browser can also load a local user-selected ROM through the file picker. ROM bytes, save states, BIOS files, and commercial archives must not be committed.
娴忚鍣ㄤ篃鍙互閫氳繃鏂囦欢閫夋嫨鍣ㄥ姞杞界敤鎴锋湰鍦伴€夋嫨鐨?ROM銆備笉寰楁彁浜?ROM 瀛楄妭銆佸嵆鏃跺瓨妗ｃ€丅IOS 鏂囦欢鎴栧晢涓氭父鎴忓帇缂╁寘銆?
## Audio / 澹伴煶

Browsers require a user gesture before audio can start. Click the audio enable control after the page loads.
娴忚鍣ㄨ姹傜敤鎴锋墜鍔垮悗鎵嶈兘鍚姩闊抽銆傞〉闈㈠姞杞藉悗璇风偣鍑诲惎鐢ㄥ０闊虫帶浠躲€?