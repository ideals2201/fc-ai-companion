# Contributing and Development Guide / 璐＄尞涓庡紑鍙戣鏄?
## Development Environment / 寮€鍙戠幆澧?
Use Node.js 22 or newer.
璇蜂娇鐢?Node.js 22 鎴栨洿鏂扮増鏈€?
Install dependencies:

瀹夎渚濊禆锛?
```powershell
npm install
```

Run the browser cockpit:

杩愯娴忚鍣ㄩ┚椹惰埍锛?
```powershell
npm run dev:cockpit
```

Run verification:

杩愯楠岃瘉锛?
```powershell
npm test
npm run build
git diff --check
```

## Strategy Package Workflow / 绛栫暐鍖呭伐浣滄祦

Strategy package source files live in:

绛栫暐鍖呮簮鏂囦欢浣嶄簬锛?
```text
strategy-packs/contra/
```

Runtime strategy exports live in:

杩愯鏃剁瓥鐣ュ鍑轰綅浜庯細

```text
apps/browser-cockpit/public/strategies/contra/stage1/
```

After changing `strategy-packs/contra/stages/stage-1/stage-plan.json`, regenerate runtime exports:

淇敼 `strategy-packs/contra/stages/stage-1/stage-plan.json` 鍚庯紝璇烽噸鏂扮敓鎴愯繍琛屾椂瀵煎嚭锛?
```powershell
npm run sync:strategies
```

Do not promote a strategy from `candidate` to validated unless there is a real ValidationReport and the required quality gates pass.
闄ら潪鏈夌湡瀹?ValidationReport 涓斿繀瑕佽川閲忛棬閫氳繃锛屽惁鍒欎笉瑕佹妸绛栫暐浠?`candidate` 鎻愬崌涓?validated銆?
## Git Rules / Git 瑙勫垯

Stage files intentionally. Do not use broad staging for release commits.
璇锋湁鎰忚瘑鍦伴€愰」鏆傚瓨鏂囦欢銆傚彂甯冩彁浜や笉瑕佷娇鐢ㄧ矖鏆寸殑鍏ㄩ噺鏆傚瓨銆?
Recommended checks before committing:

鎻愪氦鍓嶅缓璁鏌ワ細

```powershell
git status --short
git diff --stat
git diff --check
npm test
npm run build
```

Generated local artifacts must stay out of commits:

鏈湴鐢熸垚浜х墿涓嶅緱鎻愪氦锛?
- `codex-*`
- `*.patch`
- `*_BACKUP*`
- `data/training/contra/runtime_runs/**/candidate-overlays/`
- `data/training/contra/runtime_runs/**/segment-search-reports/`
- `data/training/contra/runtime_runs/**/states/`
- `node_modules/`
- `dist/`, `build/`, `.vite/`, `*.tsbuildinfo`

## ROM and Asset Rules / ROM 涓庤祫浜ц鍒?
Do not commit ROMs, BIOS files, save states, commercial archives, or ROM download links.
涓嶈鎻愪氦 ROM銆丅IOS銆佸嵆鏃跺瓨妗ｃ€佸晢涓氬帇缂╁寘鎴?ROM 涓嬭浇閾炬帴銆?
Use local environment variables for ROM testing:

娴嬭瘯 ROM 鏃惰浣跨敤鏈湴鐜鍙橀噺锛?
```powershell
$env:FC_AI_COMPANION_ROM_PATH = "D:\Ai-Play\ROM\contra_us_test.nes"
npm run dev:cockpit
```

macOS/Linux:

```bash
FC_AI_COMPANION_ROM_PATH="$HOME/ROM/contra_us_test.nes" npm run dev:cockpit
```

## Public Release Process / 鍏紑鍙戝竷娴佺▼

For a public release:

鍏紑鍙戝竷鏃讹細

1. Update release notes and checklist. / 鏇存柊鍙戝竷璇存槑鍜屾鏌ユ竻鍗曘€?2. Sync strategy runtime exports. / 鍚屾杩愯鏃剁瓥鐣ュ鍑恒€?3. Run tests, build, audit, and diff checks. / 杩愯娴嬭瘯銆佹瀯寤恒€佸璁″拰 diff 妫€鏌ャ€?4. Commit only intended source, docs, tests, and strategy package files. / 鍙彁浜ら鏈熺殑婧愮爜銆佹枃妗ｃ€佹祴璇曞拰绛栫暐鍖呮枃浠躲€?5. Tag the release, for example `v0.1.0`. / 鍒涘缓鍙戝竷 tag锛屼緥濡?`v0.1.0`銆?6. Push branch and tag after the GitHub remote is configured. / 閰嶇疆 GitHub remote 鍚庡啀鎺ㄩ€佸垎鏀拰 tag銆?