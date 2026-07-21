export type MarketGroup = "贵金属" | "能源" | "外汇" | "股指" | "加密资产";

export type TraderRow = {
  name: string;
  long: number;
  short: number;
  spreading?: number;
  netChange: number;
};

export type HistoryPoint = {
  date: string;
  net: number;
  counterpartNet: number;
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
  asOf: "2026-07-14",
  published: "2026-07-17",
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
    openInterest: 383689,
    long: 136905,
    short: 16126,
    weeklyDelta: 4618,
    counterpartLabel: "生产商净仓",
    breakdown: [
      { name: "生产商 / 商业商", long: 15840, short: 34989, netChange: 1837 },
      { name: "掉期交易商", long: 25177, short: 220816, spreading: 38622, netChange: 5657 },
      { name: "管理基金", long: 136905, short: 16126, spreading: 18475, netChange: 4618 },
      { name: "其他报告交易者", long: 90405, short: 24502, spreading: 13846, netChange: -12182 },
      { name: "非报告交易者", long: 44419, short: 16313, netChange: 70 },
    ],
    history: [
      { date: "07-14", net: 120779, counterpartNet: -19149 },
      { date: "07-07", net: 116161, counterpartNet: -20986 },
      { date: "06-30", net: 120100, counterpartNet: -17000 },
      { date: "06-23", net: 115400, counterpartNet: -9300 },
      { date: "06-16", net: 113700, counterpartNet: -17000 },
      { date: "06-09", net: 105900, counterpartNet: -19300 },
      { date: "06-02", net: 112200, counterpartNet: -20200 },
      { date: "05-26", net: 97400, counterpartNet: -19500 },
      { date: "05-19", net: 93500, counterpartNet: -17900 },
      { date: "05-12", net: 98000, counterpartNet: -20200 },
      { date: "05-05", net: 94300, counterpartNet: -19100 },
      { date: "04-28", net: 89800, counterpartNet: -20200 },
      { date: "04-21", net: 93000, counterpartNet: -20400 },
      { date: "04-14", net: 95100, counterpartNet: -18500 },
      { date: "04-07", net: 90000, counterpartNet: -19300 },
      { date: "03-31", net: 92800, counterpartNet: -19900 },
      { date: "03-24", net: 91600, counterpartNet: -22200 },
      { date: "03-17", net: 102000, counterpartNet: -17800 },
      { date: "03-10", net: 98400, counterpartNet: -19700 },
      { date: "03-03", net: 97900, counterpartNet: -20800 },
      { date: "02-24", net: 96000, counterpartNet: -19800 },
      { date: "02-17", net: 95900, counterpartNet: -21400 },
      { date: "02-10", net: 92000, counterpartNet: -18400 },
      { date: "02-03", net: 92100, counterpartNet: -24600 },
      { date: "01-27", net: 118200, counterpartNet: -40600 },
      { date: "01-20", net: 137400, counterpartNet: -42300 },
    ],
  },
  {
    symbol: "XAG",
    name: "白银",
    group: "贵金属",
    contractCode: "084691",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 105023,
    long: 17554,
    short: 6053,
    weeklyDelta: -1700,
  },
  {
    symbol: "HG",
    name: "铜",
    group: "贵金属",
    contractCode: "085692",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 259873,
    long: 77338,
    short: 17153,
    weeklyDelta: 1401,
  },
  {
    symbol: "CL",
    name: "WTI 原油",
    group: "能源",
    contractCode: "067651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1900000,
    long: 181200,
    short: 119200,
    weeklyDelta: -2100,
  },
  {
    symbol: "NG",
    name: "天然气",
    group: "能源",
    contractCode: "023651",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 1700000,
    long: 227200,
    short: 332900,
    weeklyDelta: -45400,
  },
  {
    symbol: "BZ",
    name: "布伦特原油",
    group: "能源",
    contractCode: "06765T",
    reportType: "Disaggregated",
    coreTrader: "管理基金",
    openInterest: 247100,
    long: 13100,
    short: 604,
    weeklyDelta: 181,
  },
  {
    symbol: "DXY",
    name: "美元指数",
    group: "外汇",
    contractCode: "098662",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 53293,
    long: 13066,
    short: 17932,
    weeklyDelta: -412,
    counterpartLabel: "资管机构净仓",
    breakdown: [
      { name: "交易商 / 中介", long: 4538, short: 28155, netChange: 171 },
      { name: "资管机构", long: 24260, short: 2221, spreading: 1279, netChange: 615 },
      { name: "杠杆基金", long: 13066, short: 17932, spreading: 299, netChange: -412 },
      { name: "其他报告交易者", long: 5517, short: 1734, spreading: 78, netChange: -66 },
      { name: "非报告交易者", long: 4256, short: 1595, netChange: -308 },
    ],
    history: [
      { date: "07-14", net: -4866, counterpartNet: 22039 },
      { date: "07-07", net: -4454, counterpartNet: 21424 },
      { date: "06-30", net: -5600, counterpartNet: 20100 },
      { date: "06-23", net: -5400, counterpartNet: 18700 },
      { date: "06-16", net: -1900, counterpartNet: 18400 },
      { date: "06-09", net: -13700, counterpartNet: 16600 },
      { date: "06-02", net: -11100, counterpartNet: 15000 },
      { date: "05-26", net: -12500, counterpartNet: 16200 },
      { date: "05-19", net: -11700, counterpartNet: 14600 },
      { date: "05-12", net: -4800, counterpartNet: 8400 },
      { date: "05-05", net: -5800, counterpartNet: 10600 },
      { date: "04-28", net: -3200, counterpartNet: 7900 },
      { date: "04-21", net: -2400, counterpartNet: 7000 },
      { date: "04-14", net: -3100, counterpartNet: 8500 },
      { date: "04-07", net: -8600, counterpartNet: 13600 },
      { date: "03-31", net: -8800, counterpartNet: 13800 },
      { date: "03-24", net: -6900, counterpartNet: 12400 },
      { date: "03-17", net: -5600, counterpartNet: 10800 },
      { date: "03-10", net: -11700, counterpartNet: 7200 },
      { date: "03-03", net: -4500, counterpartNet: 989 },
      { date: "02-24", net: 850, counterpartNet: -3500 },
      { date: "02-17", net: 1900, counterpartNet: -4100 },
      { date: "02-10", net: 2600, counterpartNet: -4000 },
      { date: "02-03", net: 757, counterpartNet: -3700 },
      { date: "01-27", net: 375, counterpartNet: -1300 },
      { date: "01-20", net: -4100, counterpartNet: 1900 },
    ],
  },
  {
    symbol: "EUR",
    name: "欧元",
    group: "外汇",
    contractCode: "099741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 799500,
    long: 90000,
    short: 143700,
    weeklyDelta: -8200,
  },
  {
    symbol: "GBP",
    name: "英镑",
    group: "外汇",
    contractCode: "096742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 265200,
    long: 62400,
    short: 33900,
    weeklyDelta: 10600,
  },
  {
    symbol: "JPY",
    name: "日元",
    group: "外汇",
    contractCode: "097741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 396500,
    long: 80900,
    short: 171400,
    weeklyDelta: -378,
  },
  {
    symbol: "AUD",
    name: "澳元",
    group: "外汇",
    contractCode: "232741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 208500,
    long: 55900,
    short: 28700,
    weeklyDelta: -2500,
  },
  {
    symbol: "CAD",
    name: "加元",
    group: "外汇",
    contractCode: "090741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 368800,
    long: 34000,
    short: 126800,
    weeklyDelta: -6800,
  },
  {
    symbol: "ES",
    name: "标普 500",
    group: "股指",
    contractCode: "13874A",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 1900000,
    long: 135500,
    short: 500500,
    weeklyDelta: -3100,
  },
  {
    symbol: "NQ",
    name: "纳斯达克 100",
    group: "股指",
    contractCode: "209742",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 307400,
    long: 32700,
    short: 113100,
    weeklyDelta: -11800,
  },
  {
    symbol: "BTC",
    name: "比特币",
    group: "加密资产",
    contractCode: "133741",
    reportType: "TFF",
    coreTrader: "杠杆基金",
    openInterest: 19400,
    long: 4000,
    short: 11500,
    weeklyDelta: -774,
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

