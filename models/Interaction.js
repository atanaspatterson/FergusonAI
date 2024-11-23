const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const InteractionSchema = new Schema({
    participantID: String,
    userInput: String, // Store the user's message
    botResponse: String, // Store the bot's response
    botType: String, // Store the type of bot (baseline or new)
    timestamp: { type: Date, default: Date.now } // Log the time of interaction
});
module.exports = mongoose.model('Interaction', InteractionSchema);
