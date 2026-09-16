<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="mcp-arcade-cabinets" width="560" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/"><img src="https://img.shields.io/badge/Play-in_the_browser-blue" alt="Play in the browser" /></a>
</p>

<p align="center">
  <strong>Arcade games made from what MCP servers said on the wire.</strong>
</p>

**mcp-arcade-कैबिनेट** आर्केड है। प्रत्येक कैबिनेट एक छोटा गेम है जो एक ही चेसिस पर बनाया गया है: यह **टेप** पढ़ता है, वे रिकॉर्डिंग जो [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) एक एमसीपी सर्वर और एक एजेंट के बीच की लड़ाई की रखता है, और उन्हें उस चीज़ में बदल देता है जिसे आप खेल सकते हैं। एक कैबिनेट कभी भी सर्वर से बात नहीं करता है, कभी भी कोई रसीद लोड नहीं करता है, और कभी भी ऐसा स्कोर नहीं रखता है जिसे उपकरण देख सके। आप हमेशा मॉडल होते हैं; गेम इस बात में भिन्न होते हैं कि रिग आपसे क्या करने के लिए कहता है।

[ब्राउज़र में खेलें](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [हैंडबुक](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/)

## कैबिनेट

| कैबिनेट                                                 | यह क्या है                                                                                                                                                                                                          | स्थिति                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[मेनू पर भूत](packages/ghost-on-the-menu/README.md)** | एक छोटा रेट्रो शूटर। रिग आपको कॉल देता है; एजेंट को जिन कॉल नहीं करनी चाहिए थीं, वे ईमानदार लोगों के बीच छिपी हुई हैं और हिट पर प्रकट होती हैं। बॉस प्रयोग हैं, और एक स्थानीय मॉडल उनमें बैठ सकता है।               | जारी, `v0.10.0`। [खेलें](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/ghost-on-the-menu` · [डॉकर](https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/pkgs/container/mcp-arcade-cabinets) |
| **[वाइब टाइपर](packages/vibe-typer/README.md)**         | एक टाइपिंग आर्केड गेम। आप एक मेहनती, चापलूस कोडिंग एजेंट हैं; आपका उपयोगकर्ता एक वाइब कोडर है जिसके अनुरोध बेतुके हैं। कोड टाइप करें, देखें कि चीज़ कैसे बनती है, और मूल्यांकन ऊपर चला जाता है। स्तर, अंतहीन, कठिन। | जारी, `v0.10.0`। [खेलें](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · `npx @mcptoolshop/vibe-typer` · [डिजाइन और लॉक](docs/vibe-typer.dispatch.md)                                                               |
| **House Call**                                          | एक टर्न-आधारित अंशांकन गेम: एक कॉल और एक आत्मविश्वास बताएं, फिर टेप बताता है कि क्या हुआ।                                                                                                                           | जब तक कि कोई ऐसा डिज़ाइन न हो जो खेले, तब तक रोक दिया गया। `tape-core` अपने स्कोरिंग नियमों को बनाए रखता है।                                                                                                                         |

अधिक कैबिनेट यहां आएंगे। प्रत्येक का अपना पैकेज, हैंडबुक में इसका अपना पृष्ठ और इस तालिका में इसकी अपनी पंक्ति होगी।

## प्रत्येक कैबिनेट में क्या समान है

- **टेप अंदर, कुछ भी बाहर नहीं।** `packages/tape-core` `mcp-arcade.tape/v1` लोड करता है, किसी भी चीज़ को अस्वीकार करता है जिसमें स्कोर या निर्णय होता है, और गेम हेडर शब्द, तार की पंक्तियाँ और प्रति परमाणु एक बंद तथ्य देता है। बीस रिकॉर्डिंग `fixtures/tapes/` में शिप की जाती हैं।
- **एक हेडलेस सिम और एक पतला खोल।** प्रत्येक गेम एक शुद्ध, सीडेड सिमुलेशन है जिसमें एक स्क्रिप्टेड प्ले-थ्रू और एक निष्पक्षता बैंड होता है जो निर्माण को विफल कर देता है। `apps/cabinets` ब्राउज़र शेल है जो उन्हें माउंट करता है और यह वह है जो पेज `/play/` पर परोसता है।
- **डेटा लीवर, कोड नहीं।** तरंगें, आवाजें, कठिनाई, पंक्तियाँ: प्रत्येक पैकेज के `patterns/` के तहत JSON, लोड पर मान्य, ताकि गेम को फिर से बनाए बिना ट्यून किया जा सके।
- **एक मॉडल के लिए एक सीट, एक गेट के पीछे।** एक स्थानीय या क्लाउड मॉडल एक कैबिनेट में बैठ सकता है (भूत में एक बॉस, वाइब टाइपर के अंतहीन मोड में उपयोगकर्ता)। यह केवल एक बंद सेट से एक लीवर भरता है, इसकी लिखी प्रत्येक पंक्ति एक शब्द गेट से गुजरती है, और क्षेत्र में कुछ भी इसका नाम नहीं देता है। एक कैबिनेट stdio पर एक एमसीपी सर्वर के रूप में भी चल सकता है, इसलिए एक एजेंट वह हो सकता है जो खेल रहा है।
- **एक आवाज।** एक होस्ट-साइड वर्कर (`voice/`) उन पंक्तियों को बोलता है जिन्हें एक गेट ने स्वीकार किया है, [fx-dub](https://github.com/mcp-tool-shop-org/fx-dub) द्वारा खेलने से पहले।

पूरा विवरण हैंडबुक के [आर्किटेक्चर](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/architecture/) और [सुरक्षा](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/security/) पृष्ठों में है।

## लेआउट

```
packages/tape-core          the tape loader, schema and calibration math
packages/ghost-on-the-menu  the shooter: sim, patterns, bots, render
packages/vibe-typer         the typing game: sim, levers, corpus, bots
packages/house-call         parked
packages/cabinet-server     the cabinets as a stdio MCP server; the say gate; personas
packages/launcher           @mcptoolshop/ghost-on-the-menu: npx serves Ghost; --mcp is its server
packages/launcher-vibe-typer  @mcptoolshop/vibe-typer: npx serves Vibe Typer; the pack script is shared
apps/cabinets               the browser shell, served by Pages at /play/
fixtures/tapes              twenty recordings, tape JSON only
docs/                       one dispatch (research + lock) and one review per slice
site/                       the landing page and the Starlight handbook
voice/                      the Kokoro voice worker and its compose file
catalog/                    the Docker MCP Catalog entry
```

## खेलें

ब्राउज़र में: [`/play/`](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/)। पृष्ठ दो कैबिनेटों के बीच एक स्विच पर खुलता है और याद रखता है कि आपने पिछली बार कौन सा खेला था। प्रकाशित पृष्ठ में कोई डेमॉन नहीं है, इसलिए मॉडल और आवाज सीटें वहां अनुपस्थित हैं।

स्थानीय रूप से, सीटों के साथ, कुछ भी क्लोन करने की आवश्यकता नहीं है:

```bash
npx @mcptoolshop/ghost-on-the-menu
```

```bash
npx @mcptoolshop/vibe-typer
```

प्रत्येक कैबिनेट अपना पैकेज है। प्रत्येक कमांड `127.0.0.1` पर अपना गेम परोसता है और इसे खोलता है। भूत का `--mcp` इसे stdio पर एक एमसीपी सर्वर के रूप में चलाता है; वाइब टाइपर के कंटेनर उपकरण स्लाइस 4 हैं, इसलिए इसका `--mcp` ऐसा कहता है और बाहर निकल जाता है। नोड 22 या नया। ये दो पैकेज ही npm पर हैं; यहां प्रत्येक अन्य पैकेज निजी है, और दो कैबिनेटों के बीच स्विच केवल पेज बिल्ड है।

आर्केड पर काम करने के लिए, इसे क्लोन करें। आपको नोड 22 और pnpm 11 की आवश्यकता है:

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

`pnpm verify` गेट है: लिंट, प्रकार, परीक्षण, निर्माण और प्रत्येक कैबिनेट का स्क्रिप्टेड प्ले-थ्रू। मॉडल सीट के लिए, उसी मशीन पर एक ओलामा डेमॉन चलाएं; आवाज के लिए, [`voice/`](voice/) और `pnpm voice` देखें।

अपना सर्वर चलाने के लिए, mcp-arcade के साथ एक लड़ाई रिकॉर्ड करें, फिर `mcp-arcade tape receipt.json -o your.tape.json` और इसे फिक्स्चर के बगल में छोड़ दें। कंटेनर टेपों की एक रीड-ओनली वॉल्यूम लेता है।

## एक कैबिनेट जोड़ना

एक नया गेम `docs/` में एक प्रेषण के रूप में शुरू होता है: अनुसंधान आधार, वह लॉक जिसे यह विरासत में प्राप्त करता है और बढ़ाता है, इसके डेटा लीवर और इसके स्लाइस। फिर एक पैकेज जो ऊपर दिए गए आकार का पालन करता है, `apps/cabinets` में एक माउंट, यहां तालिका में एक पंक्ति और हैंडबुक में एक पृष्ठ। संस्करण तब तक `0.x` रहता है जब तक कि निर्देशक अन्यथा न कहे, और कोई भी तीसरा पैकेज npm पर समान शब्द के बिना नहीं जाता है।

## अधिक

क्या जारी किया गया, और कब, यह [चेंजलॉग](CHANGELOG.md) में है। गेम क्या छूते हैं, यह [SECURITY.md](SECURITY.md) में है।

एमआईटी। [एमसीपी टूल शॉप](https://mcp-tool-shop.github.io/) द्वारा निर्मित।
