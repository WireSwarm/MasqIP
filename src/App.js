// Design agent: Loads the shared Material palette and core layouts for the MasqIP suite.
// Developer agent: Ensures thematic variables are available before component styling executes.
import './styles/materialTheme.css';
import './App.css';
import VlsmCalculator from './components/VlsmCalculator';
import IpInspector from './components/IpInspector';

// Design agent: Hosts the primary IPv4 tools inside a Material-inspired glassmorphism layout.
function App() {
  // Design agent: Defensive component wrapper to avoid runtime crashes if a component import fails.
  const SafeMount = ({ component: Comp, name }) => {
    const isRenderable = typeof Comp === 'function';
    return isRenderable ? (
      <Comp />
    ) : (
      <div className="error-text" id={`component-missing-${name}`}>
        Component "{name}" failed to load. Please reload.
      </div>
    );
  };
  return (
    <div className="app-surface" id="app-surface">
      <header className="app-header" id="app-header">
        {/* Design agent: Introduced the hero branding stack pairing the logo with typographic hierarchy. */}
        <div className="brand-identity" id="brand-identity">
          {/* Design agent: Presents the logo in its pure form to spotlight the simplified network mark. */}
          <img
            className="brand-logo"
            id="brand-logo"
            src={`${process.env.PUBLIC_URL}/logo.svg`}
            alt="MasqIP tree network logo"
          />
          <div className="brand-text" id="brand-text">
            <h1 className="brand-title" id="brand-title">MasqIP Studio</h1>
            <p className="brand-subtitle" id="brand-subtitle">
              Modern IPv4 planning, summarization, and insight toolkit.
            </p>
          </div>
        </div>
      </header>

      <main className="tool-grid" id="tool-grid">
        <section className="tool-card" id="tool-card-plan">
          <div className="card-header" id="card-header-plan">
            <h2 id="card-title-plan">Hierarchical IPv4 Plan</h2>
            <p id="card-desc-plan">
              Configure a base network, then describe usable host counts for each subnet.
            </p>
          </div>
          <SafeMount component={VlsmCalculator} name="VlsmCalculator" />
        </section>

        <section className="tool-card" id="tool-card-inspector">
          <div className="card-header" id="card-header-inspector">
            <h2 id="card-title-inspector">IPv4 Insight Panel</h2>
            <p id="card-desc-inspector">
              Inspect a specific address to visualise position, availability, and classifications.
            </p>
          </div>
          <SafeMount component={IpInspector} name="IpInspector" />
        </section>
      </main>
    </div>
  );
}

export default App;
