# FC AI Companion Cockpit / FC AI 闄帺椹鹃┒鑸?
First public release line: `v0.1.x`
棣栦釜鍏紑鍙戝竷绾匡細`v0.1.x`

FC AI Companion Cockpit is a browser-based AI companion cockpit for NES/FC games.
FC AI 闄帺椹鹃┒鑸辨槸涓€涓潰鍚?NES/FC 娓告垙鐨勬祻瑙堝櫒 AI 闄帺椹鹃┒鑸便€?
The project goal is not to build an auto-clear bot. The goal is to let a player feel like they are playing with an AI teammate.
鏈」鐩洰鏍囦笉鏄埗浣滆嚜鍔ㄩ€氬叧鏈哄櫒浜猴紝鑰屾槸璁╃帺瀹舵劅瑙夎嚜宸辨鍦ㄥ拰涓€涓?AI 闃熷弸涓€璧风帺銆?
## Quick Start / 蹇€熷紑濮?
Requirements / 鐜瑕佹眰锛?
- Node.js 22 or newer / Node.js 22 鎴栨洿鏂扮増鏈?- npm
- A legally owned local NES/FC ROM file for runtime testing / 鐢ㄤ簬鏈湴杩愯娴嬭瘯鐨勫悎娉曡嚜鏈?NES/FC ROM 鏂囦欢

Install and run the browser cockpit / 瀹夎骞惰繍琛屾祻瑙堝櫒椹鹃┒鑸憋細

```powershell
npm install
npm run dev:cockpit
```

Open / 鎵撳紑锛?
```text
http://127.0.0.1:5173/
```

Windows ROM path example / Windows ROM 璺緞绀轰緥锛?
```powershell
$env:FC_AI_COMPANION_ROM_PATH = "D:\Ai-Play\ROM\contra_us_test.nes"
npm run dev:cockpit
```

macOS/Linux ROM path example / macOS/Linux ROM 璺緞绀轰緥锛?
```bash
FC_AI_COMPANION_ROM_PATH="$HOME/ROM/contra_us_test.nes" npm run dev:cockpit
```

Verify the project / 楠岃瘉椤圭洰锛?
```powershell
npm test
npm run build
```

## First Principles / 鍩烘湰鍘熷垯

- Player experience is more important than AI strength. / 鐜╁浣撻獙姣?AI 寮哄害鏇撮噸瑕併€?- Companion play is more important than stage clear. / 闄帺鎰熸瘮閫氬叧缁撴灉鏇撮噸瑕併€?- The fast brain must be RAM-driven and frame-synchronous. / 蹇剳蹇呴』鐢?RAM 鐘舵€侀┍鍔紝骞朵笌甯у悓姝ャ€?- The slow brain must be event-driven and must never block gameplay. / 鎱㈣剳蹇呴』鐢变簨浠堕┍鍔紝涓斾笉鑳介樆濉炴父鎴忚繍琛屻€?- Training is promoted only after the rule/FSM baseline is stable. / 瑙勫垯鍜?FSM 鍩虹嚎绋冲畾鍚庯紝璁粌缁撴灉鎵嶈繘鍏ュ彂甯冨綊绾炽€?
## Current Project Baseline / 褰撳墠椤圭洰鍩虹嚎

The AI already has basic action control / 褰撳墠 AI 宸插叿澶囧熀纭€鍔ㄤ綔鎺у埗锛?
- up / down / left / right
- run / 璺戝姩
- jump / 璺宠穬
- shoot / 灏勫嚮
- controller input / 鎵嬫焺杈撳叆

The current challenge is tactical quality, not raw button output.
褰撳墠鎸戞垬涓嶆槸鎸夐敭杈撳嚭鑳藉姏锛岃€屾槸鎴樻湳璐ㄩ噺銆?
The tactical layer includes / 鎴樻湳灞傚寘鎷細

- Danger Detector / 鍗遍櫓妫€娴?- Route Script / 璺嚎鑴氭湰
- Action Lock / 鍔ㄤ綔閿?- FSM / 鏈夐檺鐘舵€佹満

## MVP Scope / MVP 鑼冨洿

- Platform: NES/FC / 骞冲彴锛歂ES/FC
- Game target: Contra 1, Stage 1 / 娓告垙鐩爣锛氶瓊鏂楃綏 1 绗竴鍏?- Mode: two-player companion cockpit / 妯″紡锛氬弻浜洪櫔鐜╅┚椹惰埍
- Runtime: browser product platform / 杩愯鏃讹細娴忚鍣ㄤ骇鍝佸钩鍙?- Strategy package: current Contra Stage 1 candidate pack / 绛栫暐鍖咃細褰撳墠榄傛枟缃楃涓€鍏冲€欓€夌瓥鐣ュ寘

## Strategy Package Release / 绛栫暐鍖呭彂甯?
The trained strategy data prepared for this first public release lives in:

鏈棣栦釜鍏紑鐗堝綊绾冲彂甯冪殑璁粌绛栫暐鏁版嵁浣嶄簬锛?
```text
strategy-packs/contra/
apps/browser-cockpit/public/strategies/contra/stage1/
```

The strategy pack is released as a candidate strategy package. It includes current training evidence and runtime route exports, but it is not claimed as a fully validated no-death clear package.
璇ョ瓥鐣ュ寘浠ュ€欓€夌瓥鐣ュ寘褰㈠紡鍙戝竷锛屽寘鍚綋鍓嶈缁冭瘉鎹拰杩愯鏃惰矾绾垮鍑猴紝浣嗕笉澹版槑涓哄凡瀹屾暣楠岃瘉鐨勬棤姝讳骸閫氬叧鍖呫€?
## Repository Mode / 浠撳簱妯″紡

This is the clean project repository. Historical test packages and local ROM folders are references only and must not be developed in place.
杩欐槸椤圭洰鐨勬寮忓共鍑€浠撳簱銆傚巻鍙叉祴璇曞寘鍜屾湰鍦?ROM 鏂囦欢澶瑰彧浣滀负鍙傝€冿紝涓嶅簲鍦ㄥ師鍦扮户缁紑鍙戙€?
ROMs, BIOS files, save states, and copyrighted game assets must not be committed.
涓嶅緱鎻愪氦 ROM銆丅IOS銆佸嵆鏃跺瓨妗ｃ€佸瓨妗ｆ枃浠舵垨鍙楃増鏉冧繚鎶ょ殑鍟嗕笟娓告垙璧勪骇銆?
This repository is currently published as source-available software. See `LICENSE` before copying, modifying, or redistributing it.
鏈粨搴撳綋鍓嶄互 source-available 鏂瑰紡鍏紑銆傚鍒躲€佷慨鏀规垨鍐嶅垎鍙戝墠璇峰厛闃呰 `LICENSE`銆?
Public release notes and checklist / 鍏紑鍙戝竷璇存槑鍜屾鏌ユ竻鍗曪細

- `docs/RELEASE_NOTES_v0.1.0.md`
- `docs/PUBLIC_RELEASE_CHECKLIST.md`
- `docs/PROJECT_BACKGROUND.md`
- `docs/DEVELOPMENT_PROCESS.md`
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`

## Priority / 浼樺厛绾?
```text
survival > route > cooperation > combat > advance
鐢熷瓨 > 璺嚎 > 鍗忎綔 > 鎴樻枟 > 鎺ㄨ繘
```
