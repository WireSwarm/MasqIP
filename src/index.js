import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const DEFAULT_ROOT_ID = 'root';
const EXPRESS_BRIDGE_KEY = '__masqipExpressBridge__';
let activeRoot = null;
let activeHostNode = null;

// Design agent: Resolves or creates the DOM node used to host the React tree so Express routes can decide where to mount it.
// Developer agent: Accepts either an element reference or an element id and ensures the resulting node always has an id for deterministic targeting.
const ensureHostNode = (targetRef = DEFAULT_ROOT_ID) => {
  if (typeof HTMLElement !== 'undefined' && targetRef instanceof HTMLElement) {
    if (!targetRef.id) {
      targetRef.id = DEFAULT_ROOT_ID;
    }
    return targetRef;
  }

  if (typeof targetRef === 'string') {
    const existingNode = document.getElementById(targetRef);
    if (existingNode) {
      if (!existingNode.id) {
        existingNode.id = targetRef;
      }
      return existingNode;
    }

    const createdNode = document.createElement('div');
    createdNode.id = targetRef || DEFAULT_ROOT_ID;
    createdNode.setAttribute('data-created-by', 'masqip-runtime');
    document.body.appendChild(createdNode);
    return createdNode;
  }

  return ensureHostNode(DEFAULT_ROOT_ID);
};

// Design agent: Centralises the render call so we can reuse it for auto-boot and manual Express-driven mounting flows.
// Developer agent: Tears down any previous root bound to a different DOM node to avoid memory leaks between remounts.
const renderApp = ({ hostNode, strictMode }) => {
  if (!hostNode) {
    throw new Error('MasqIP cannot render without a host node.');
  }

  if (activeRoot && activeHostNode && activeHostNode !== hostNode) {
    activeRoot.unmount();
    activeRoot = null;
    activeHostNode = null;
  }

  if (!activeRoot) {
    activeRoot = ReactDOM.createRoot(hostNode);
  }

  if (strictMode) {
    activeRoot.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    activeRoot.render(<App />);
  }

  activeHostNode = hostNode;
  return activeRoot;
};

// Design agent: Provides a declarative API the Express router can call once it injects our bundle into its view hierarchy.
// Developer agent: Exposes options for choosing the host node and toggling StrictMode to match production expectations.
const mountMasqipApp = (options = {}) => {
  const { target = DEFAULT_ROOT_ID, strictMode = true } = options;
  const hostNode = ensureHostNode(target);
  hostNode.setAttribute('data-masqip-mounted', 'true');
  renderApp({ hostNode, strictMode });
  return { hostNode };
};

// Design agent: Complements the mount helper so Express-powered hosts can dispose of the UI cleanly.
// Developer agent: Resets the cached root reference to free memory and signal that a fresh mount is required next time.
const unmountMasqipApp = () => {
  if (activeRoot) {
    activeRoot.unmount();
    activeRoot = null;
    activeHostNode = null;
  }

  const defaultHost = document.getElementById(DEFAULT_ROOT_ID);
  if (defaultHost) {
    defaultHost.removeAttribute('data-masqip-mounted');
  }
};

// Design agent: Detects whether the traditional CRA auto-boot experience should run, keeping local development unchanged.
// Developer agent: Reads the host node dataset so Express can disable auto-mounting by setting data-masqip-autostart="false" server-side.
const shouldAutoMount = () => {
  const hostNode = document.getElementById(DEFAULT_ROOT_ID);
  if (!hostNode) {
    return false;
  }

  const autoStartFlag = hostNode.getAttribute('data-masqip-autostart');
  if (autoStartFlag === 'false') {
    return false;
  }

  if (autoStartFlag === 'true') {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
};

if (shouldAutoMount()) {
  mountMasqipApp();
}

if (typeof window !== 'undefined') {
  window[EXPRESS_BRIDGE_KEY] = {
    mount: mountMasqipApp,
    unmount: unmountMasqipApp,
  };
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
