const express = require('express');
const router = express.Router();
const FavoriteController = require('../controllers/favoriteController');

// Favorite routes
router.post('/:userId/add/:venueId', FavoriteController.addFavorite);
router.delete('/:userId/remove/:venueId', FavoriteController.removeFavorite);
router.get('/:userId', FavoriteController.getFavorites);
router.post('/:userId/toggle/:venueId', FavoriteController.toggleFavorite);

module.exports = router;
