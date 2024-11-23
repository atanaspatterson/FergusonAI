const mongoose = require('mongoose');

const participantIDSchema = new mongoose.Schema({
    type: String,  // 'current' for active test ID
    currentId: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ParticipantID', participantIDSchema);