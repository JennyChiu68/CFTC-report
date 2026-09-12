// Catalog only: no hard-coded observations or fallback market numbers.
export type MarketGroup = "贵金属" | "能源" | "外汇" | "股指";
export type TraderRow = {
  name: string; long: number; short: number; spreading?: number;
  longChange: number; shortChange: number; netChange: number;
};
export type CftcSnapshot = {
  date: string; openInterest: number; openInterestChange: number;
  long: number; short: number; weeklyDelta: number; breakdown: TraderRow[];
};
export type CftcAsset = {
  symbol: string; name: string; group: MarketGroup; contractCode: string;
  reportType: "Disaggregated" | "TFF"; coreTrader: "管理基金" | "杠杆基金";
};
export const assets: CftcAsset[] = [
  {
    "symbol": "XAU",
    "name": "黄金",
    "group": "贵金属",
    "contractCode": "088691",
    "reportType": "Disaggregated",
    "coreTrader": "管理基金"
  },
  {
    "symbol": "XAG",
    "name": "白银",
    "group": "贵金属",
    "contractCode": "084691",
    "reportType": "Disaggregated",
    "coreTrader": "管理基金"
  },
  {
    "symbol": "HG",
    "name": "铜",
    "group": "贵金属",
    "contractCode": "085692",
    "reportType": "Disaggregated",
    "coreTrader": "管理基金"
  },
  {
    "symbol": "CL",
    "name": "WTI 原油",
    "group": "能源",
    "contractCode": "067651",
    "reportType": "Disaggregated",
    "coreTrader": "管理基金"
  },
  {
    "symbol": "NG",
    "name": "天然气",
    "group": "能源",
    "contractCode": "023651",
    "reportType": "Disaggregated",
    "coreTrader": "管理基金"
  },
  {
    "symbol": "BZ",
    "name": "布伦特原油",
    "group": "能源",
    "contractCode": "06765T",
    "reportType": "Disaggregated",
    "coreTrader": "管理基金"
  },
  {
    "symbol": "DXY",
    "name": "美元指数",
    "group": "外汇",
    "contractCode": "098662",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  },
  {
    "symbol": "EUR",
    "name": "欧元",
    "group": "外汇",
    "contractCode": "099741",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  },
  {
    "symbol": "GBP",
    "name": "英镑",
    "group": "外汇",
    "contractCode": "096742",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  },
  {
    "symbol": "JPY",
    "name": "日元",
    "group": "外汇",
    "contractCode": "097741",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  },
  {
    "symbol": "AUD",
    "name": "澳元",
    "group": "外汇",
    "contractCode": "232741",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  },
  {
    "symbol": "CAD",
    "name": "加元",
    "group": "外汇",
    "contractCode": "090741",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  },
  {
    "symbol": "ES",
    "name": "标普 500",
    "group": "股指",
    "contractCode": "13874A",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  },
  {
    "symbol": "NQ",
    "name": "纳斯达克 100",
    "group": "股指",
    "contractCode": "209742",
    "reportType": "TFF",
    "coreTrader": "杠杆基金"
  }
];
