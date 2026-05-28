const express = require('express');
const router = express.Router();
const { Restaurant, MenuItem } = require('../models/index');

// GET /api/restaurants — all restaurants (no menu items, lighter response)
router.get('/', async (req, res) => {
  try {
    const restaurants = await Restaurant.findAll({
      order: [['rating', 'DESC']],
    });
    res.json({ success: true, count: restaurants.length, data: restaurants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/restaurants/:id — one restaurant WITH menu items
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByPk(req.params.id, {
      include: [{ model: MenuItem, as: 'menuItems', order: [['category', 'ASC']] }],
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    res.json({ success: true, data: restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/restaurants/:id/menu — just the menu
router.get('/:id/menu', async (req, res) => {
  try {
    const restaurant = await Restaurant.findByPk(req.params.id, {
      attributes: ['id', 'name'],
      include: [{ model: MenuItem, as: 'menuItems', order: [['category', 'ASC']] }],
    });
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    res.json({
      success: true,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      menu: restaurant.menuItems,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/restaurants/:id/image — save Cloudinary URL after frontend upload
router.patch('/:id/image', async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: 'imageUrl is required' });
    }
    const restaurant = await Restaurant.findByPk(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    await restaurant.update({ imageUrl });
    res.json({ success: true, message: 'Image updated', data: { id: restaurant.id, imageUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
