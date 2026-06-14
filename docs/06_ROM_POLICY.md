# ROM and Asset Policy / ROM 涓庤祫浜ф斂绛?
This repository must not contain copyrighted game ROMs, BIOS files, save states, downloaded commercial game archives, or other protected game assets.
鏈粨搴撲笉寰楀寘鍚彈鐗堟潈淇濇姢鐨勬父鎴?ROM銆丅IOS銆佸嵆鏃跺瓨妗ｃ€佷笅杞藉緱鍒扮殑鍟嗕笟娓告垙鍘嬬缉鍖呮垨鍏朵粬鍙椾繚鎶ゆ父鎴忚祫浜с€?
Allowed repository content / 鍏佽鎻愪氦鐨勫唴瀹癸細

- source code / 婧愪唬鐮?- documentation / 鏂囨。
- RAM maps and schema files / RAM 鏄犲皠鍜?schema 鏂囦欢
- route coordinates and strategy metadata / 璺嚎鍧愭爣鍜岀瓥鐣ュ厓鏁版嵁
- generated evidence that does not include ROM bytes or save-state payloads / 涓嶅寘鍚?ROM 瀛楄妭鎴栧嵆鏃跺瓨妗ｈ浇鑽风殑璇佹嵁鏂囦欢
- instructions for loading a user's own local ROM files / 鍔犺浇鐢ㄦ埛鑷湁鏈湴 ROM 鐨勮鏄?
Forbidden repository content / 绂佹鎻愪氦鐨勫唴瀹癸細

- `.nes`, `.fds`, `.unf`, `.unif`, `.zip`, `.7z`, `.rar`, BIOS, save-state, or save files / ROM銆丅IOS銆佸嵆鏃跺瓨妗ｃ€佸瓨妗ｆ垨鍘嬬缉鍖?- ROM download links / ROM 涓嬭浇閾炬帴
- embedded ROM bytes / 鍐呭祵 ROM 瀛楄妭
- bundled commercial game assets / 鎵撳寘鐨勫晢涓氭父鎴忚祫浜?
Local user-owned files must stay outside the repository or inside ignored local-only directories.
鐢ㄦ埛鑷湁鏈湴鏂囦欢蹇呴』鏀惧湪浠撳簱澶栵紝鎴栨斁鍦ㄥ凡蹇界暐鐨勬湰鍦颁笓鐢ㄧ洰褰曚腑銆?
## Local Development Runtime / 鏈湴寮€鍙戣繍琛屾椂

The browser cockpit exposes development-only local endpoints such as / 娴忚鍣ㄩ┚椹惰埍鎻愪緵浠呯敤浜庢湰鍦板紑鍙戠殑绔偣锛屼緥濡傦細

```text
/api/local-roms
/api/local-test-rom
/api/local-tas-file
```

Rules / 瑙勫垯锛?
- `.env.local` is ignored by Git. / `.env.local` 宸茶 Git 蹇界暐銆?- Do not commit local ROM paths that reveal private filesystem details. / 涓嶆彁浜や細鏆撮湶绉佷汉鏂囦欢绯荤粺淇℃伅鐨勬湰鍦?ROM 璺緞銆?- Do not commit ROM bytes, BIOS files, save states, or downloaded archives. / 涓嶆彁浜?ROM 瀛楄妭銆丅IOS銆佸嵆鏃跺瓨妗ｆ垨涓嬭浇鍘嬬缉鍖呫€?- These endpoints are for local development only. / 杩欎簺绔偣浠呯敤浜庢湰鍦板紑鍙戙€?
## ROM Version Matching / ROM 鐗堟湰鍖归厤

Strategies, RAM maps, TAS-derived knowledge, route scripts, training traces, and language assets must be tied to explicit ROM profile metadata.
绛栫暐銆丷AM 鏄犲皠銆乀AS 娲剧敓鐭ヨ瘑銆佽矾绾胯剼鏈€佽缁冭建杩瑰拰璇枡璧勪骇蹇呴』缁戝畾鏄庣‘鐨?ROM Profile 鍏冩暟鎹€?
Rules / 瑙勫垯锛?
- Prefer checksum identification with MD5, SHA1, and SHA256. / 浼樺厛浣跨敤 MD5銆丼HA1銆丼HA256 鏍￠獙鍜岃瘑鍒€?- Treat filenames as helper labels only. / 鏂囦欢鍚嶅彧鑳戒綔涓鸿緟鍔╂爣绛俱€?- External material must state whether it is an exact match, validated compatible, or reference-only. / 澶栭儴璧勬枡蹇呴』鏍囨槑鏄簿纭尮閰嶃€佸凡楠岃瘉鍏煎锛岃繕鏄粎渚涘弬鑰冦€?- Unknown ROMs default to human play and RAM observation until compatibility is confirmed. / 鏈瘑鍒?ROM 榛樿鍙厑璁镐汉绫绘父鐜╁拰 RAM 瑙傚療锛岀洿鍒扮‘璁ゅ吋瀹规€с€?- TAS material is evidence and route knowledge, not an automatic live controller. / TAS 鏉愭枡鏄瘉鎹拰璺嚎鐭ヨ瘑锛屼笉鏄嚜鍔ㄥ疄鏃舵帶鍒跺櫒銆?- Different games, regional releases, hacks, and translations must be modeled as separate profiles. / 涓嶅悓娓告垙銆佸尯鍩熺増鏈€佹敼鐗堝拰缈昏瘧鐗堝繀椤诲缓妯′负涓嶅悓 profile銆?
See / 鍙傝锛?
```text
docs/09_ROM_VERSION_MATRIX.md
```
