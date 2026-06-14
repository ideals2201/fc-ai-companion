# Contra Strategy Pack / 榄傛枟缃楃瓥鐣ュ寘

This directory stores the official StrategyPack files for `gameProfileId = contra`.
鏈洰褰曚繚瀛?`gameProfileId = contra` 鐨勬寮?StrategyPack 鏂囦欢銆?
Current package / 褰撳墠绛栫暐鍖咃細

- Name / 鍚嶇О锛欳ontra Stage 1 Strategy Pack V0 / 榄傛枟缃楃涓€鍏崇瓥鐣ュ寘 V0
- Pack ID / 绛栫暐鍖?ID锛歚contra-stage1-strategy-v0`
- Version / 鐗堟湰锛歚0.1.0`
- Status / 鐘舵€侊細`candidate`

## Current Content / 褰撳墠鍐呭

- `manifest.json` declares supported ROM profiles, strategy keys, TAS training bases, side baselines, quality metadata, and package files. / `manifest.json` 澹版槑鏀寔鐨?ROM Profile銆佺瓥鐣ラ敭銆乀AS 璁粌鍩哄骇銆乻ide baseline銆佽川閲忓厓鏁版嵁鍜屽寘鏂囦欢绱㈠紩銆?- `game-profile.json`, `rom-profiles/`, and `research/` define game, ROM, condition, action, entity, and strategy taxonomy data. / `game-profile.json`銆乣rom-profiles/` 鍜?`research/` 瀹氫箟娓告垙銆丷OM銆佹潯浠躲€佸姩浣溿€佸疄浣撳拰绛栫暐鍒嗙被鏁版嵁銆?- `stages/stage-1/fragments.json` stores current candidate StrategyFragments. / `stages/stage-1/fragments.json` 淇濆瓨褰撳墠鍊欓€?StrategyFragment銆?- `stages/stage-1/training-progress.json` records the current measured training ledger. / `stages/stage-1/training-progress.json` 璁板綍褰撳墠瀹炴祴璁粌璐︽湰銆?- `data/training/contra/tas_bases/contra-j-good/side-baselines.json` is a TAS-derived side-owned baseline for training reference. / `data/training/contra/tas_bases/contra-j-good/side-baselines.json` 鏄?TAS 娲剧敓鐨?side-owned 璁粌鍙傝€冨熀绾裤€?- `dev-handoff/current-training-20260608/` preserves the current training handoff package for future developers. / `dev-handoff/current-training-20260608/` 淇濆瓨褰撳墠璁粌浜ゆ帴鍖咃紝渚涘悗缁紑鍙戠户缁帴鎵嬨€?
This package is candidate research data, not a fully validated clear package.
鏈瓥鐣ュ寘鏄€欓€夌爺绌舵暟鎹紝涓嶆槸宸插畬鏁撮獙璇佺殑閫氬叧鍖呫€?
## Runtime Exports / 杩愯鏃跺鍑?
Browser runtime strategy exports are generated into:

娴忚鍣ㄨ繍琛屾椂绛栫暐瀵煎嚭鐢熸垚鍒帮細

```text
apps/browser-cockpit/public/strategies/contra/stage1/
```

Regenerate them from the repository root with:

鍙湪浠撳簱鏍圭洰褰曟墽琛屼互涓嬪懡浠ら噸鏂扮敓鎴愶細

```powershell
npm run sync:strategies
```

## Strategy Pack Distribution Rule / 绛栫暐鍖呭垎鍙戣鍒?
Strategy packs may come from official project packs, project experiments, player personal packs, or TAS-derived packs.
绛栫暐鍖呭彲浠ユ潵鑷畼鏂归」鐩寘銆侀」鐩唴瀹為獙鍖呫€佺帺瀹朵釜浜哄寘鎴?TAS 娲剧敓鍖呫€?
To keep platform selection, comparison, training, and validation consistent, base strategy categories must remain stable:

涓轰簡璁╁钩鍙拌兘缁熶竴閫夋嫨銆佹瘮杈冦€佽缁冨拰楠岃瘉锛屽熀纭€绛栫暐鍒嗙被蹇呴』淇濇寔涓€鑷达細

- `survival` / 绋冲仴鐢熷瓨
- `speedrun` / 蹇€熸帹杩?- `combat` / 鏉€鏁屾竻鍦?- `loot` / 濂栧姳浼樺厛
- `guard` / 鎶ゅ崼鍗忎綔

Game-specific or player-specific categories are allowed, but they must be declared in `research/strategy-types.json`, and every StrategyFragment must reference declared categories only.
鍏佽娓告垙鎴栫帺瀹舵墿灞曞垎绫伙紝浣嗗繀椤诲啓鍏?`research/strategy-types.json`锛屼笖姣忎釜 StrategyFragment 鍙兘寮曠敤宸插０鏄庡垎绫汇€?
## Side-Owned Packs / 鍒嗕晶绛栫暐鍖?
1P and 2P may use different strategy packs, but they must share the same game, ROM profile, stage protocol version, and compatibility rules.
1P 鍜?2P 鍙互浣跨敤涓嶅悓绛栫暐鍖咃紝浣嗗繀椤绘弧瓒冲悓涓€娓告垙銆佸悓涓€ ROM Profile銆佸悓涓€鍏冲崱鍗忚鐗堟湰鍜屽吋瀹硅鍒欍€?
Dual-player cooperation must check package-to-package contracts:

鍙屼汉鍗忎綔杩樺繀椤绘鏌ュ寘涔嬮棿鐨勫崗浣滃绾︼細

- screen scroll ownership / 灞忓箷鎺ㄨ繘褰掑睘
- follow distance / 璺熼殢璺濈
- reward ownership / 濂栧姳褰掑睘
- fixed-target responsibility / 鍥哄畾鐩爣娓呴櫎璐ｄ换
- loop or deadlock risk caused by mixed strategy priorities / 涓嶅悓绛栫暐浼樺厛绾ф贩鐢ㄥ鑷寸殑鍗′綅鎴栨寰幆椋庨櫓

## Required Files For Distribution / 鍒嗗彂蹇呴渶鏂囦欢

A distributable strategy pack should include at least:

鍙垎鍙戠瓥鐣ュ寘鑷冲皯搴斿寘鍚細

- `manifest.json`
- `game-profile.json`
- matching `rom-profiles/*.json` / 瀵瑰簲鐨?`rom-profiles/*.json`
- `research/condition-registry.json`
- `research/action-map.json`
- `research/strategy-types.json`
- `stages/<stage-id>/fragments.json`
- necessary `trace-evidence/` or TAS-derived training artifacts / 蹇呰鐨?`trace-evidence/` 鎴?TAS 娲剧敓璁粌璧勬枡

TAS-derived data may be distributed as a training baseline, but it must not bypass Safety Override or real runtime validation, and it must not be used directly as a live AI controller.
TAS 娲剧敓鏁版嵁鍙互浣滀负璁粌鍩虹嚎鍒嗗彂锛屼絾涓嶈兘缁曡繃 Safety Override 鍜岀湡瀹炶繍琛岄獙璇侊紝涔熶笉鑳界洿鎺ヤ綔涓哄疄鏃?AI 鎺у埗鍣ㄣ€?