export type MarketGroup = "贵金属" | "能源" | "外汇" | "股指" | "加密资产";

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
  asOf: "2026-07-28",
  published: "2026-07-31",
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
    openInterest: 384603,
    long: 135093,
    short: 15298,
    weeklyDelta: -5036,
    counterpartLabel: "生产商净仓",
    breakdown: [
      { name: "生产商 / 商业商", long: 15367, short: 35916, netChange: -1228 },
      { name: "掉期交易商", long: 23661, short: 215421, spreading: 36432, netChange: 2118 },
      { name: "管理基金", long: 135093, short: 15298, spreading: 18384, netChange: -5036 },
      { name: "其他报告交易者", long: 84529, short: 22254, spreading: 9753, netChange: 3196 },
      { name: "非报告交易者", long: 61384, short: 31145, netChange: 950 },
    ],
    history: [
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
    openInterest: 106719,
    long: 17939,
    short: 8757,
    weeklyDelta: -2100,
  },
  {
    symbol: "HG",
    name: "铜",
    group: "贵金属",
    contractCode: "085692",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 274552,
    long: 82988,
    short: 17980,
    weeklyDelta: -6507,
  },
  {
    symbol: "CL",
    name: "WTI 原油",
    group: "能源",
    contractCode: "067651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1859795,
    long: 193959,
    short: 101016,
    weeklyDelta: 28964,
  },
  {
    symbol: "NG",
    name: "天然气",
    group: "能源",
    contractCode: "023651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1672441,
    long: 238465,
    short: 344291,
    weeklyDelta: -3070,
  },
  {
    symbol: "BZ",
    name: "布伦特原油",
    group: "能源",
    contractCode: "06765T",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 258755,
    long: 16703,
    short: 963,
    weeklyDelta: 1485,
  },
  {
    symbol: "DXY",
    name: "美元指数",
    group: "外汇",
    contractCode: "098662",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 58251,
    long: 17528,
    short: 19129,
    weeklyDelta: 337,
    counterpartLabel: "资管机构净仓",
    breakdown: [
      { name: "交易商 / 中介", long: 5347, short: 32488, spreading: 325, netChange: -2642 },
      { name: "资管机构", long: 22964, short: 1352, spreading: 1262, netChange: 1761 },
      { name: "杠杆基金", long: 17528, short: 19129, spreading: 103, netChange: 337 },
      { name: "其他报告交易者", long: 6120, short: 1900, spreading: 145, netChange: 367 },
      { name: "非报告交易者", long: 4457, short: 1547, netChange: 177 },
    ],
    history: [
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
    openInterest: 819806,
    long: 92672,
    short: 157870,
    weeklyDelta: -8527,
  },
  {
    symbol: "GBP",
    name: "英镑",
    group: "外汇",
    contractCode: "096742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 267426,
    long: 74612,
    short: 33515,
    weeklyDelta: 7861,
  },
  {
    symbol: "JPY",
    name: "日元",
    group: "外汇",
    contractCode: "097741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 432366,
    long: 76752,
    short: 178742,
    weeklyDelta: -5805,
  },
  {
    symbol: "AUD",
    name: "澳元",
    group: "外汇",
    contractCode: "232741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 229784,
    long: 57490,
    short: 29872,
    weeklyDelta: 2830,
  },
  {
    symbol: "CAD",
    name: "加元",
    group: "外汇",
    contractCode: "090741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 372447,
    long: 26391,
    short: 128886,
    weeklyDelta: -4118,
  },
  {
    symbol: "ES",
    name: "标普 500",
    group: "股指",
    contractCode: "13874A",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 1984408,
    long: 155964,
    short: 453440,
    weeklyDelta: 25389,
  },
  {
    symbol: "NQ",
    name: "纳斯达克 100",
    group: "股指",
    contractCode: "209742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 294781,
    long: 61233,
    short: 119531,
    weeklyDelta: 16392,
  },
  {
    symbol: "BTC",
    name: "比特币",
    group: "加密资产",
    contractCode: "133741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 20019,
    long: 3295,
    short: 10168,
    weeklyDelta: 1076,
  },
];

export const groupOptions: Array<"全部" | MarketGroup> = [
  "全部",
  "贵金属",
  "能源",
  "外汇",
  "股指",
  "加密资产",
];
