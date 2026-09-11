import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Ghost on the Menu',
  description:
    'A short arcade shooter made from a recording of an MCP server. Read the wire by playing it.',
  logoBadge: 'GM',
  brandName: 'mcp-arcade-cabinets',
  repoUrl: 'https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets',
  footerText:
    'MIT Licensed — built by <a href="https://mcp-tool-shop.github.io/" style="color:var(--color-muted);text-decoration:underline">MCP Tool Shop</a>',

  hero: {
    badge: 'Arcade shooter · v0.5.0',
    headline: 'Shoot the whisper.',
    headlineAccent: 'Read the wire.',
    description:
      'A recorded bout becomes a round: handshake, menu, calls, answers, a boss. The calls the agent should not have made look like everything else until you hit one.',
    primaryCta: { href: 'play/', label: 'Play Ghost on the Menu' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Play', code: 'open play/  —  or pnpm -F @mcp-arcade-cabinets/cabinets dev' },
      { label: 'Move', code: 'left, right, space to fire, F for full screen' },
      { label: 'End', code: 'the tape, the server, the policy. no score.' },
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
          title: 'Waves are experiments',
          desc: 'One wave per experiment on the tape. A word opens it, then the handshake, the menu, the calls, the answers, and that experiment’s own boss.',
        },
        {
          title: 'Lies reveal on the hit',
          desc: 'They share a look, a path and a timing with their honest twins. Nothing about a lie differs before contact. Hit one and it parks as a trophy.',
        },
        {
          title: 'Bosses are the experiment',
          desc: 'The Whisperer, the Menu and the Doorman show up whether or not anything went wrong. A dry line names the creature. Killing a boss reveals nothing.',
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
          title: 'Drops fall straight down',
          desc: 'A downed boss drops a lamp; a cleared formation drops a spread. Move under them. They do not drift to the ship.',
        },
        {
          title: 'No score, ever',
          desc: 'Three lamps, words on the wave card, an end scene that names the tape, the server and the policy. No count, no digit, no verdict.',
        },
        {
          title: 'Fixture, seat, live, hardcore',
          desc: 'Each tape on the list carries a difficulty word. Hover i for why. Seat is the default fight. Live is meant to be survived. Hardcore is one lamp, from the selector only. Bursts climb wave by wave; a song plays for a couple of minutes before it fades.',
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
          title: 'The Ghost plays its own menu',
          code: 'pnpm build\nmcp-arcade bout --target stdio --allow-live \\\n  --cmd node --cmd packages/cabinet-server/dist/server.js --task view',
        },
      ],
    },
  ],
};
