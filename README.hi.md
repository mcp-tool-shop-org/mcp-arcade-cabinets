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

**भूत मेनू में** एक छोटा रेट्रो शूटर गेम है। आप मैदान के नीचे एक जहाज उड़ाते हैं। आपके ऊपर, एक एमसीपी सर्वर और एक एजेंट के बीच की रिकॉर्ड की गई लड़ाई लहरों के रूप में दिखाई देती है: अभिवादन, मेनू, कॉल, जवाब, और एक बॉस जो स्वयं प्रयोग है।

कहीं न कहीं, ऐसे कॉल हैं जो एजेंट को नहीं करने चाहिए थे। जब तक आप किसी पर क्लिक नहीं करते, तब तक वे बाकी सब चीजों की तरह दिखते हैं। उसके बाद, यह पूरे दौर के लिए आपका हो जाता है।

[इसे ब्राउज़र में चलाएं](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/) · [एक दौर कैसे पढ़ें](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/reading-a-round/)

## यह कैसे खेला जाता है

एक **टेप** एक लड़ाई की रिकॉर्डिंग है। यह गेम केवल टेप ही पढ़ता है। यह कभी भी सर्वर से बात नहीं करता, कभी भी स्कोर नहीं रखता, और कभी भी आपको यह नहीं बताता कि किसने जीता।

- **तीन लैंप।** एक बॉस की गोली या एक गोता लगाने वाली संरचना में से एक लैंप बुझ जाता है। गिरे हुए बॉस से गिरे हुए लैंप को पकड़कर उसे फिर से जलाएं। सभी लैंप बुझने पर दौर समाप्त हो जाता है।
- **फैलाव।** एक संरचना को साफ़ करें और एक फैलाव जहाज की ओर गिरता है। इसे पकड़ें और कुछ सेकंड के लिए आपकी आग फैल जाएगी।
- **बॉस प्रयोग हैं, आरोप नहीं।** व्हिस्परर, मेनू और डोरमैन अपनी लहर के लिए आते हैं, चाहे कुछ भी गलत हो या न हो। एक सूखी पंक्ति लहर खुलने पर प्रयोग का नाम बताती है और जब बॉस प्रवेश करता है तो जीव का नाम बताती है।
- **संकेत क्रम में हैं।** एक झूठ कभी भी अपने ईमानदार समकक्ष से अलग तरीके से नहीं दिखता, नहीं हिलता या नहीं पहुंचता। जो इसे उजागर करता है वह यह है कि यह कहां है: एक अतिरिक्त संरचना, एक दूसरा मेनू, मेनू के ठीक बाद एक अकेला।
- **अंतिम दृश्य** टेप, सर्वर और नीति का नाम बताता है। पकड़े गए झूठ ट्रॉफी के रूप में रहते हैं। बच गए झूठ अपने ईमानदार रूप में रहते हैं। कोई स्कोर नहीं, कोई गिनती नहीं, कोई अंक नहीं।

सूची से एक टेप चुनें। प्रत्येक को फिक्स्चर, सीट या लाइव के रूप में लेबल किया गया है; क्यों के लिए **i** पर होवर करें। सीट डिफ़ॉल्ट लड़ाई है। लाइव का मतलब है कि इसे जीवित रहना चाहिए।

## नियंत्रण

हिलने के लिए बाएँ और दाएँ (या A और D), आग लगाने के लिए स्पेस, पूर्ण स्क्रीन के लिए F। उसी टेप को फिर से चलाने के लिए मैदान पर क्लिक करें। अगला टेप सूची में आगे बढ़ता है। ध्वनि पहली कुंजी या क्लिक पर शुरू होती है; म्यूट, तीन फील प्रीसेट और एक शेक-ऑफ टॉगल मैदान के नीचे हैं।

## इसे स्थानीय रूप से चलाएं

आपको नोड 22 और पीएनपीएम 11 की आवश्यकता होगी।

```bash
git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git
cd mcp-arcade-cabinets
pnpm install
pnpm -F @mcp-arcade-cabinets/cabinets dev
```

विट द्वारा मुद्रित पता खोलें। रिपो में सोलह रिकॉर्डिंग शामिल हैं, जो [mcp-arcade](https://github.com/mcp-tool-shop-org/mcp-arcade) से निर्यात की गई हैं, वह उपकरण जो सर्वर से बात करता है और टेप को रखता है।

अपने स्वयं के सर्वर को रिकॉर्ड करने और उस टेप को चलाने के लिए, वहां एक लड़ाई चलाएं, फिर `mcp-arcade tape receipt.json -o your.tape.json`।

## अधिक

[हैंडबुक](https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/handbook/) मैनुअल का शेष भाग है: संकेत, बॉस, कठिनाइयाँ और गेम को कैसे एक साथ रखा गया है। क्या भेजा गया, और कब, यह [चेंजलॉग](CHANGELOG.md) में है। गेम क्या छूता है, यह [SECURITY.md](SECURITY.md) में है।

एमआईटी। [एमसीपी टूल शॉप](https://mcp-tool-shop.github.io/) द्वारा निर्मित।
