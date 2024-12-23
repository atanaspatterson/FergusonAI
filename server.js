const express = require("express")
const path = require("path")
const bodyParser = require("body-parser")
require('dotenv').config();
console.log(`Loaded MONGO_URI: ${process.env.MONGO_URI}`);  
const Interaction = require('./models/Interaction');
const EventLog = require('./models/EventLog');
const ParticipantID = require('./models/ParticipantID')
const { OpenAI } = require('openai'); 
const axios = require('axios');

newPrompt = `You are an increbly good soccer statistics formatter. You will be given the names of two soccer players, one of two types of chart (bar or line chart), a date range and at one or two of the following parameters: goals and assists. Ignore EVERY previous interaction - treat every prompt as a COMPLETELY FRESH START. Your task is to find the requested information  and format it in numerical values so I can chart them in a chart - you are to return NO OTHER TEXT. The user prompt will include a number that matches with one of the below formats. You must match the format EXCACTLY. In addition to returning numerical values as formatted below, you will return a title for the chart and a one-sentence conclusion outlining the information + any interesting tidbits gathered from the data. After this paragraph are the formats you must return for each type of chart - I have included 6 different formats depending on the user input (dependent on the type of chart and wether goals, assists, or both are included in the prompt). For the 3 line chart formats, ALWAYS include the date as formatted below, NO EXCEPTIONS. Replace every single mention of "informative chart title" and "conclusion" in the formats with a title for the chart and a 4 or 5 entence conclusion outlining the information, a short explanation of the reason behind the stats for player (you should include position, team, maybe injuries or any other info), & any interesting tidbits gathered from the data. The title should ALWAYS be followed by &&, the conclusion should ALWAYS be preceded by && and that they should both be unlabeled - in other words, do NOT start with "Introduction: " or anything similar, do NOT start with "Conclusion: " or anything similar, get straight to the introduction and conclusion. Once again, You MUST have two times this pattern: &&, the first time right after the chart title and the second time right before the conclusion. I have included the && pattern in the spots where I want you to put them - do NOT duplicate this pattern in your output, just write down &&. For the line chart, I want you to continuously increment the number of goals and/or assists; for example, if P1 scored 4 goals in period 1 and then scored 3 goals between period 1 and 2, then put 4 + 3 = 7 goals in period 2 (obviously, same for assists).For line graphs, split the time period between the start and end date to ONLY 5 DATES, starting from 0 goals and 0 assists in the 0th date. The formats are:

2. Bar chart with only Goals:
informative chart title&&
Player1Name%Player1Goals
Player2Name%Player2Goals
&&conclusion

3. Bar chart with only Assists:
informative chart title&&
Player1Name%Player1Assists
Player2Name%Player2Assists
&&conclusion

Take as much time as possible to ensure the statistics are fully correct and verified, and take a deep breath to select the appropiate format from the 6 templates above and format the response EXACTLY as I tell you`;


// express app
const app = express();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// TODO: serve static files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// 3. Middleware to parse JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});


// TODO: create route to serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.post('/submit_form', async (req, res) => {
  console.log(req.body); 


// 1. Receive user input from client script.


  const { history = [], input: userInput, id: participantID, botType: type } = req.body; // Default history
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }
  
  // ternary operator to check if first user input (i.e., if history exists)
  console.log("Type of bot: ", type)
  if (type === "baseline") {
    systemPrompt = "You are a very helpful assistant. Help at the best of your abilities!"
  } else {
    systemPrompt = newPrompt;
  }
  const messages = history.length === 0 ? [{ role: 'system', content: systemPrompt }, {
  role: 'user', content: userInput }]  : [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userInput }];
  
  // const bingResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
  //   params: { q: userInput }, // Use the user's input as the search query
  //   headers: {
  //   'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
  //   }
  // });

  // const searchResults = bingResponse.data.webPages.value.slice(0, 3).map(result => ({
  //   title: result.name,
  //   url: result.url,
  //   snippet: result.snippet
  // }));



    try {
    // Call OpenAI API to generate a response based on user input
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Specify the OpenAI model
        messages: messages, // Send user input
        max_tokens: 500, // Limit the length of the generated response
      });
    // Extract and trim the chatbot's response
    const botResponse = response.choices[0].message.content.trim();
    // Log the interaction to MongoDB
    const interaction = new Interaction({
      userInput: userInput,
      botResponse: botResponse,
      participantID: participantID,
      botType: type
    });

    await interaction.save(); // Save the interaction to MongoDB
    // Send the chatbot's response back to the client
    // res.json({ botResponse, searchResults });
    res.json({ botResponse });
      
    } catch (error) {
      console.error('Error interacting with OpenAI API:', error.message); // Log error
      res.status(500).send('Server Error');
    }
    // old stuff
});

app.post('/log-event', async (req, res) => {
  const { eventType, elementName, timestamp, participantID, botType } = req.body;
  // Check for participantID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }
  try {
    // Save the event to MongoDB
    // Add participantID
    const event = new EventLog({ eventType, elementName, timestamp, participantID, botType });
    await event.save();
    res.status(200).send('Event logged successfully');
  } catch (error) {
    console.error('Error logging event:', error.message);
    res.status(500).send('Server Error');
  }
});
        
// Define a POST route for retrieving chat history by participantID
// POST route to fetch conversation history by participantID
app.post('/history', async (req, res) => {
  const { participantID } = req.body; // Get participant ID
  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }
  try {
    // Fetch all interactions from the database for the given participantID
    const interactions = await Interaction.find({ participantID }).sort({
    timestamp: 1 });
    // Send the conversation history back to the client
    res.json({ interactions });
  } catch (error) {
    console.error('Error fetching conversation history:', error.message);
    res.status(500).send('Server Error');
  }
});

app.post('/redirect-to-survey', (req, res) => {
  console.log('Received redirect request with body:', req.body);
  
  const { participantID, basicSurveyURL } = req.body;

  if (!participantID) {
    console.error('No participantID provided');
    return res.status(400).send('participantID is required');
  }
  
  console.log(basicSurveyURL + "uehf")
  const surveyUrl = `${basicSurveyURL}?participantID=${encodeURIComponent(participantID)}`;
  
  console.log('Generated survey URL:', surveyUrl);
  res.send(surveyUrl);
});

app.get('/api/current-id', async (req, res) => {
    try {
        const idDoc = await ParticipantID.findOne({ type: 'current' });
        
        if (!idDoc) {
            // Initialize with test_1 if no document exists
            const newIdDoc = await ParticipantID.create({
                type: 'current',
                currentId: 'test_1'
            });
            res.json({ currentId: newIdDoc.currentId });
        } else {
            res.json({ currentId: idDoc.currentId });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Error fetching ID' });
    }
});

app.post('/api/update-id', async (req, res) => {
    try {
        const { usedId } = req.body;
        
        // Check if it's a test ID
        if (!usedId.startsWith('test_')) {
            return res.status(200).send('Non-test ID used');
        }

        // Get current test ID
        const currentDoc = await ParticipantID.findOne({ type: 'current' });
        
        // If it matches current test ID, update to next number
        if (currentDoc && currentDoc.currentId === usedId) {
            const currentNum = parseInt(usedId.split('_')[1]);
            const newId = `test_${currentNum + 1}`;
            
            currentDoc.currentId = newId;
            await currentDoc.save();
        }

        res.status(200).send('ID processed');
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Error updating ID' });
    }
});

// 7. Start the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

  