// lib/marketScanConnectors/types.ts
// Interface every live scan connector must implement.

import type { NormalizedMarketSignal } from '../marketSignalTypes';

export interface ConnectorFetchResult {
  signals:        NormalizedMarketSignal[];
  sources_checked: number;  // number of HTTP requests / queries made
  raw_found:       number;  // results before filtering/normalization
  errors:          string[];
}

export interface MarketScanConnector {
  readonly name:        string;
  readonly source_type: string;
  readonly enabled:     boolean;
  fetchSignals(): Promise<ConnectorFetchResult>;
}
