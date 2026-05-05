const STORAGE_KEY = 'user_complaints';
// REPLACE THIS WITH YOUR ACTUAL GEMINI API KEY
const GEMINI_API_KEY = 'AIzaSyAe6-l0ocpsWkWpdTfy3CsTbaaF2CLc0S4';

let isAIQuestionGenerated = false;

// Get complaints from localStorage
const getComplaints = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

// Save a new complaint
const saveComplaint = (complaint) => {
    const complaints = getComplaints();
    complaints.push({
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        ...complaint
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
};

// Call Gemini API to get a follow-up question
const getAIQuestion = async (complaintText) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
        console.warn('Gemini API key is missing. Using mock question.');
        return "Can you specify the exact date and time when this issue first occurred?";
    }

    // Using gemini-3-flash-preview as specified in the latest documentation
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GEMINI_API_KEY}`;

    console.log('Attempting AI generation with model: gemini-3-flash-preview');

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{
                        text: "You are a professional assistant for a complaint registration platform. Your task is to generate exactly ONE specific, helpful follow-up question based on the user's complaint details. The question should help clarify the issue or gather missing essential information. Keep the response concise (just the question)."
                    }]
                },
                contents: [{
                    parts: [{
                        text: `User Complaint: ${complaintText}`
                    }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        }
        
        return "Could you provide any additional context or evidence (like photos or receipts) related to this complaint?";
    } catch (error) {
        console.error('Error fetching from Gemini:', error);
        return "Could you provide any additional context or evidence related to this complaint? (Fallback)";
    }
};

// Handle Form Submission
const handleFormSubmit = async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    const aiSection = document.getElementById('ai-section');
    const aiQuestionText = document.getElementById('ai-question-text');
    const formData = new FormData(e.target);

    const name = formData.get('name');
    const city = formData.get('city');
    const mobile = formData.get('mobile');
    const message = formData.get('message');

    if (!name || !city || !mobile || !message) {
        alert('Please fill in all initial fields');
        return;
    }

    if (!isAIQuestionGenerated) {
        // Step 1: Generate AI Question
        submitBtn.disabled = true;
        submitBtn.innerText = 'Generating AI Question...';
        aiSection.classList.remove('hidden');
        aiQuestionText.classList.add('loading-shimmer');

        const question = await getAIQuestion(message);

        aiQuestionText.innerText = question;
        aiQuestionText.classList.remove('loading-shimmer');
        submitBtn.disabled = false;
        submitBtn.innerText = 'Submit Complaint';
        isAIQuestionGenerated = true;

        // Scroll to AI section
        aiSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        // Step 2: Final Submit
        const aiAnswer = formData.get('ai-answer');
        if (!aiAnswer) {
            alert('Please answer the AI follow-up question.');
            return;
        }

        const complaint = {
            name,
            city,
            mobile,
            message,
            aiQuestion: aiQuestionText.innerText,
            aiAnswer: aiAnswer
        };

        saveComplaint(complaint);
        window.location.href = 'index.html';
    }
};

// Render Complaints on Homepage
const renderComplaints = () => {
    const container = document.getElementById('complaints-container');
    if (!container) return;

    const complaints = getComplaints();

    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No complaints registered yet.</p>
                <a href="add-complaint.html" class="text-primary">Be the first to voice out!</a>
            </div>
        `;
        return;
    }

    container.innerHTML = complaints.reverse().map(c => `
        <div class="card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <h3 class="text-primary">${c.name}</h3>
                <span style="font-size: 0.8rem; color: var(--text-muted)">${c.date}</span>
            </div>
            <p style="margin-bottom: 1rem; color: var(--text-muted)">Location: ${c.city} | Contact: ${c.mobile}</p>
            <p style="margin-bottom: 1.5rem;">${c.message}</p>
            
            ${c.aiQuestion ? `
                <div style="border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 1rem;">
                    <div class="ai-badge">AI FOLLOW-UP</div>
                    <p style="font-style: italic; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Q: ${c.aiQuestion}</p>
                    <p style="font-size: 0.9rem; font-weight: 500;">A: ${c.aiAnswer}</p>
                </div>
            ` : ''}
        </div>
    `).join('');
};

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('complaint-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    renderComplaints();
});
