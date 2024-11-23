// Retrieve and validate participant ID before allowing navigation
document.addEventListener('DOMContentLoaded', function() {
    const participantID = localStorage.getItem('participantID');
    
    if (!participantID) {
        // Redirect back to ID entry if no participant ID is found
        window.location.href = 'index.html';
        return;
    }

    // Add event listeners for survey links
    const surveyButtons = ['demographics-link', 'pre-task-link', 'post-task-link'];
    
    surveyButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        button.addEventListener('click', function(event) {
            event.preventDefault();
            const basicSurveyURL = button.href;
            // Redirect to survey using server endpoint
            fetch('/redirect-to-survey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ participantID: participantID, basicSurveyURL: basicSurveyURL })
            })
            .then(response => response.text())
            .then(surveyUrl => {
                // Redirect to the survey URL
                // logEvent('redirect', 'Qualtrics Survey');
                window.location.href = surveyUrl;
            })
            .catch(error => {
                console.error('Error redirecting to survey:', error);
                alert('There was an error redirecting to the survey. Please try again.');
            });
        });
    });
});