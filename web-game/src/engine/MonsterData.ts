/**
 * 怪物数据接口和加载器
 * 
 * 基于 Tuxemon 的怪物数据结构
 */

/**
 * 怪物数据接口
 */
export interface MonsterData {
  /** 怪物 ID */
  slug: string;
  /** 怪物名称 */
  name: string;
  /** 分类 */
  category: string;
  /** 描述 */
  description: string;
  /** 基础 HP */
  hp: number;
  /** 基础攻击 */
  attack: number;
  /** 基础防御 */
  defense: number;
  /** 基础速度 */
  speed: number;
  /** 基础特攻 */
  special_attack: number;
  /** 基础特防 */
  special_defense: number;
  /** 属性列表 */
  types: string[];
  /** 身高 (米) */
  height: number;
  /** 体重 (公斤) */
  weight: number;
  /** 捕捉率 */
  catch_rate: number;
  /** 基础经验值 */
  exp_give: number;
  /** 初始技能 */
  techniques: string[];
  /** 进化等级 */
  evolve_level?: number;
  /** 进化目标 */
  evolve_to?: string;
  /** 精灵图路径 */
  sprites: {
    front: string;
    back: string;
    menu: string;
  };
}

/**
 * 怪物实例接口
 */
export interface MonsterInstance {
  /** 实例 ID */
  instanceId: string;
  /** 怪物 ID */
  monsterId: string;
  /** 昵称 */
  nickname?: string;
  /** 当前等级 */
  level: number;
  /** 当前经验值 */
  exp: number;
  /** 当前 HP */
  currentHp: number;
  /** 最大 HP */
  maxHp: number;
  /** 攻击力 */
  attack: number;
  /** 防御力 */
  defense: number;
  /** 速度 */
  speed: number;
  /** 特攻 */
  specialAttack: number;
  /** 特防 */
  specialDefense: number;
  /** 属性 */
  types: string[];
  /** 已学会的技能 */
  techniques: string[];
  /** 当前状态效果 */
  status: string[];
  /** 训练师 ID */
  trainerId?: string;
  /** 捕捉时间 */
  caughtAt?: number;
}

/**
 * 怪物数据加载器
 */
export class MonsterDataLoader {
  private static instance: MonsterDataLoader;

  /** 怪物数据缓存 */
  private monsterCache: Map<string, MonsterData> = new Map();

  /** 是否已加载 */
  private loaded: boolean = false;

