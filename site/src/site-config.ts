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
    badge: 'Arcade shooter · v0.6.0',
    headline: 'You are the agent.',
    headlineAccent: 'The rig hands you the calls.',
    description:
      'Take a shift: four recorded bouts in a row, each a server the agent was sent to, the fire climbing call by call. The calls the agent should not have made look like everything else until you hit one.',
    primaryCta: { href: 'play/', label: 'Play Ghost on the Menu' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Shift', code: 'four calls, a card between them, the lamps refilled, the fire climbing' },
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
          desc: 'The rig draws four calls from the roster, never the same four twice running. A card between them names the next server, the policy, and the tools the agent was asked to run. The lamps refill at every call.',
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
          desc: 'One wave per experiment on the tape. A word opens it, then the handshake, the menu, the calls, the answers, and that experiment’s own boss.',
        },
        {
          title: 'Lies reveal on the hit',
          desc: 'They share a look, a path and a timing with their honest twins. Nothing about a lie differs before contact. Hit one and it parks as a trophy.',
        },
        {
          title: 'The boss can be a model',
          desc: 'Locally, an Ollama model sits in the boss through the cabinet’s own tools: one verb a beat, a line of its own through a gate. The model proposes; the game decides. It never sees a lie, and nothing on the field names it.',
        },
        {
          title: 'It speaks, and every take is receipted',
          desc: 'With the voice worker running, every boss speaks its lines in its own voice. Each take is heard back and receipted by fx-dub before it plays: the words spoken are the words the gate admitted. A take that fails stays silent.',
        },
        {
          title: 'The music follows the seed',
          desc: 'A round opens on a song its seed picks, holds it for a couple of minutes, then fades into the next; a boss brings its own; a burst speeds the song up. A shift carries the music through its cards.',
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
          code: 'docker run -i --rm ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.6.0\n\n# six tools over stdio: fire, say, speak, sfx, view, tapes',
        },
        {
          title: 'The Ghost plays its own menu',
          code: 'pnpm build\nmcp-arcade bout --target stdio --allow-live \\\n  --cmd node --cmd packages/cabinet-server/dist/server.js --task view',
        },
      ],
    },
  ],
};
