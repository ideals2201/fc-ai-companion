# Strategy Packs / 绛栫暐鍖?
This directory stores distributable FC AI Companion StrategyPack source files.
鏈洰褰曚繚瀛?FC AI Companion 鍙垎鍙戠瓥鐣ュ寘鐨勬簮鏂囦欢銆?
Rules / 瑙勫垯锛?
- One game uses one subdirectory named by `game-profile-id`. / 涓€涓父鎴忓搴斾竴涓互 `game-profile-id` 鍛藉悕鐨勫瓙鐩綍銆?- Each game package must follow `docs/16_OPERATION_STRATEGY_STANDARD.md` and `docs/STRATEGY_PROTOCOL_CORE.md`. / 姣忎釜娓告垙绛栫暐鍖呭繀椤婚伒瀹?`docs/16_OPERATION_STRATEGY_STANDARD.md` 鍜?`docs/STRATEGY_PROTOCOL_CORE.md`銆?- This directory is the source-of-truth archive for StrategyPack files. / 鏈洰褰曟槸 StrategyPack 鏂囦欢鐨勬爣鍑嗘簮褰掓。浣嶇疆銆?- Browser runtime strategy files may be generated or copied from this directory, but runtime exports are not the source of truth. / 娴忚鍣ㄨ繍琛屾椂绛栫暐鏂囦欢鍙互鐢辨湰鐩綍鐢熸垚鎴栧鍒讹紝浣嗚繍琛屾椂瀵煎嚭涓嶆槸鏍囧噯婧愩€?- This directory must not contain ROM files, commercial game assets, save states, BIOS files, or unauthorized material. / 鏈洰褰曚笉寰楀寘鍚?ROM銆佸晢涓氭父鎴忚祫浜с€佸嵆鏃跺瓨妗ｃ€丅IOS 鎴栨湭鎺堟潈绱犳潗銆?
Standard structure / 鏍囧噯缁撴瀯锛?
```text
strategy-packs/
  <game-profile-id>/
    manifest.json
    game-profile.json
    rom-profiles/
    research/
    stages/
    trace-evidence/
    schemas/
    docs/
```

Current public candidate package / 褰撳墠鍏紑鍊欓€夌瓥鐣ュ寘锛?
```text
strategy-packs/contra/
```
