const path = require('path');
const fs = require('fs');
const express = require('express');

const BUILD_SUBDIR = 'build';
const PUBLIC_INDEX = 'index.html';
const HEALTH_ENDPOINT = '/healthz';

const fileExists = (target) => {
  try {
    fs.accessSync(target, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const createSpaHost = (options = {}) => {
  const {
    rootDir = path.resolve(__dirname, '..'),
    buildSubdir = BUILD_SUBDIR,
    indexFile = PUBLIC_INDEX,
    immutableCacheSeconds = 60 * 60 * 24 * 365, // 1 year
  } = options;

  const resolvedRoot = path.resolve(rootDir);
  const buildDir = path.resolve(resolvedRoot, buildSubdir);
  const indexHtmlPath = path.resolve(buildDir, indexFile);
  const router = express.Router();

  const sendMissingBuild = (res) => {
    res
      .status(503)
      .send(
        `MasqIP n'a pas trouve de build a servir (${indexHtmlPath}). Lance 'npm run build' dans ${resolvedRoot}.`
      );
  };

  if (!fileExists(indexHtmlPath)) {
    console.warn(
      `[MasqIP] Aucun bundle trouve pour ${resolvedRoot}. Le routeur retournera 503 tant que 'npm run build' n'aura pas ete execute.`
    );
  }

  router.get(HEALTH_ENDPOINT, (req, res) => {
    res.json({
      siteRoot: resolvedRoot,
      buildAvailable: fileExists(indexHtmlPath),
      buildDir,
      indexHtml: indexHtmlPath,
    });
  });

  router.use(
    express.static(buildDir, {
      index: false,
      fallthrough: true,
      setHeaders: (res, filePath) => {
        const filename = path.basename(filePath);
        if (filename === 'index.html') {
          res.setHeader('Cache-Control', 'no-store, max-age=0');
        } else {
          res.setHeader('Cache-Control', `public, max-age=${immutableCacheSeconds}`);
        }
      },
    })
  );

  router.use((req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    if (!fileExists(indexHtmlPath)) {
      return sendMissingBuild(res);
    }

    res.sendFile(indexHtmlPath, (err) => {
      if (err) {
        next(err);
      }
    });
  });

  return router;
};

module.exports = {
  createSpaHost,
};
