import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Ghost on the Menu',
  description:
    'A short arcade shooter where you are the agent, working through what MCP servers said on the wire.',
  logoBadge: 'GM',
  brandName: 'mcp-arcade-cabinets',
  repoUrl: 'https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets',
  footerText:
    'MIT Licensed — built by <a href="https://mcp-tool-shop.github.io/" style="color:var(--color-muted);text-decoration:underline">MCP Tool Shop</a>',

  hero: {
    badge: 'Arcade shooter · v0.7.0',
    headline: 'You are the agent.',
    headlineAccent: 'The rig hands you the calls.',
    description:
      'Take a shift: four flavored calls — pressure, area-deny, a rest, then a peak. Inspect closes with the Archivist. The calls the agent should not have made look like everything else until you hit one.',
    primaryCta: { href: 'play/', label: 'Play Ghost on the Menu' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Shift', code: 'pressure, area-deny, rest, peak — a card names the room in words' },
      { label: 'Code', code: 'frost robin chalk garden  —  type it to take the same shift again' },
      { label: 'End', code: 'the calls, the servers, the policies. no score.' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'What you are flying through',
      subtitle: 'The instrument scored the wire. This game lets you read it with a ship.',
      features: [
        {
          title: 'Take a shift',
          desc: 'The rig draws four calls from the roster, never the same four twice running. Each call is a different room: pressure, area-deny, a rest, then a peak. A card between them names the next server, the policy, the tools, and the fight in words. The lamps refill at every call.',
        },
        {
          title: 'The climb is data',
          desc: 'Bursts of honest copies and hotter fire climb wave by wave, and across a shift call by call, so the last call starts where the first one ended. Every number is tuned on a band of scripted players, never on you.',
        },
        {
          title: 'A shift has a name',
          desc: 'Four words at the end, like frost robin chalk garden. Type them on the menu to take the same shift again, or hand them to someone. No digit, no count, no ranking.',
        },
        {
          title: 'Waves are experiments',
          desc: 'One wave per experiment on the tape. A word opens it, then the handshake, the menu, the calls, the answers, and that experiment’s own boss. Inspect on a shift closes with the Archivist. Probe, shelf and ledger are extra hulls, still honest until you hit them.',
        },
        {
          title: 'Lies reveal on the hit',
          desc: 'They share a look, a path and a timing with their honest twins. Nothing about a lie differs before contact. Hit one and it parks as a trophy.',
        },
        {
          title: 'The boss can be a model',
          desc: 'Locally, an Ollama model sits in the boss through the cabinet’s own tools: one verb a beat, the next few legal verbs off the beat, a line of its own through a gate. A hung answer is the script. The model proposes; the game decides. It never sees a lie, and nothing on the field names it. The published site omits the local seats.',
        },
        {
          title: 'It speaks, and every take is receipted',
          desc: 'With the voice worker running, every boss speaks its lines in its own voice. Each take is heard back and receipted by fx-dub before it plays: the words spoken are the words the gate admitted. A take that fails stays silent.',
        },
        {
          title: 'The music follows the room',
          desc: 'Poison wants poison; a Whisperer wants the Whisperer. A song holds about half a minute before it gives way. Beds sit under the shots. A shift carries the music through its cards.',
        },
        {
          title: 'No score, ever',
          desc: 'Three lamps, words on the wave card, an end scene that names the tape, the server and the policy. No count, no digit, no verdict.',
        },
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Play it',
      cards: [
        {
          title: 'In a browser',
          code: 'https://mcp-tool-shop-org.github.io/mcp-arcade-cabinets/play/',
        },
        {
          title: 'On your machine',
          code: 'pnpm install\npnpm -F @mcp-arcade-cabinets/cabinets dev\n\n# an Ollama daemon for the boss seat\n# pnpm voice, in a second terminal, for the voice',
        },
        {
          title: 'The cabinet as an MCP server',
          code: 'docker build -t mcp-arcade-cabinets .\ndocker run -i --rm --network none --cpus 1 --memory 2g mcp-arcade-cabinets\n\n# six tools over stdio: fire, say, speak, sfx, view, tapes',
        },
        {
          title: 'The Ghost plays its own menu',
          code: 'pnpm build\nmcp-arcade bout --target stdio --allow-live \\\n  --cmd node --cmd packages/cabinet-server/dist/server.js --task view',
        },
      ],
    },
  ],
};
