// routes/templates.js — §4.2 Templates.
const express = require('express');
const db = require('../db');

const router = express.Router();

// Publik (galeri template) maupun admin — read list.
router.get('/templates', (req, res) => {
  const rows = db.prepare('SELECT id, name, description, category, active FROM templates WHERE active = 1 ORDER BY id').all();
  res.json(rows.map(t => ({
    id: t.id, name: t.name, description: t.description, category: t.category,
    active: !!t.active, thumbnail: `/templates/${t.id}/thumbnail.svg`
  })));
});

module.exports = router;
