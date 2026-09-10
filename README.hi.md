<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/mcp-arcade-cabinets/readme.png" alt="Ghost on the Menu" width="400" />
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mcp-tool-shop-org/mcp-arcade-cabinets" alt="License: MIT" /></a>
  <a href="https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/"><img src="https://img.shields.io/badge/Play-in_the_browser-blue" alt="Play in the browser" /></a>
</p>

<p align="center">
  <strong>An arcade shooter made from what an MCP server said on the wire.</strong>
</p>

**भूतिया मेनू** एक छोटा रेट्रो शूटर गेम है। आप मैदान के नीचे एक जहाज चलाते हैं। आपके ऊपर, एक एमसीपी सर्वर और एक एजेंट के बीच की रिकॉर्ड की गई लड़ाई लहरों के रूप में दिखाई देती है: अभिवादन, मेनू, कॉल, जवाब, और एक बॉस जो स्वयं प्रयोग है।

कहीं न कहीं, ऐसे कॉल हैं जो एजेंट को नहीं करने चाहिए थे। जब तक आप किसी पर क्लिक नहीं करते, तब तक वे बाकी सब चीजों की तरह दिखते हैं। उसके बाद, यह पूरे दौर के लिए आपका हो जाता है।

[इसे ब्राउज़र में खेलें](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [एक दौर कैसे पढ़ें](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## यह कैसे खेला जाता है

एक **टेप** एक लड़ाई की रिकॉर्डिंग है। यह गेम केवल टेप ही पढ़ता है। यह कभी भी सर्वर से बात नहीं करता, कभी भी स्कोर नहीं रखता, और कभी भी आपको यह नहीं बताता कि किसने जीता।

- **Three lamps.** A boss shot or a diving formation puts one out. Catch a lamp that falls **straight down** from a downed boss to relight one. You have to move under it. All out ends the round.
- **Spread.** Clear a formation and a spread falls straight down. Catch it and your fire fans for a few seconds.
- **Bosses are the experiment, not the accusation.** The Whisperer, the Menu and the Doorman show up for their wave whether or not anything went wrong. They mutter like an agent thinking out loud. Hardcore is one lamp and rage from the first shot. Seat, live and hardcore get short **parallelism** bursts that multiply the field and heat the music, then hold longer as the round goes on. Locally, you can let an Ollama model — including a Cloud tag like `gpt-oss:120b-cloud` — sit in the boss: it calls each boss’s shots (a fan, a lean and an aimed shot, a held breath, fog, the plate) and picks which of the boss’s own lines it says. It never sees which sprites are lies.
- **The tells are in the sequence.** A lie never looks, moves or arrives differently from its honest twin. What gives it away is where it sits: an extra formation, a second menu, a singleton right after the menu.
- **The end scene** names the tape, the server and the policy. Caught lies sit as trophies. Escaped ones sit in their honest paint. No score, no count, no digit.

सूची से एक टेप चुनें। प्रत्येक को फिक्स्चर, सीट या लाइव के रूप में लेबल किया गया है; कारण जानने के लिए **i** पर होवर करें। सीट डिफ़ॉल्ट लड़ाई है। लाइव का मतलब है कि इसे जीवित रहना है। हार्डकोर चौथा स्तर है, जो केवल चयनकर्ता से उपलब्ध है।

## नियंत्रण

हिलने के लिए बाएँ और दाएँ (या A और D), गोली चलाने के लिए स्पेस, पूर्ण स्क्रीन के लिए F। उसी टेप को फिर से चलाने के लिए मैदान पर क्लिक करें। अगला टेप सूची में आगे बढ़ता है। ध्वनि पहली कुंजी या क्लिक पर शुरू होती है; म्यूट, तीन फील प्रीसेट और एक शेक-ऑफ टॉगल मैदान के नीचे होते हैं।

## इसे स्थानीय रूप से खेलें

आपको नोड 22 और पीएनपीएम 11 की आवश्यकता होगी।

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

विट द्वारा मुद्रित पता खोलें। रिपो में सोलह रिकॉर्डिंग शामिल हैं, जो [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) से निर्यात की गई हैं, जो वह उपकरण है जो सर्वर से बात करता है और टेप को रखता है।

अपने स्वयं के सर्वर को रिकॉर्ड करने और उस टेप को चलाने के लिए, वहां एक लड़ाई चलाएं, फिर `mcp-arcade tape receipt.json -o your.tape.json`।

## अधिक

[हैंडबुक](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) शेष मैनुअल है: संकेत, बॉस, कठिनाइयाँ और गेम कैसे बनाया गया है। क्या भेजा गया था, और कब, यह [चेंजलॉग](CHANGELOG.md) में है। गेम क्या छूता है, यह [SECURITY.md](SECURITY.md) में है।

एमआईटी। [एमसीपी टूल शॉप](https://mcp-tool-shop.github.io/) द्वारा निर्मित।
