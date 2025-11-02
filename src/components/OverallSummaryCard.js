// Design agent: Consolidates overall network summary into a single, modern result card.
// Developer agent: Combines logic from Ipv4InsightSummary and RouteSummarizer for a unified display.
import React, { useMemo } from 'react';
import { doNetworksOverlap, getTotalAddressCount, commonPrefixLength, intToIpv4 } from '../utils/ipMath';
import './OverallSummaryCard.css';

function OverallSummaryCard({ analyses }) {
  // Developer agent: Filter out invalid or empty analyses to only process valid networks.
  const validAnalyses = useMemo(() => {
    return analyses.filter(analysis => analysis.parsed);
  }, [analyses]);

  // --- Calculations from Ipv4InsightSummary ---
  const totalOverlappingNetworks = useMemo(() => {
    let count = 0;
    for (let i = 0; i < validAnalyses.length; i += 1) {
      for (let j = i + 1; j < validAnalyses.length; j += 1) {
        if (doNetworksOverlap(validAnalyses[i].parsed, validAnalyses[j].parsed)) {
          count += 1;
        }
      }
    }
    return count;
  }, [validAnalyses]);

  const { totalOverlappingHosts, totalUniqueHostsAcrossNetworks } = useMemo(() => {
    const events = [];
    validAnalyses.forEach(analysis => {
      events.push({ type: 'start', ip: analysis.parsed.network });
      events.push({ type: 'end', ip: analysis.parsed.broadcast + 1 });
    });
    events.sort((a, b) => a.ip - b.ip);
    let coverageCount = 0;
    let totalOverlapping = 0;
    let totalUnique = 0;
    let lastIp = null;
    for (const event of events) {
      if (lastIp !== null && event.ip > lastIp) {
        const segmentLength = event.ip - lastIp;
        if (coverageCount > 0) totalUnique += segmentLength;
        if (coverageCount >= 2) totalOverlapping += segmentLength;
      }
      coverageCount += event.type === 'start' ? 1 : -1;
      lastIp = event.ip;
    }
    return { totalOverlappingHosts: totalOverlapping, totalUniqueHostsAcrossNetworks: totalUnique };
  }, [validAnalyses]);

  const totalSizeOfAllNetworks = useMemo(() => {
    return validAnalyses.reduce((sum, analysis) => sum + getTotalAddressCount(analysis.parsed.prefix), 0);
  }, [validAnalyses]);

  const { unmentionedNetworksCount, unmentionedHostsCount } = useMemo(() => {
    const sortedNetworks = [...validAnalyses].sort((a, b) => a.parsed.network - b.parsed.network);
    let unmentionedNets = 0;
    let unmentionedHosts = 0;
    for (let i = 0; i < sortedNetworks.length - 1; i += 1) {
      const currentNetwork = sortedNetworks[i].parsed;
      const nextNetwork = sortedNetworks[i + 1].parsed;
      if (nextNetwork.network > currentNetwork.broadcast + 1) {
        const gapStart = currentNetwork.broadcast + 1;
        const gapEnd = nextNetwork.network - 1;
        const gapSize = gapEnd - gapStart + 1;
        unmentionedHosts += gapSize;
        unmentionedNets += gapSize;
      }
    }
    return { unmentionedNetworksCount: unmentionedNets, unmentionedHostsCount: unmentionedHosts };
  }, [validAnalyses]);

  // --- Calculation from RouteSummarizer (integrated into IpInspector) ---
  const routeSummary = useMemo(() => {
    if (validAnalyses.length < 2) return { available: false };
    let minIp = Infinity;
    let maxIp = -Infinity;
    for (const analysis of validAnalyses) {
      minIp = Math.min(minIp, analysis.parsed.network);
      maxIp = Math.max(maxIp, analysis.parsed.broadcast);
    }
    if (minIp === Infinity) return { available: false };
    const prefix = commonPrefixLength(minIp, maxIp);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const summaryNetwork = minIp & mask;
    return {
      available: true,
      summary: `${intToIpv4(summaryNetwork >>> 0)}/${prefix}`,
    };
  }, [validAnalyses]);

  if (validAnalyses.length < 2) {
    return null;
  }

  return (
    <div className="result-card overall-summary-card" id="overall-summary-card">
      <div className="insight-card-header" id="overall-summary-header">
        <div className="insight-card-header-text" id="overall-summary-header-text">
          <span className="insight-card-label" id="overall-summary-label">
            Overall Summary
          </span>
          <span className="insight-card-summary" id="overall-summary-sublabel">
            Aggregate insights for all valid networks
          </span>
        </div>
      </div>
      <div className="insight-card-body" id="overall-summary-body">
        <div className="summary-section" id="summary-section-route">
          <h4 className="section-title" id="section-title-route">Route Summary</h4>
          <p id="route-summary-value">
            {routeSummary.available ? <strong>{routeSummary.summary}</strong> : 'Not Available'}
          </p>
        </div>
        <div className="summary-section" id="summary-section-total">
          <h4 className="section-title" id="section-title-total">Total</h4>
          <p id="total-networks-size">Size (addresses): <strong>{totalSizeOfAllNetworks.toLocaleString()}</strong></p>
          <p id="total-unique-hosts-across-networks">Unique Hosts: <strong>{totalUniqueHostsAcrossNetworks.toLocaleString()}</strong></p>
        </div>
        <div className="summary-section" id="summary-section-overlap">
          <h4 className="section-title" id="section-title-overlap">Overlap</h4>
          <p id="total-networks-overlap">Overlapping Networks: <strong>{totalOverlappingNetworks.toLocaleString()}</strong></p>
          <p id="total-hosts-overlap">Overlapping Hosts: <strong>{totalOverlappingHosts.toLocaleString()}</strong></p>
        </div>
        <div className="summary-section" id="summary-section-separated">
          <h4 className="section-title" id="section-title-separated">Separated</h4>
          <p id="unmentioned-networks-count">Unmentioned Networks: <strong>{unmentionedNetworksCount.toLocaleString()}</strong></p>
          <p id="unmentioned-hosts-count">Unmentioned Hosts: <strong>{unmentionedHostsCount.toLocaleString()}</strong></p>
        </div>
      </div>
    </div>
  );
}

export default OverallSummaryCard;
