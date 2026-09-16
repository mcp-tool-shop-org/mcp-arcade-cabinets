import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'mcp-arcade-cabinets',
  description:
    'Arcade games made from what MCP servers said on the wire. Ghost on the Menu, a replay shooter, and Vibe Typer, a typing game. Cabinets read mcp-arcade tapes and never touch the score.',
  logoBadge: 'AC',
  brandName: 'mcp-arcade-cabinets',
  repoUrl: 'https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets',
  packageUrl: 'https://www.npmjs.com/package/@mcptoolshop/ghost-on-the-menu',
  packageLabel: 'npm',
  footerText:
    'MIT Licensed — built by <a href="https://mcp-tool-shop.github.io/" style="color:var(--color-muted);text-decoration:underline">MCP Tool Shop</a>',

  hero: {
    badge: 'The arcade · v0.10.0',
    headline: 'You are the model.',
    headlineAccent: 'Two cabinets. One wire.',
    description:
      'Every game here is built from tapes: recordings of what an MCP server and an agent said to each other. Ghost on the Menu hands you the calls and hides the ones the agent should not have made. Vibe Typer hands you a vibe coder with ideas, and you type the code that builds them.',
    primaryCta: { href: 'play/', label: 'Play' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Ghost', code: 'frost robin chalk garden  —  a shift has a name; type it to take it again' },
      { label: 'Vibe', code: 'user: can the button be more blockchain\nagent: You are absolutely right, on it' },
      {
        label: 'npm',
        code: 'npx @mcptoolshop/ghost-on-the-menu  —  or  —  npx @mcptoolshop/vibe-typer',
      },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'cabinets',
      title: 'The cabinets',
      subtitle: 'Same chassis, different games. Pick one on the switch; the page remembers.',
      features: [
        {
          title: 'Ghost on the Menu — a replay shooter',
          desc: 'The rig hands you the calls. Every call is a recorded bout that plays out above your ship as waves: the handshake, the menu, the calls, the answers, and a boss that is the experiment itself. The calls the agent should not have made look like everything else until you hit one. Take a shift of four and it gets a four-word name.',
        },
        {
          title: 'Vibe Typer — a typing game',
          desc: 'You are a hard-working, sycophantic coding agent. Your user is a vibe coder: a website for their cat, a rideshare for ducks, a bot that argues with the thermostat. Sixteen stories, each four pieces of real code in order. Type the reply, type the code, and the thing gets built beside you while the user checks in. Ship the last line and it deploys. Vibes multiply the valuation; a miss just costs the streak. Nothing yells.',
        },
        {
          title: 'The tape is the source',
          desc: 'A tape is one bout, exported by the mcp-arcade instrument. A cabinet reads header words, wire rows and one fact per experiment, refuses anything that carries a score or a verdict, and never talks to a server. Twenty ship in the repo; record your own and drop it beside them.',
        },
        {
          title: 'A model can sit in a chair',
          desc: 'Locally, an Ollama model flies Ghost’s bosses through the cabinet’s own tools and writes their lines through a gate. In Vibe Typer’s endless mode it plays the user and writes the product, the asks and the code you type, behind a mechanical code gate and the same word gate as every authored line. The model proposes; the game decides; nothing on the field names it.',
        },
        {
          title: 'It speaks, and every take is receipted',
          desc: 'With the voice worker running, every boss speaks in its own voice, and the user’s lines are next. Each take is heard back and receipted by fx-dub before it plays: the words spoken are the words the gate admitted.',
        },
        {
          title: 'Tuned on a band, never on you',
          desc: 'Every number that shapes threat or pace is JSON, validated at load, and held to a band of scripted players that fails the build when a bar moves. Ghost has three bots and a fairness band; Vibe Typer has three bots and a band over three seeds, sixteen levels and four tiers, the check-ins and the seated endless among its bars.',
        },
      ],
    },
    {
      kind: 'features',
      id: 'vibe-typer',
      title: 'Inside Vibe Typer',
      subtitle: 'A real scoreboard, a context window for a clock, sixteen stories, and code you can learn from.',
      features: [
        {
          title: 'The scoreboard is the game’s number',
          desc: 'Valuation, vibes and streak are on the field at all times. Words per minute and accuracy never are. The retro at the end is opt-in and speaks in words, against your own past in this browser and no one else.',
        },
        {
          title: 'Points are what you built',
          desc: 'Every request has a value computed from its code: surprisal, key travel, length, punctuation, long identifiers, closing brackets. Shipping pays that value times your vibes and adds a piece of the same size to the preview. Seed, series A and unicorn are stingers on the way up.',
        },
        {
          title: 'The context bar is the pace',
          desc: 'It drains as the conversation runs; each request costs a slice; shipping refills a share. Run it dry in a level and the agent compacts, sums up in one line, and carries on. Endless ends on it. Hardcore, from the selector only, burns it on every mistyped character.',
        },
        {
          title: 'Two hundred and forty-nine snippets',
          desc: 'Bash, C#, Java, JavaScript, Python and SQL, banded from a bare echo to a nested class, each with teaching notes and an ask written for the job it does, plus an integration stack built from the real tool names on the tapes. The pairs you miss are seeded into your next level’s real lines.',
        },
        {
          title: 'The streak is something you hear',
          desc: 'Five keyboard sample sets. Every clean line raises the keystroke pitch a semitone to an octave; a miss resets it. The bed is soft by default so nothing reads as a countdown; turn the pulse on and its tempo follows your vibes. The deploy rings a chord and the confetti falls.',
        },
        {
          title: 'Scope creep, check-ins, quick sync, Copilot',
          desc: '“Oh also can it…” grows a request by a line, shown before it is typeable. “Is it live yet” lands while you type and costs nothing but a reply. A meeting of three short chat lines is a breather where the bar does not drain. Hold a streak and the editor offers the rest of the line; Tab takes it at a discount.',
        },
      ],
    },
    {
      kind: 'features',
      id: 'ghost',
      title: 'Inside Ghost on the Menu',
      subtitle: 'The instrument scored the wire. This game lets you read it with a ship.',
      features: [
        {
          title: 'Take a shift',
          desc: 'The rig draws four calls from the roster, never the same four twice running. Each call is a different room: pressure, area-deny, a rest, then a peak. A card between them names the next server, the policy, the tools, and the fight in words. The lamps refill at every call.',
        },
        {
          title: 'The climb is data',
          desc: 'Bursts of honest copies and hotter fire climb wave by wave, and across a shift call by call. Every number is tuned on a band of scripted players.',
        },
        {
          title: 'A shift has a name',
          desc: 'Four words at the end, like frost robin chalk garden. Type them on the menu to take the same shift again, or hand them to someone. No digit, no count, no ranking.',
        },
        {
          title: 'Lies reveal on the hit',
          desc: 'They share a look, a path and a timing with their honest twins. Nothing about a lie differs before contact. Hit one and it parks as a trophy.',
        },
        {
          title: 'The boss can be a model',
          desc: 'An Ollama model sits in the boss through the cabinet’s own tools: one verb a beat, the next few legal verbs off the beat, a line of its own through a gate. A hung answer is the script.',
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
          title: 'Ghost on the Menu, seats lit',
          code: 'npx @mcptoolshop/ghost-on-the-menu\n\n# serves Ghost on 127.0.0.1 and opens it\n# an Ollama daemon and a voice worker light the seats',
        },
        {
          title: 'Vibe Typer, the endless user seated',
          code: 'npx @mcptoolshop/vibe-typer\n\n# serves Vibe Typer on 127.0.0.1 and opens it\n# an Ollama daemon seats a model as the user in endless',
        },
        {
          title: 'Work on it',
          code: 'git clone https://github.com/mcp-tool-shop-org/mcp-arcade-cabinets.git\ncd mcp-arcade-cabinets && pnpm install\npnpm -F @mcp-arcade-cabinets/cabinets dev',
        },
        {
          title: 'Ghost as an MCP server',
          code: 'npx @mcptoolshop/ghost-on-the-menu --mcp\n\n# or the image, no Node:\ndocker run -i --rm --network none ghcr.io/mcp-tool-shop-org/mcp-arcade-cabinets:0.7.0',
        },
      ],
    },
  ],
};
