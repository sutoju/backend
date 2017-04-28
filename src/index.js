import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({ status: 'up' });
});

app.listen(port, () => console.log(`server running on ${port}`));
