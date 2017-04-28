import express from 'express';

const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.json({ status: 'up' });
})
.get('/weightData', (req, res) => {
  res.json([
    { timestamp: 10.00, weight: 1.4 },
    { timestamp: 40.00, weight: 2.7 },
    { timestamp: 60.00, weight: 3.4 }],
  );
});

app.listen(port, () => console.log(`server running on ${port}`));
