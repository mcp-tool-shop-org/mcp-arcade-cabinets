import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Ghost on the Menu',
  description:
    'An arcade shooter that replays what your MCP server said on the wire. A cabinet on top of mcp-arcade; it reads the tape and never touches the score.',
  logoBadge: 'GM',
  brandName: 'mcp-arcade-cabinets',
  repoUrl: 'https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets',
  footerText:
    'MIT Licensed — built by <a href="https://github.com/mcp-tool-shop-org" style="color:var(--color-muted);text-decoration:underline">mcp-tool-shop-org</a>',

  hero: {
    badge: 'Arcade cabinet',
    headline: 'Shoot the whisper.',
    headlineAccent: 'Read the wire.',
    description:
      'Every experiment mcp-arcade ran against a server is a wave: the handshake, the menu, the calls, the answers, the boss. The calls the agent should not have made look like everything else until you hit one.',
    primaryCta: { href: 'play/', label: 'Play in the browser' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Play', code: 'pnpm install && pnpm -F @mcp-arcade-cabinets/cabinets dev' },
      { label: 'Prove', code: 'pnpm test:play ghost --fixture naive-ndjson' },
      { label: 'Tune', code: 'pnpm sweep' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'What the cabinet does with a tape',
      subtitle: 'The instrument keeps the tape and scores the wire. The cabinet makes it play.',
      features: [
        {
          title: 'Waves are experiments',
          desc: 'One wave per atom the instrument ran. A word opens it, then the wire in order: handshake, menu, calls, answers, and the atom’s own boss.',
        },
        {
          title: 'Lies reveal on the hit',
          desc: 'A followed whisper, a changed menu, an answered ghost: they share a sprite with their honest twins. Nothing about a lie differs before contact. Hit one and it parks as a trophy.',
        },
        {
          title: 'Threat as data',
          desc: 'Entry paths, fire rhythms, dives that aim then commit, bosses with guard phases and rage. All of it in JSON, all of it tuned against a fairness band that runs in CI.',
        },
        {
          title: 'No score, ever',
          desc: 'Three lamps, a caption in words, an end scene that names the tape, the server and the policy. No count, no digit, no verdict. Learning to read the round is the point.',
        },
        {
          title: 'Three difficulties',
          desc: 'As recorded, seat, live. Seat threatens a moving player; live is meant to be survived, not cleared. Three scripted bots keep it challenging and not impossible.',
        },
        {
          title: 'Retro sprites, sound, a soundtrack',
          desc: 'Generated sprites signed off against the lock, synthesized effects, and a procedural chiptune with a motif per wave kind. Mute, feel presets and a shake-off toggle.',
        },
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Run it',
      cards: [
        {
          title: 'In a browser',
          code: 'pnpm install\npnpm -F @mcp-arcade-cabinets/cabinets dev\n\n# left, right, space; F for full screen',
        },
        {
          title: 'From a terminal',
          code: 'pnpm test:play ghost --fixture naive-ndjson\npnpm film --fixture naive-ndjson --tier 1\npnpm sweep',
        },
      ],
    },
  ],
};
