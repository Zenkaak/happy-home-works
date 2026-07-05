module.exports = (req, res) => {
  res.json({ ok: true, node: process.version });
};
