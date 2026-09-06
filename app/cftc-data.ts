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
  asOf: "2026-09-01",
  published: "2026-09-04",
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
    openInterest: 415196,
    long: 149721,
    short: 12950,
    weeklyDelta: -7976,
    counterpartLabel: "生产商净仓",
    breakdown: [
      { name: "生产商 / 商业商", long: 17444, short: 48733, longChange: 583, shortChange: -2686, netChange: 3269 },
      { name: "掉期交易商", long: 17798, short: 251227, spreading: 26208, longChange: 1142, shortChange: -10456, netChange: 11598 },
      { name: "管理基金", long: 149721, short: 12950, spreading: 27264, longChange: -10098, shortChange: -2122, netChange: -7976 },
      { name: "其他报告交易者", long: 110764, short: 19411, spreading: 13967, longChange: -6576, shortChange: 658, netChange: -7234 },
      { name: "非报告交易者", long: 52030, short: 15436, longChange: -2695, shortChange: -3038, netChange: 343 },
    ],
    history: [
      { date: "09-01", net: 136771, counterpartNet: -31289, thirdNet: -233429, openInterest: 415196 },
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
    openInterest: 104362,
    long: 19156,
    short: 6558,
    weeklyDelta: -1475,
  },
  {
    symbol: "HG",
    name: "铜",
    group: "贵金属",
    contractCode: "085692",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 282640,
    long: 91430,
    short: 18548,
    weeklyDelta: -3389,
  },
  {
    symbol: "CL",
    name: "WTI 原油",
    group: "能源",
    contractCode: "067651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1921085,
    long: 205300,
    short: 111019,
    weeklyDelta: 10261,
  },
  {
    symbol: "NG",
    name: "天然气",
    group: "能源",
    contractCode: "023651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1807497,
    long: 258649,
    short: 348130,
    weeklyDelta: -17808,
  },
  {
    symbol: "BZ",
    name: "布伦特原油",
    group: "能源",
    contractCode: "06765T",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 253258,
    long: 7098,
    short: 1791,
    weeklyDelta: -1819,
  },
  {
    symbol: "DXY",
    name: "美元指数",
    group: "外汇",
    contractCode: "098662",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 50020,
    long: 16024,
    short: 8891,
    weeklyDelta: -2056,
    counterpartLabel: "资管机构净仓",
    breakdown: [
      { name: "交易商 / 中介", long: 5796, short: 32811, spreading: 0, longChange: -251, shortChange: -389, netChange: 138 },
      { name: "资管机构", long: 17667, short: 1426, spreading: 1588, longChange: 1804, shortChange: -419, netChange: 2223 },
      { name: "杠杆基金", long: 16024, short: 8891, spreading: 2214, longChange: -319, shortChange: 1737, netChange: -2056 },
      { name: "其他报告交易者", long: 3434, short: 1492, spreading: 0, longChange: -959, shortChange: -111, netChange: -848 },
      { name: "非报告交易者", long: 3297, short: 1598, longChange: -48, shortChange: -591, netChange: 543 },
    ],
    history: [
      { date: "09-01", net: 7133, counterpartNet: 16241, thirdNet: -27015, openInterest: 50020 },
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
    openInterest: 865412,
    long: 96137,
    short: 134310,
    weeklyDelta: 186,
  },
  {
    symbol: "GBP",
    name: "英镑",
    group: "外汇",
    contractCode: "096742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 317961,
    long: 77117,
    short: 33950,
    weeklyDelta: -4742,
  },
  {
    symbol: "JPY",
    name: "日元",
    group: "外汇",
    contractCode: "097741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 411882,
    long: 58529,
    short: 160717,
    weeklyDelta: -25146,
  },
  {
    symbol: "AUD",
    name: "澳元",
    group: "外汇",
    contractCode: "232741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 391678,
    long: 78498,
    short: 28836,
    weeklyDelta: -4399,
  },
  {
    symbol: "CAD",
    name: "加元",
    group: "外汇",
    contractCode: "090741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 334800,
    long: 27845,
    short: 96595,
    weeklyDelta: 3342,
  },
  {
    symbol: "ES",
    name: "标普 500",
    group: "股指",
    contractCode: "13874A",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 2046914,
    long: 165311,
    short: 482875,
    weeklyDelta: -2360,
  },
  {
    symbol: "NQ",
    name: "纳斯达克 100",
    group: "股指",
    contractCode: "209742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 300140,
    long: 55361,
    short: 69453,
    weeklyDelta: 27140,
  },
];

export const groupOptions: Array<"全部" | MarketGroup> = [
  "全部",
  "贵金属",
  "能源",
  "外汇",
  "股指",
];
