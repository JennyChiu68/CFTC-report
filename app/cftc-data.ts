export type MarketGroup = "贵金属" | "能源" | "外汇" | "股指";

export type TraderRow = {
  name: string;
  long: number;
  short: number;
  spreading?: number;
  longChange?: number;
  shortChange?: number;
  netChange: number;
};

export type HistoryPoint = {
  date: string;
  net: number;
  counterpartNet: number;
  thirdNet?: number;
  categoryNets?: Array<{ name: string; net: number }>;
  openInterest?: number;
  selected?: boolean;
};

export type CftcSnapshot = {
  date: string;
  openInterest: number;
  openInterestChange: number;
  long: number;
  short: number;
  weeklyDelta: number;
  breakdown: TraderRow[];
};

export type CftcAsset = {
  symbol: string;
  name: string;
  group: MarketGroup;
  contractCode: string;
  reportType: "Disaggregated" | "TFF";
  coreTrader: "管理基金" | "杠杆基金";
  openInterest: number;
  long: number;
  short: number;
  weeklyDelta: number;
  breakdown?: TraderRow[];
  history?: HistoryPoint[];
  counterpartLabel?: string;
};

export const reportMeta = {
  asOf: "2026-08-25",
  published: "2026-08-28",
  scope: "Futures Only",
};

