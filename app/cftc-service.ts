import type { CftcAsset, CftcSnapshot, TraderRow } from "./cftc-data";

type RawRow = Record<string, string | undefined>;

const endpoints = {
  Disaggregated: "https://publicreporting.cftc.gov/resource/72hh-3qpy.json",
  TFF: "https://publicreporting.cftc.gov/resource/gpe5-46if.json",
} as const;

const fields = {
  Disaggregated: [
    "report_date_as_yyyy_mm_dd", "open_interest_all", "change_in_open_interest_all",
    "prod_merc_positions_long", "prod_merc_positions_short", "change_in_prod_merc_long", "change_in_prod_merc_short",
    "swap_positions_long_all", "swap__positions_short_all", "swap__positions_spread_all", "change_in_swap_long_all", "change_in_swap_short_all",
    "m_money_positions_long_all", "m_money_positions_short_all", "m_money_positions_spread", "change_in_m_money_long_all", "change_in_m_money_short_all",
    "other_rept_positions_long", "other_rept_positions_short", "other_rept_positions_spread", "change_in_other_rept_long", "change_in_other_rept_short",
    "nonrept_positions_long_all", "nonrept_positions_short_all", "change_in_nonrept_long_all", "change_in_nonrept_short_all",
  ],
  TFF: [
    "report_date_as_yyyy_mm_dd", "open_interest_all", "change_in_open_interest_all",
    "dealer_positions_long_all", "dealer_positions_short_all", "dealer_positions_spread_all", "change_in_dealer_long_all", "change_in_dealer_short_all",
    "asset_mgr_positions_long", "asset_mgr_positions_short", "asset_mgr_positions_spread", "change_in_asset_mgr_long", "change_in_asset_mgr_short",
    "lev_money_positions_long", "lev_money_positions_short", "lev_money_positions_spread", "change_in_lev_money_long", "change_in_lev_money_short",
    "other_rept_positions_long", "other_rept_positions_short", "other_rept_positions_spread", "change_in_other_rept_long", "change_in_other_rept_short",
    "nonrept_positions_long_all", "nonrept_positions_short_all", "change_in_nonrept_long_all", "change_in_nonrept_short_all",
  ],
} as const;

function numeric(row: RawRow, key: string) {
  return Number(row[key] ?? 0);
}

function traderRow(row: RawRow, keys: { name: string; long: string; short: string; spread?: string; longChange: string; shortChange: string }): TraderRow {
  const longChange = numeric(row, keys.longChange);
  const shortChange = numeric(row, keys.shortChange);
  return {
    name: keys.name,
    long: numeric(row, keys.long),
    short: numeric(row, keys.short),
    spreading: keys.spread ? numeric(row, keys.spread) : undefined,
    longChange,
    shortChange,
    netChange: longChange - shortChange,
  };
}

function transformDisaggregated(row: RawRow): CftcSnapshot {
  const breakdown = [
    traderRow(row, { name: "生产商 / 商业商", long: "prod_merc_positions_long", short: "prod_merc_positions_short", longChange: "change_in_prod_merc_long", shortChange: "change_in_prod_merc_short" }),
    traderRow(row, { name: "掉期交易商", long: "swap_positions_long_all", short: "swap__positions_short_all", spread: "swap__positions_spread_all", longChange: "change_in_swap_long_all", shortChange: "change_in_swap_short_all" }),
    traderRow(row, { name: "管理基金", long: "m_money_positions_long_all", short: "m_money_positions_short_all", spread: "m_money_positions_spread", longChange: "change_in_m_money_long_all", shortChange: "change_in_m_money_short_all" }),
    traderRow(row, { name: "其他报告交易者", long: "other_rept_positions_long", short: "other_rept_positions_short", spread: "other_rept_positions_spread", longChange: "change_in_other_rept_long", shortChange: "change_in_other_rept_short" }),
    traderRow(row, { name: "非报告交易者", long: "nonrept_positions_long_all", short: "nonrept_positions_short_all", longChange: "change_in_nonrept_long_all", shortChange: "change_in_nonrept_short_all" }),
  ];
  const core = breakdown[2];
  return {
    date: row.report_date_as_yyyy_mm_dd?.slice(0, 10) ?? "",
    openInterest: numeric(row, "open_interest_all"),
    openInterestChange: numeric(row, "change_in_open_interest_all"),
    long: core.long,
    short: core.short,
    weeklyDelta: core.netChange,
    breakdown,
  };
}

function transformTff(row: RawRow): CftcSnapshot {
  const breakdown = [
    traderRow(row, { name: "交易商 / 中介", long: "dealer_positions_long_all", short: "dealer_positions_short_all", spread: "dealer_positions_spread_all", longChange: "change_in_dealer_long_all", shortChange: "change_in_dealer_short_all" }),
    traderRow(row, { name: "资管机构", long: "asset_mgr_positions_long", short: "asset_mgr_positions_short", spread: "asset_mgr_positions_spread", longChange: "change_in_asset_mgr_long", shortChange: "change_in_asset_mgr_short" }),
    traderRow(row, { name: "杠杆基金", long: "lev_money_positions_long", short: "lev_money_positions_short", spread: "lev_money_positions_spread", longChange: "change_in_lev_money_long", shortChange: "change_in_lev_money_short" }),
    traderRow(row, { name: "其他报告交易者", long: "other_rept_positions_long", short: "other_rept_positions_short", spread: "other_rept_positions_spread", longChange: "change_in_other_rept_long", shortChange: "change_in_other_rept_short" }),
    traderRow(row, { name: "非报告交易者", long: "nonrept_positions_long_all", short: "nonrept_positions_short_all", longChange: "change_in_nonrept_long_all", shortChange: "change_in_nonrept_short_all" }),
  ];
  const core = breakdown[2];
  return {
    date: row.report_date_as_yyyy_mm_dd?.slice(0, 10) ?? "",
    openInterest: numeric(row, "open_interest_all"),
    openInterestChange: numeric(row, "change_in_open_interest_all"),
    long: core.long,
    short: core.short,
    weeklyDelta: core.netChange,
    breakdown,
  };
}

export async function fetchCftcSnapshots(asset: CftcAsset, requestedLimit = 52) {
  const limit = Math.max(1, Math.min(104, Number.isFinite(requestedLimit) ? requestedLimit : 52));
  const endpoint = new URL(endpoints[asset.reportType]);
  endpoint.searchParams.set("$select", fields[asset.reportType].join(","));
  endpoint.searchParams.set("$where", `cftc_contract_market_code='${asset.contractCode}'`);
  endpoint.searchParams.set("$order", "report_date_as_yyyy_mm_dd DESC");
  endpoint.searchParams.set("$limit", String(limit));

  const response = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`CFTC API ${response.status}`);
  const rows = await response.json() as RawRow[];
  const transform = asset.reportType === "Disaggregated" ? transformDisaggregated : transformTff;
  return rows.map(transform).filter((snapshot) => snapshot.date);
}

export const cftcSource = "https://publicreporting.cftc.gov";
