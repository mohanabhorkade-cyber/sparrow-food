const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const distFolder = path.join(__dirname, 'dist', 'sparrow-foods', 'browser');
const port = process.env.PORT || 4000;

app.use(compression({
  level: 6,
  threshold: 0,
  brotli: {
    enabled: true,
    zlib: {
      level: 6
    }
  }
}));

app.use(express.static(distFolder, {
  maxAge: '7d',
  immutable: true
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(distFolder, 'index.html'));
});

app.listen(port, () => {
  console.log(`Serving Sparrow Foods review build at http://localhost:${port}`);
});