export const assets: CftcAsset[] = [
  {
    symbol: "XAU",
    name: "黄金",
    group: "贵金属",
    contractCode: "088691",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 427957,
    long: 159819,
    short: 15072,
    weeklyDelta: 3099,
    counterpartLabel: "生产商净仓",
    breakdown: [
      { name: "生产商 / 商业商", long: 16861, short: 51419, longChange: -22, shortChange: 4775, netChange: -4797 },
      { name: "掉期交易商", long: 16656, short: 261683, spreading: 28936, longChange: -2048, shortChange: 14322, netChange: -16370 },
      { name: "管理基金", long: 159819, short: 15072, spreading: 16251, longChange: 5224, shortChange: 2125, netChange: 3099 },
      { name: "其他报告交易者", long: 117340, short: 18753, spreading: 17369, longChange: 15033, shortChange: -3013, netChange: 18046 },
      { name: "非报告交易者", long: 54725, short: 18474, longChange: 3378, shortChange: 3356, netChange: 22 },
    ],
    history: [
      { date: "08-25", net: 144747, counterpartNet: -34558, thirdNet: -245027, openInterest: 427957 },
      { date: "08-18", net: 141648, counterpartNet: -29761, thirdNet: -228657, openInterest: 406260 },
      { date: "08-11", net: 137662, counterpartNet: -27935, thirdNet: -224705, openInterest: 400309 },
      { date: "08-04", net: 130766, counterpartNet: -18856, thirdNet: -207635, openInterest: 371551 },
      { date: "07-28", net: 119795, counterpartNet: -20549, thirdNet: -191760, openInterest: 384603 },
      { date: "07-21", net: 124831, counterpartNet: -19321, thirdNet: -193878, openInterest: 383368 },
      { date: "07-14", net: 120779, counterpartNet: -19149, thirdNet: -195639 },
      { date: "07-07", net: 116161, counterpartNet: -20986, thirdNet: -201296 },
      { date: "06-30", net: 120091, counterpartNet: -17046, thirdNet: -204024 },
      { date: "06-23", net: 115395, counterpartNet: -9336, thirdNet: -196068 },
      { date: "06-16", net: 113721, counterpartNet: -17047, thirdNet: -190516 },
      { date: "06-09", net: 105863, counterpartNet: -19300, thirdNet: -181736 },
      { date: "06-02", net: 112179, counterpartNet: -20154, thirdNet: -186191 },
      { date: "05-26", net: 97446, counterpartNet: -19510, thirdNet: -166256 },
      { date: "05-19", net: 93540, counterpartNet: -17914, thirdNet: -173715 },
      { date: "05-12", net: 98015, counterpartNet: -20202, thirdNet: -190056 },
      { date: "05-05", net: 94254, counterpartNet: -19112, thirdNet: -179823 },
      { date: "04-28", net: 89752, counterpartNet: -20192, thirdNet: -174621 },
      { date: "04-21", net: 92976, counterpartNet: -20418, thirdNet: -182522 },
      { date: "04-14", net: 95141, counterpartNet: -18530, thirdNet: -182552 },
      { date: "04-07", net: 90032, counterpartNet: -19296, thirdNet: -174455 },
      { date: "03-31", net: 92814, counterpartNet: -19910, thirdNet: -181730 },
      { date: "03-24", net: 91621, counterpartNet: -22216, thirdNet: -181612 },
      { date: "03-17", net: 102043, counterpartNet: -17834, thirdNet: -180814 },
      { date: "03-10", net: 98399, counterpartNet: -19696, thirdNet: -183280 },
      { date: "03-03", net: 97917, counterpartNet: -20791, thirdNet: -179792 },
      { date: "02-24", net: 95974, counterpartNet: -19818, thirdNet: -180988 },
      { date: "02-17", net: 95893, counterpartNet: -21398, thirdNet: -175384 },
      { date: "02-10", net: 92022, counterpartNet: -18445, thirdNet: -179293 },
      { date: "02-03", net: 92072, counterpartNet: -24634, thirdNet: -183144 },
    ],
  },
  {
    symbol: "XAG",
    name: "白银",
    group: "贵金属",
    contractCode: "084691",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 113801,
    long: 21421,
    short: 7348,
    weeklyDelta: 2378,
  },
  {
    symbol: "HG",
    name: "铜",
    group: "贵金属",
    contractCode: "085692",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 283299,
    long: 92107,
    short: 15836,
    weeklyDelta: -2377,
  },
  {
    symbol: "CL",
    name: "WTI 原油",
    group: "能源",
    contractCode: "067651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1906740,
    long: 196882,
    short: 112862,
    weeklyDelta: -3459,
  },
  {
    symbol: "NG",
    name: "天然气",
    group: "能源",
    contractCode: "023651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1747730,
    long: 269125,
    short: 340798,
    weeklyDelta: 28407,
  },
  {
    symbol: "BZ",
    name: "布伦特原油",
    group: "能源",
    contractCode: "06765T",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 270144,
    long: 9071,
    short: 1945,
    weeklyDelta: 290,
  },
  {
    symbol: "DXY",
    name: "美元指数",
    group: "外汇",
    contractCode: "098662",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 47953,
    long: 16343,
    short: 7154,
    weeklyDelta: 1077,
    counterpartLabel: "资管机构净仓",
    breakdown: [
      { name: "交易商 / 中介", long: 6047, short: 33200, spreading: 0, longChange: 154, shortChange: 50, netChange: 104 },
      { name: "资管机构", long: 15863, short: 1845, spreading: 1482, longChange: -929, shortChange: 51, netChange: -980 },
      { name: "杠杆基金", long: 16343, short: 7154, spreading: 332, longChange: 1145, shortChange: 68, netChange: 1077 },
      { name: "其他报告交易者", long: 4393, short: 1603, spreading: 148, longChange: 302, shortChange: 62, netChange: 240 },
      { name: "非报告交易者", long: 3345, short: 2189, longChange: -531, shortChange: -90, netChange: -441 },
    ],
    history: [
      { date: "08-25", net: 9189, counterpartNet: 14018, thirdNet: -27153, openInterest: 47953 },
      { date: "08-18", net: 8112, counterpartNet: 14998, thirdNet: -27257, openInterest: 47928 },
      { date: "08-11", net: 5772, counterpartNet: 16527, thirdNet: -27292, openInterest: 49541 },
      { date: "08-04", net: 3849, counterpartNet: 18095, thirdNet: -27070, openInterest: 52154 },
      { date: "07-28", net: -1601, counterpartNet: 21612, thirdNet: -27141, openInterest: 58251 },
      { date: "07-21", net: -1938, counterpartNet: 19851, thirdNet: -24499, openInterest: 53953 },
      { date: "07-14", net: -4866, counterpartNet: 22039, thirdNet: -23617 },
      { date: "07-07", net: -4454, counterpartNet: 21424, thirdNet: -23788 },
      { date: "06-30", net: -5580, counterpartNet: 20061, thirdNet: -21370 },
      { date: "06-23", net: -5352, counterpartNet: 18710, thirdNet: -20597 },
      { date: "06-16", net: -1870, counterpartNet: 18351, thirdNet: -20892 },
      { date: "06-09", net: -13656, counterpartNet: 16601, thirdNet: -6957 },
      { date: "06-02", net: -11112, counterpartNet: 15003, thirdNet: -6979 },
      { date: "05-26", net: -12530, counterpartNet: 16169, thirdNet: -6982 },
      { date: "05-19", net: -11716, counterpartNet: 14595, thirdNet: -6872 },
      { date: "05-12", net: -4751, counterpartNet: 8353, thirdNet: -6921 },
      { date: "05-05", net: -5805, counterpartNet: 10575, thirdNet: -6970 },
      { date: "04-28", net: -3161, counterpartNet: 7928, thirdNet: -7012 },
      { date: "04-21", net: -2409, counterpartNet: 7025, thirdNet: -7051 },
      { date: "04-14", net: -3095, counterpartNet: 8538, thirdNet: -7172 },
      { date: "04-07", net: -8641, counterpartNet: 13646, thirdNet: -7470 },
      { date: "03-31", net: -8832, counterpartNet: 13754, thirdNet: -7396 },
      { date: "03-24", net: -6921, counterpartNet: 12403, thirdNet: -7307 },
      { date: "03-17", net: -5615, counterpartNet: 10757, thirdNet: -7541 },
      { date: "03-10", net: -11683, counterpartNet: 7156, thirdNet: 2045 },
      { date: "03-03", net: -4547, counterpartNet: 989, thirdNet: 2505 },
      { date: "02-24", net: 850, counterpartNet: -3549, thirdNet: 2523 },
      { date: "02-17", net: 1892, counterpartNet: -4129, thirdNet: 2566 },
      { date: "02-10", net: 2649, counterpartNet: -3962, thirdNet: 2746 },
      { date: "02-03", net: 757, counterpartNet: -3743, thirdNet: 2694 },
    ],
  },
  {
    symbol: "EUR",
    name: "欧元",
    group: "外汇",
    contractCode: "099741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 818524,
    long: 90921,
    short: 129280,
    weeklyDelta: 19357,
  },
  {
    symbol: "GBP",
    name: "英镑",
    group: "外汇",
    contractCode: "096742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 318468,
    long: 81286,
    short: 33377,
    weeklyDelta: 5032,
  },
  {
    symbol: "JPY",
    name: "日元",
    group: "外汇",
    contractCode: "097741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 384216,
    long: 66528,
    short: 143570,
    weeklyDelta: -9071,
  },
  {
    symbol: "AUD",
    name: "澳元",
    group: "外汇",
    contractCode: "232741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 333906,
    long: 81344,
    short: 27283,
    weeklyDelta: 1953,
  },
  {
    symbol: "CAD",
    name: "加元",
    group: "外汇",
    contractCode: "090741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 329544,
    long: 27384,
    short: 99476,
    weeklyDelta: 16805,
  },
  {
    symbol: "ES",
    name: "标普 500",
    group: "股指",
    contractCode: "13874A",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 2045669,
    long: 150526,
    short: 465730,
    weeklyDelta: -33802,
  },
  {
    symbol: "NQ",
    name: "纳斯达克 100",
    group: "股指",
    contractCode: "209742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 301987,
    long: 51841,
    short: 93073,
    weeklyDelta: 20539,
  },
];

export const groupOptions: Array<"全部" | MarketGroup> = [
  "全部",
  "贵金属",
  "能源",
  "外汇",
  "股指",
];
