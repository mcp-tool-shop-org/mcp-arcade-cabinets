// The cabinet's shapes. Levers come from patterns/*.json; state is plain data,
// so a run can be cloned, compared and replayed.

export type Direction = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';

export type Place = {
  name: string;
  exits: Partial<Record<Direction, string>>;
  text: [string, string];
  dark?: boolean;
  /** Exit direction to the item it needs. */
  locks?: Partial<Record<Direction, string>>;
  /** The exit that opens only for the riddle's answer. */
  riddle?: Direction;
  things: string[];
};

export type Person = {
  name: string;
  aliases: string[];
  at: string;
  greet: string;
  topics: Record<string, string>;
  gives?: Record<string, string>;
  pays?: Record<string, { after: string; coin: number }>;
};

export type Item = {
  name: string;
  start?: boolean;
  at?: string;
  dark?: boolean;
  token?: boolean;
  shown?: string;
  price?: number;
  seller?: string;
};

export type Quest = { giver: string; wants: string; coin: number; reply: string };

export type Foe = {
  name: string;
  at: string;
  hp: number;
  min: number;
  max: number;
  once?: boolean;
  spar?: boolean;
  yield?: number;
  paidWins?: number;
  pay?: number;
};

export type Switches = {
  worldMoves: boolean;
  refusal: 'character' | 'system' | 'none';
  prompt: 'clear' | 'bare';
  reacts: boolean;
  choiceCost: boolean;
  goal: 'stated' | 'none';
  descriptions: 'varied' | 'repeats';
  deadEnd: boolean;
};

export type Patterns = {
  town: { start: string; places: Record<string, Place> };
  people: { again: string; people: Record<string, Person> };
  items: { coins: number; oil: number; items: Record<string, Item>; quests: Record<string, Quest> };
  foes: {
    player: { hp: number; attack: number; bonusEvery: number; bonusMax: number };
    knockoutHours: number;
    foes: Record<string, Foe>;
  };
  clock: {
    turnsPerHour: number;
    startHour: number;
    closingHour: number;
    restCoin: number;
    hourNames: string[];
  };
  switches: { defaults: Switches; presets: Record<string, Partial<Switches>> };
  verbs: {
    directions: Record<string, Direction>;
    phrases: Record<string, string>;
    verbs: Record<string, string>;
  };
  text: Record<string, unknown> & { help: string; unknown: string };
};

export type Fight = { foe: string; hp: number };

export type State = {
  place: string;
  /** Where the player came from, so flee has somewhere to go. */
  prev: string;
  turn: number;
  hour: number;
  hp: number;
  coin: number;
  oil: number;
  lit: boolean;
  /** Items carried, in the order they were picked up. */
  pack: string[];
  /** Items still lying in the world, by place. */
  ground: Record<string, string[]>;
  visits: Record<string, number>;
  lastText: Record<string, string>;
  asked: Record<string, string[]>;
  given: string[];
  paid: string[];
  defeated: string[];
  sparWins: number;
  fight: Fight | null;
  riddleOpen: boolean;
  questsDone: string[];
  stuck: boolean;
  over: boolean;
  won: boolean;
  rng: number;
  saved: string | null;
};

export type StepResult = { state: State; text: string; events: string[] };