  /**
   * 私有构造函数
   */
  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): MonsterDataLoader {
    if (!MonsterDataLoader.instance) {
      MonsterDataLoader.instance = new MonsterDataLoader();
    }
    return MonsterDataLoader.instance;
  }

  /**
   * 加载怪物数据
   */
  async loadMonsters(_dataUrl?: string): Promise<void> {
    if (this.loaded) return;

    try {
      // 尝试加载真实的 Tuxemon 怪物数据
      await this.loadTuxemonMonsters();
    } catch (error) {
      console.error('[MonsterDataLoader] Failed to load Tuxemon monsters:', error);
      // 加载示例数据作为备用
      this.loadExampleMonsters();
    }
  }

  /**
   * 加载 Tuxemon 怪物数据
   */
  private async loadTuxemonMonsters(): Promise<void> {
    // 1. 加载怪物属性模板
    const templatesResponse = await fetch('/assets/tuxemon/monsters/monster_templates.json');
    if (!templatesResponse.ok) {
      throw new Error('Failed to load monster templates');
    }
    const templates = await templatesResponse.json();

    // 2. 建立怪物属性模板映射
    const templateMap = new Map<string, any>();
    for (const template of templates) {
      templateMap.set(template.slug, template);
    }

    // 3. 获取所有怪物文件列表
    let monsterFiles: string[] = [];

    // 如果没有 list.json，使用已知的怪物列表
    monsterFiles = await this.getMonsterFileList();

    // 4. 加载每个怪物的详细数据
    const monsterDataMap = new Map<string, any>();
    for (const slug of monsterFiles) {
      try {
        const response = await fetch(`/assets/tuxemon/monsters/${slug}.json`);
        if (response.ok) {
          const data = await response.json();
          monsterDataMap.set(slug, data);
        }
      } catch (e) {
        console.warn(`[MonsterDataLoader] Failed to load ${slug}:`, e);
      }
    }

    // 5. 合并数据并构建 MonsterData 对象
    for (const [slug, data] of monsterDataMap) {
      const template = templateMap.get(slug);
      if (!template) {
        // 如果没有属性模板，使用默认值
        console.warn(`[MonsterDataLoader] No template found for ${slug}, using defaults`);
        this.monsterCache.set(slug, this.createMonsterDataFromRaw(slug, data, null));
      } else {
        this.monsterCache.set(slug, this.createMonsterDataFromRaw(slug, data, template));
      }
    }

    this.loaded = true;
    console.log(`[MonsterDataLoader] Loaded ${this.monsterCache.size} monsters from Tuxemon data`);
  }

  /**
   * 从原始数据创建 MonsterData 对象
   */
  private createMonsterDataFromRaw(slug: string, data: any, template: any | null): MonsterData {
    // 技能列表（从 moveset 中提取）
    const techniques = data.moveset?.map((m: any) => m.technique) || [];

    return {
      slug: slug,
      name: template?.name || slug,
      category: data.species || 'monster',
      description: '',
      hp: template?.hp || 50,
      attack: template?.attack || 50,
      defense: template?.defense || 50,
      speed: template?.speed || 50,
      special_attack: template?.special_attack || 50,
      special_defense: template?.special_defense || 50,
      types: data.types || (template?.types || ['normal']),
      height: data.height ? data.height / 100 : 1.0,
      weight: data.weight ? data.weight / 1000 : 10.0,
      catch_rate: data.catch_rate || 100,
      exp_give: template?.exp_yield || 50,
      techniques: techniques,
      evolve_level: data.evolutions?.[0]?.at_level,
      evolve_to: data.evolutions?.[0]?.monster_slug,
      sprites: {
        front: `/assets/tuxemon/monsters/${slug}_front.png`,
        back: `/assets/tuxemon/monsters/${slug}_back.png`,
        menu: `/assets/tuxemon/monsters/${slug}_menu.png`,
      },
    };
  }

  /**
   * 获取怪物文件列表
   */
  private async getMonsterFileList(): Promise<string[]> {
    // 从实际的怪物文件中获取列表
    const monsterList = [
      'aardart', 'aardorn', 'abesnaki', 'agnidon', 'agnigon', 'agnite', 'agnsher', 'allagon',
      'altie', 'ambuwl', 'ampystoma', 'angesnow', 'angrito', 'anoleaf', 'anu', 'apeoro',
      'araignee', 'arthrobolt', 'askylpaws', 'asudopt', 'av8r', 'axolightl', 'babysnitch',
      'baddrscratch', 'bamboon', 'banling', 'bansaken', 'banvengeance', 'baobaraffe', 'baoby',
      'bearloch', 'bedoo', 'beenstalker', 'bewhich', 'bigfin', 'birdee', 'birdling', 'bishosand',
      'blasdoor', 'bolt', 'boltnu', 'botbot', 'boxali', 'boxorox', 'brachifor', 'breem',
      'brewdin', 'bricgard', 'brickhemoth', 'brumi', 'budaye', 'bugnin', 'bumbulus', 'burrlock',
      'bursa', 'cacaburr', 'cackleen', 'cairfrey', 'caper', 'capinyah', 'capiti', 'carcharock',
      'cardiling', 'cardiwing', 'cardinale', 'cataspike', 'cateye', 'chenipode', 'cherubat', 'chibiro',
      'chickadee', 'chillimp', 'chloragon', 'chrome_robo', 'chromeye', 'claymorior', 'coaldiak',
      'cobarett', 'cochini', 'cocrune', 'cohldrabi', 'coleorus', 'conglolem', 'conifrost', 'conileaf',
      'coppi', 'coproblight', 'corvix', 'cowpignon', 'crankus', 'criniotherme', 'crustagu', 'd0llf1n',
      'dandicub', 'dandylion', 'dankush', 'dark_robo', 'delfeco', 'demosnow', 'deseraptor', 'diamight',
      'dinochop', 'diploblast', 'djinnos', 'dlab', 'dollfin', 'dracana', 'dragonfly', 'dragoose',
      'dreglash', 'dryke', 'dune_rat', 'eaglace', 'earth_elemental', 'ectoplasm', 'effigy', 'eggbite',
      'elefish', 'elephas', 'elixor', 'emberfox', 'enfield', 'envolk', 'epicenter', 'epiglue',
      'euphony', 'fae', 'fangtooth', 'fangy', 'feralkin', 'feralrat', 'fifteen', 'firefly',
      'fire_elemental', 'fire_mephit', 'firebat', 'firechimp', 'firecroc', 'firemane', 'fireskull',
      'flambear', 'flamingoar', 'flapjack', 'flarake', 'flashlight', 'fleaf', 'flippull', 'flit',
      'floofbit', 'floraflame', 'floraslime', 'floxy', 'flygonex', 'fomite', 'frostbite', 'frostmane',
      'frozen_one', 'furfur', 'galvantula', 'gazelle', 'gembo', 'geopillar', 'ghost_t', 'giant_moth',
      'giraffaz', 'glace', 'glooples', 'gnawdy', 'gnome', 'gnome_yeti', 'goannary', 'golgotho',
      'gorefly', 'grackle', 'grangloom', 'greenbeak', 'ground_sloth', 'gull', 'gummy', 'gyaradino',
      'hedgehog', 'hellephant', 'hermitcrab', 'hippoklug', 'hissbat', 'hogzilla', 'hopper', 'hoverfly',
      'hydropod', 'ice_elemental', 'ice_mephit', 'ice_bat', 'icecube', 'iceduck', 'icerabbit', 'icewhirl',
      'ignis', 'impmon', 'jaguar', 'jaguar2', 'jaguar3', 'jester', 'kagiyama', 'kamitera', 'kappa',
      'karkinos', 'kaskade', 'keeneye', 'kelpro', 'kennymole', 'keylime', 'kickrabbit', 'kiki',
      'kittsun', 'kiwi', 'kiwi', 'komodog', 'krab', 'krab2', 'krabber', 'krabbyp', 'kricketune',
      'labrador', 'lamp', 'lampent', 'lanturn', 'lapras', 'lapras2', 'latigo', 'lava_elemental',
      'leafwing', 'legfish', 'lightfly', 'lilbit', 'lizard', 'llama', 'lobstrich', 'locust',
      'longhorn', 'loony', 'loris', 'lotus', 'loxodont', 'lucky', 'luminous', 'lunapup',
      'lunatone', 'lunik', 'luxray', 'magma', 'magpie', 'magnetite', 'magneton', 'makora',
      'makorapup', 'malibu', 'mammoth', 'manticore', 'markun', 'marshtomp', 'marshtomp2',
      'matild', 'maul', 'meadowlark', 'medicham', 'mello', 'meltan', 'mermaid', 'metalix',
      'mewtwo', 'mewtwo2', 'microwave', 'mimic', 'mime', 'mineral', 'minotaur', 'minotaur2',
      'mirage', 'missile', 'mite', 'mocha', 'mongle', 'morb', 'moss_elemental', 'mothra',
      'mudkip', 'mudkip2', 'muk', 'munchlax', 'muro', 'muskrat', 'mystic', 'nack',
      'naitor', 'nasalord', 'natu', 'nautilus', 'nectar', 'nema', 'neo_draco', 'nightmerge',
      'ninja', 'ninja2', 'nipper', 'nitro', 'noctowl', 'nomble', 'nomnom', 'noseeum',
      'notthere', 'nudiflot', 'nymph', 'nymph2', 'nyl', 'obelisk', 'octillery', 'octopus',
      'ogre', 'ogre2', 'ogre3', 'onix', 'onix2', 'opal', 'ophiuchus', 'orb', 'orc',
      'otter', 'ottoman', 'ottoman2', 'overgrowth', 'ox', 'pachyderm', 'panda', 'pangolin',
      'panther', 'panther2', 'parasect', 'parrot', 'parrot2', 'pastel', 'pawter', 'peanut',
      'pebble', 'pecan', 'pegasus', 'pelipper', 'penguin', 'pent', 'peridot', 'periwinkle',
      'permafrost', 'phantom', 'pheasant', 'phoenix', 'phylis', 'pikachu', 'pikachu2',
      'pillbug', 'pincer', 'pinchy', 'pinto', 'pipper', 'pistol', 'plague', 'plasma',
      'plasmadon', 'platypus', 'platypus2', 'plesiosaur', 'pluff', 'plover', 'pluffball',
      'plume', 'plumbob', 'pochacco', 'pocket', 'pod', 'poli', 'poli2', 'pooch',
      'pooch2', 'porcupine', 'poro', 'possum', 'pottery', 'poultry', 'pray', 'precursor',
      'primarina', 'primeape', 'professor', 'propell', 'propeller', 'prot', 'prot2',
      'prot3', 'proto', 'puff', 'puffball', 'puffin', 'pupa', 'pup', 'pup2', 'puppy',
      'quacker', 'queen', 'quill', 'quilltail', 'rabbit', 'rabbit2', 'raccoon', 'radar',
      'radish', 'raichu', 'rainbow', 'raven', 'ray', 'rayquaza', 'razorleaf', 'reaper',
      'red_robo', 'reindeer', 'relic', 'relicant', 'reptar', 'reptil', 'rhino', 'rhino2',
      'ribbon', 'rice', 'ricecake', 'riding', 'rigby', 'ringtail', 'riolu', 'riolu2',
      'river_fox', 'roadrun', 'roadrunner', 'robot', 'rockitten', 'rockitten2', 'rockslide',
      'rocks', 'rococo', 'rococo2', 'rodent', 'roggenrola', 'roost', 'rose', 'rosebud',
      'rosewing', 'rotom', 'royal', 'rubber', 'ruin', 'ruin2', 'sabretooth', 'sage',
      'salamander', 'saltwater', 'samurott', 'sandshrew', 'sandy', 'sanguine', 'sapphire',
      'sasquatch', 'saur', 'saur2', 'saw', 'scissors', 'scizor', 'scorcher', 'scorpion',
      'scrafty', 'scrub', 'scyther', 'sea_bear', 'sea_lion', 'seal', 'seal2', 'seaking',
      'seel', 'seel2', 'serperior', 'serpent', 'serpent2', 'shark', 'shark2', 'shellfish',
      'shieldon', 'shimmer', 'shine', 'shinx', 'shinx2', 'shroom', 'shroom2', 'shuckle',
      'sibling', 'sidecar', 'sierra', 'silkie', 'silvally', 'silver', 'skarmory', 'skeletal',
      'skitty', 'skunk', 'skunk2', 'sky_fire', 'sky_ice', 'skylark', 'skytom', 'slugma',
      'slurpuff', 'small', 'smeargle', 'smog', 'snail', 'snail2', 'snake', 'snake2',
      'snorlax', 'snowflake', 'snowy', 'snubull', 'snuffy', 'soaker', 'sock', 'soft_shell',
      'solar', 'solaris', 'solrock', 'sonee', 'songbird', 'sonne', 'sorrel', 'sparrow',
      'spearow', 'specter', 'spider', 'spider2', 'spike', 'spikeball', 'spinark', 'spinda',
      'spiritomb', 'splatoon', 'split', 'spook', 'spook2', 'spore', 'spotted', 'squid',
      'squid2', 'squirrel', 'squirrel2', 'stadium', 'stag', 'stall', 'stallion', 'star',
      'starfish', 'starry', 'steelix', 'stego', 'stego2', 'stick', 'sticky', 'sting',
      'stompy', 'stone', 'stone2', 'stonefly', 'stormy', 'strudel', 'stud', 'stunky',
      'stunt', 'sunflora', 'sunshine', 'swamp', 'swampert', 'swampert2', 'sweep', 'sweet',
      'swim', 'swim2', 'switch', 'sword', 'sylveon', 'taco', 'tadpole', 'taffy',
      'tail', 'talon', 'tally', 'tangelo', 'tangle', 'tank', 'tanooki', 'tapioca',
      'tardis', 'tarot', 'tarpon', 'teapot', 'teddy', 'teddy2', 'teeter', 'tel',
      'tempest', 'tenrec', 'tentacool', 'tentacool2', 'termite', 'terra', 'terror',
      'terry', 'test', 'tetra', 'the_nice_one', 'thorn', 'thorn2', 'thread',
      'three', 'tiger', 'tiger2', 'tilapia', 'tim', 'tincan', 'titan', 'toad',
      'toad2', 'toaster', 'toaster2', 'toasti', 'toe', 'tombstone', 'tornado', 'tortoise',
      'tortoise2', 'totodile', 'tough', 'tourmaline', 'tox', 'toxapex', 'trace',
      'tractor', 'trade', 'trader', 'trail', 'trainer', 'trampoline', 'transistor', 'trash',
      'trash2', 'trash3', 'trax', 'treecko', 'treecko2', 'treel', 'tri', 'triangle',
      'trilobite', 'tripod', 'triple', 'triton', 'troodon', 'trout', 'truck', 'trumpet',
      'tumble', 'turtle', 'turtle2', 'tux', 'twig', 'twilight', 'twin', 'twins',
      'twisted', 'twister', 'two', 'tyranitar', 'tyranitar2', 'tyranno', 'tyranno2',
      'umbreon', 'unicorn', 'unicorn2', 'uniuni', 'up', 'urchin', 'vampire', 'vampire2',
      'vanilla', 'vapor', 'varoom', 'vega', 'velvet', 'venom', 'vent', 'verdict',
      'verdict2', 'vibrava', 'vicar', 'vicar2', 'victory', 'vile', 'vile2', 'vile3',
      'vinyl', 'vip', 'virgo', 'virus', 'vision', 'visua', 'visual', 'vivaldi',
      'void', 'volcanion', 'volt', 'voodoo', 'vortex', 'vulture', 'waddle', 'waffle',
      'wagtail', 'walnut', 'walrus', 'warden', 'warthog', 'watch', 'water', 'water2',
      'waterbuffalo', 'watermelon', 'wave', 'waxwing', 'weasel', 'weasel2', 'weather',
      'weavile', 'web', 'webster', 'weedle', 'werewolf', 'werewolf2', 'whale', 'whale2',
      'wheat', 'wheatley', 'wheel', 'whip', 'whip2', 'whiskers', 'white', 'white2',
      'white_robo', 'whiz', 'wicked', 'widow', 'wild', 'wild2', 'wild3', 'wilde',
      'wildfire', 'willy', 'wimp', 'wind', 'wind2', 'wing', 'wing2', 'winged',
      'winking', 'winter', 'wolf', 'wolf2', 'wolf3', 'wolf4', 'wolf5', 'wolf6',
      'wolf7', 'wolverine', 'wonder', 'wood', 'wood2', 'woodchuck', 'woodpecker',
      'wool', 'wool2', 'woolly', 'work', 'wraith', 'wrap', 'xatu', 'xeon',
      'xeon_2', 'yamada', 'yiinaang', 'yoshi', 'zebra', 'zebra2', 'ziggurat', 'zunna',
    ];
    return monsterList;
  }

  /**
   * 解析怪物数据
   */
  private parseMonsterData(data: Record<string, MonsterData>): void {
    for (const [slug, monster] of Object.entries(data)) {
      this.monsterCache.set(slug, monster);
    }
  }

  /**
   * 加载示例怪物数据
   */
  private loadExampleMonsters(): void {
    const exampleMonsters: Record<string, MonsterData> = {
      'txmn_cardiling': {
        slug: 'txmn_cardiling',
        name: 'Cardiling',
        category: 'Cardinal',
        description: 'A small bird monster with vibrant red feathers.',
        hp: 45,
        attack: 50,
        defense: 40,
        speed: 60,
        special_attack: 45,
        special_defense: 40,
        types: ['fire', 'flying'],
        height: 0.3,
        weight: 2.5,
        catch_rate: 200,
        exp_give: 64,
        techniques: ['technique_peck', 'technique_fireball'],
        sprites: {
          front: 'assets/monsters/cardiling_front.png',
          back: 'assets/monsters/cardiling_back.png',
          menu: 'assets/monsters/cardiling_menu.png',
        },
      },
      'txmn_rockitten': {
        slug: 'txmn_rockitten',
        name: 'Rockitten',
        category: 'Rock Cat',
        description: 'A playful kitten made of living stone.',
        hp: 55,
        attack: 60,
        defense: 70,
        speed: 35,
        special_attack: 40,
        special_defense: 55,
        types: ['earth'],
        height: 0.4,
        weight: 15.0,
        catch_rate: 180,
        exp_give: 72,
        techniques: ['technique_tackle', 'technique_rock_throw'],
        sprites: {
          front: 'assets/monsters/rockitten_front.png',
          back: 'assets/monsters/rockitten_back.png',
          menu: 'assets/monsters/rockitten_menu.png',
        },
      },
      'txmn_nudiflot': {
        slug: 'txmn_nudiflot',
        name: 'Nudiflot',
        category: 'Sea Slug',
        description: 'A colorful sea creature that floats gracefully.',
        hp: 50,
        attack: 35,
        defense: 45,
        speed: 50,
        special_attack: 70,
        special_defense: 65,
        types: ['water'],
        height: 0.2,
        weight: 0.5,
        catch_rate: 190,
        exp_give: 68,
        techniques: ['technique_water_gun', 'technique_bubble'],
        sprites: {
          front: 'assets/monsters/nudiflot_front.png',
          back: 'assets/monsters/nudiflot_back.png',
          menu: 'assets/monsters/nudiflot_menu.png',
        },
      },
      'txmn_djinnos': {
        slug: 'txmn_djinnos',
        name: 'Djinnos',
        category: 'Wind Spirit',
        description: 'An ethereal being made of swirling winds.',
        hp: 40,
        attack: 45,
        defense: 35,
        speed: 90,
        special_attack: 75,
        special_defense: 50,
        types: ['flying'],
        height: 0.6,
        weight: 0.1,
        catch_rate: 120,
        exp_give: 85,
        techniques: ['technique_gust', 'technique_wind_slash'],
        sprites: {
          front: 'assets/monsters/djinnos_front.png',
          back: 'assets/monsters/djinnos_back.png',
          menu: 'assets/monsters/djinnos_menu.png',
        },
      },
      'txmn_leafygator': {
        slug: 'txmn_leafygator',
        name: 'Leafygator',
        category: 'Alligator',
        description: 'A swamp-dwelling alligator covered in moss.',
        hp: 65,
        attack: 75,
        defense: 60,
        speed: 40,
        special_attack: 55,
        special_defense: 60,
        types: ['grass', 'water'],
        height: 1.2,
        weight: 35.0,
        catch_rate: 100,
        exp_give: 95,
        techniques: ['technique_bite', 'technique_vine_whip', 'technique_water_gun'],
        sprites: {
          front: 'assets/monsters/leafygator_front.png',
          back: 'assets/monsters/leafygator_back.png',
          menu: 'assets/monsters/leafygator_menu.png',
        },
      },
    };

    this.parseMonsterData(exampleMonsters);
  }

  /**
   * 获取怪物数据
   */
  getMonster(slug: string): MonsterData | null {
    return this.monsterCache.get(slug) || null;
  }

  /**
   * 获取所有怪物
   */
  getAllMonsters(): MonsterData[] {
    return Array.from(this.monsterCache.values());
  }

  /**
   * 创建怪物实例
   */
  createMonsterInstance(slug: string, level: number): MonsterInstance | null {
    const data = this.getMonster(slug);
    if (!data) return null;

    // 根据等级计算属性
    const levelMultiplier = 1 + (level - 1) * 0.05;

    return {
      instanceId: `${slug}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      monsterId: slug,
      level: level,
      exp: this.calculateExpForLevel(level),
      currentHp: Math.floor(data.hp * levelMultiplier * 2),
      maxHp: Math.floor(data.hp * levelMultiplier * 2),
      attack: Math.floor(data.attack * levelMultiplier),
      defense: Math.floor(data.defense * levelMultiplier),
      speed: Math.floor(data.speed * levelMultiplier),
      specialAttack: Math.floor(data.special_attack * levelMultiplier),
      specialDefense: Math.floor(data.special_defense * levelMultiplier),
      types: [...data.types],
      techniques: [...data.techniques],
      status: [],
      caughtAt: Date.now(),
    };
  }

  /**
   * 计算升级所需经验值
   */
  calculateExpForLevel(level: number): number {
    // 简化的经验公式：level^3
    return Math.floor(Math.pow(level, 3));
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.monsterCache.clear();
    this.loaded = false;
  }
}

/**
 * 导出单例
 */
export const monsterDataLoader = MonsterDataLoader.getInstance();
