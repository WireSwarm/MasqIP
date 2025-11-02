// Design agent: Provides a summary panel for multiple IPv4 network insights.
// Developer agent: Aggregates and displays overall statistics for entered networks.
import React, { useMemo } from 'react';
import { doNetworksOverlap, getTotalAddressCount } from '../utils/ipMath';
import './Ipv4InsightSummary.css';

function Ipv4InsightSummary({ analyses }) {
    // Developer agent: Filter out invalid or empty analyses to only process valid networks.
    const validAnalyses = useMemo(() => {
      return analyses.filter(analysis => analysis.parsed);
    }, [analyses]);
  
    // Developer agent: Calculate total number of overlapping networks.
    // Design agent: Provides a count of network pairs that share address space.
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
  
    // Developer agent: Calculate total unique hosts across all networks, considering overlaps.
    // Design agent: Shows the true count of distinct hosts after accounting for shared ranges.
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
          if (coverageCount > 0) {
            totalUnique += segmentLength;
          } 
          if (coverageCount >= 2) {
            totalOverlapping += segmentLength;
          }
        }
  
        if (event.type === 'start') {
          coverageCount += 1;
        } else {
          coverageCount -= 1;
        }
        lastIp = event.ip;
      }
      return { totalOverlappingHosts: totalOverlapping, totalUniqueHostsAcrossNetworks: totalUnique };
    }, [validAnalyses]);
  
    // Developer agent: Calculate the total size of all networks in terms of hosts.
    // Design agent: Displays the sum of all individual network host counts.
    const totalSizeOfAllNetworks = useMemo(() => {
      return validAnalyses.reduce((sum, analysis) => sum + getTotalAddressCount(analysis.parsed.prefix), 0);
    }, [validAnalyses]);
  
    // Developer agent: Calculate unmentioned networks and hosts between valid networks.
    // Design agent: Identifies and quantifies address space gaps between defined networks.
    const { unmentionedNetworksCount, unmentionedHostsCount } = useMemo(() => {
      const sortedNetworks = [...validAnalyses].sort((a, b) => a.parsed.network - b.parsed.network);
      let unmentionedNets = 0;
      let unmentionedHosts = 0;
  
      for (let i = 0; i < sortedNetworks.length - 1; i += 1) {
        const currentNetwork = sortedNetworks[i].parsed;
        const nextNetwork = sortedNetworks[i + 1].parsed;
  
        // Check for a gap between the current network\'s broadcast and the next network\'s network address
        if (nextNetwork.network > currentNetwork.broadcast + 1) {
          const gapStart = currentNetwork.broadcast + 1;
          const gapEnd = nextNetwork.network - 1;
          const gapSize = gapEnd - gapStart + 1;
          unmentionedHosts += gapSize;
          unmentionedNets += gapSize; // Assuming each host in the gap is an \'unmentioned network\' (/32)
        }
      }
          return { unmentionedNetworksCount: unmentionedNets, unmentionedHostsCount: unmentionedHosts };
        }, [validAnalyses]);
      
        if (validAnalyses.length < 2) {
          return null; // Only show summary when there are at least two valid networks
        }
      
          return (
            <div className="ipv4-insight-summary" id="ipv4-insight-summary">
              <h3 className="summary-title" id="ipv4-insight-summary-title">Overall Network Insights</h3>
              <div className="summary-sections" id="ipv4-insight-summary-sections">
                <div className="summary-section" id="summary-section-total">
                  <h4 className="section-title" id="section-title-total">Total</h4>
                  <p id="total-networks-size">Total size of all networks (addresses): <strong>{totalSizeOfAllNetworks.toLocaleString()}</strong></p>
                  <p id="total-unique-hosts-across-networks">Total Unique Hosts Across Networks: <strong>{totalUniqueHostsAcrossNetworks.toLocaleString()}</strong></p>
                </div>
                <div className="summary-section" id="summary-section-overlap">
                  <h4 className="section-title" id="section-title-overlap">Overlap</h4>
                  <p id="total-networks-overlap">Total overlapping networks: <strong>{totalOverlappingNetworks.toLocaleString()}</strong></p>
                  <p id="total-hosts-overlap">Total overlapping hosts: <strong>{totalOverlappingHosts.toLocaleString()}</strong></p>
                </div>
                <div className="summary-section" id="summary-section-separated">
                  <h4 className="section-title" id="section-title-separated">Separated</h4>
                  <p id="unmentioned-networks-count">Unmentioned networks count: <strong>{unmentionedNetworksCount.toLocaleString()}</strong></p>
                  <p id="unmentioned-hosts-count">Unmentioned hosts count: <strong>{unmentionedHostsCount.toLocaleString()}</strong></p>
                </div>
              </div>
            </div>
          );      }
      
      export default Ipv4InsightSummary;
