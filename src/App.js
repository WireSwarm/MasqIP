import './App.css';
import VlsmCalculator from './components/VlsmCalculator';
import RouteSummarizer from './components/RouteSummarizer';
import IpInspector from './components/IpInspector';

// Design agent: Hosts the three primary IPv4 tools inside a Material-inspired glassmorphism layout.
function App() {
  return (
    <div className="app-surface">
      <header className="app-header">
        {/* Design agent: Introduced the hero branding stack pairing the logo with typographic hierarchy. */}
        <div className="brand-identity">
          {/* Design agent: Presents the logo in its pure form to spotlight the simplified network mark. */}
          <img
            className="brand-logo"
            src={`${process.env.PUBLIC_URL}/logo.svg`}
            alt="MasqIP tree network logo"
          />
          <div className="brand-text">
            <h1 className="brand-title">MasqIP Studio</h1>
            <p className="brand-subtitle">
              Modern IPv4 planning, summarization, and insight toolkit.
            </p>
          </div>
        </div>
      </header>

      <main className="tool-grid">
        <section className="tool-card">
          <div className="card-header">
            <h2>Hierarchical IPv4 Plan</h2>
            <p>
              Configure a base network, then describe usable host counts for each subnet.
            </p>
          </div>
          <VlsmCalculator />
        </section>

        <section className="tool-card">
          <div className="card-header">
            <h2>Route Summarizer</h2>
            <p>
              Aggregate multiple networks into the tightest covering prefix as you type.
            </p>
          </div>
          <RouteSummarizer />
        </section>

        <section className="tool-card">
          <div className="card-header">
            <h2>IPv4 Insight Panel</h2>
            <p>
              Inspect a specific address to visualise position, availability, and classifications.
            </p>
          </div>
          <IpInspector />
        </section>
      </main>
    </div>
  );
}

export default App;
