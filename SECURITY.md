# Security Policy / 瀹夊叏鏀跨瓥

## Supported Version / 鏀寔鐗堟湰

The first public release line is `v0.1.x`.
棣栦釜鍏紑鍙戝竷绾挎槸 `v0.1.x`銆?
## Reporting / 鎶ュ憡鏂瑰紡

Do not open a public issue with private keys, tokens, local filesystem paths, ROM files, save states, or other sensitive data.
涓嶈鍦ㄥ叕寮€ issue 涓彁浜ょ閽ャ€乼oken銆佹湰鍦版枃浠剁郴缁熻矾寰勩€丷OM 鏂囦欢銆佸嵆鏃跺瓨妗ｆ垨鍏朵粬鏁忔劅鏁版嵁銆?
For now, report security issues privately to the project maintainer before publishing details. If no private contact channel has been configured on GitHub yet, create one before enabling public issue reporting.
鐩墠璇峰厛閫氳繃绉佸瘑娓犻亾鍚戦」鐩淮鎶よ€呮姤鍛婂畨鍏ㄩ棶棰橈紝鍐嶅叕寮€缁嗚妭銆傚鏋?GitHub 浠撳簱灏氭湭閰嶇疆绉佸瘑瀹夊叏鑱旂郴娓犻亾锛岃鍏堥厤缃悗鍐嶅紑鏀惧叕寮€ issue 鎶ュ憡銆?
## Sensitive Data Rules / 鏁忔劅鏁版嵁瑙勫垯

- Do not commit `.env`, `.env.local`, ROMs, BIOS files, save states, or local run artifacts. / 涓嶆彁浜?`.env`銆乣.env.local`銆丷OM銆丅IOS銆佸嵆鏃跺瓨妗ｆ垨鏈湴杩愯浜х墿銆?- Do not paste private tokens or account credentials into logs, issues, or discussions. / 涓嶅湪鏃ュ織銆乮ssue 鎴?discussion 涓矘璐寸瀵?token 鎴栬处鍙峰嚟鎹€?- Keep local ROM directories outside the repository. / 鏈湴 ROM 鐩綍搴旀斁鍦ㄤ粨搴撳銆?- Treat generated runtime search outputs as local artifacts unless they have been deliberately promoted into a sanitized fixture or documented evidence file. / 鐢熸垚鐨勮繍琛屾椂鎼滅储杈撳嚭榛樿瑙嗕负鏈湴浜х墿锛岄櫎闈炲凡鏄庣‘鎻愬崌涓鸿劚鏁?fixture 鎴栨枃妗ｅ寲璇佹嵁鏂囦欢銆?