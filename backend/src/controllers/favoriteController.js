const User = require('../models/User');
const Venue = require('../models/Venue');

class FavoriteController {
    // Add venue to favorites
    static async addFavorite(req, res) {
        try {
            const { userId, venueId } = req.params;

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Check if user is an organizer
            if (user.role !== 'organizer') {
                return res.status(403).json({
                    message: 'Only organizers can add favorites'
                });
            }

            // Check if venue exists
            const venue = await Venue.findById(venueId);
            if (!venue) {
                return res.status(404).json({
                    message: 'Venue not found'
                });
            }

            if (!venue.isActive) {
                return res.status(400).json({
                    message: 'Cannot add inactive venue to favorites'
                });
            }

            // Add to favorites
            await user.addFavorite(venueId);

            res.json({
                message: 'Venue added to favorites successfully',
                favoriteVenues: user.favoriteVenues
            });
        } catch (error) {
            console.error('Error adding favorite:', error);
            res.status(500).json({
                message: 'Error adding venue to favorites',
                error: error.message
            });
        }
    }

    // Remove venue from favorites
    static async removeFavorite(req, res) {
        try {
            const { userId, venueId } = req.params;

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Remove from favorites
            await user.removeFavorite(venueId);

            res.json({
                message: 'Venue removed from favorites successfully',
                favoriteVenues: user.favoriteVenues
            });
        } catch (error) {
            console.error('Error removing favorite:', error);
            res.status(500).json({
                message: 'Error removing venue from favorites',
                error: error.message
            });
        }
    }

    // Get user's favorite venues
    static async getFavorites(req, res) {
        try {
            const { userId } = req.params;

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Get favorite venues with full details
            const favorites = await user.getFavorites();

            res.json({
                message: 'Favorite venues retrieved successfully',
                favorites: favorites,
                count: favorites.length
            });
        } catch (error) {
            console.error('Error getting favorites:', error);
            res.status(500).json({
                message: 'Error retrieving favorite venues',
                error: error.message
            });
        }
    }

    // Toggle favorite status
    static async toggleFavorite(req, res) {
        try {
            const { userId, venueId } = req.params;

            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    message: 'User not found'
                });
            }

            // Check if venue exists
            const venue = await Venue.findById(venueId);
            if (!venue) {
                return res.status(404).json({
                    message: 'Venue not found'
                });
            }

            // Check if already in favorites
            const isFavorite = user.favoriteVenues.some(
                id => id.toString() === venueId.toString()
            );

            if (isFavorite) {
                await user.removeFavorite(venueId);
                res.json({
                    message: 'Venue removed from favorites',
                    isFavorite: false,
                    favoriteVenues: user.favoriteVenues
                });
            } else {
                await user.addFavorite(venueId);
                res.json({
                    message: 'Venue added to favorites',
                    isFavorite: true,
                    favoriteVenues: user.favoriteVenues
                });
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            res.status(500).json({
                message: 'Error toggling favorite status',
                error: error.message
            });
        }
    }
}

module.exports = FavoriteController;
