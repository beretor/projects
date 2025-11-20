const trainingPlan = [
    {
        week: 1,
        focus: "Semaine 5 km - Fun & Technique",
        days: [
            { day: "Mon", date: "17/11", type: "Rest", title: "-", details: "" },
            { day: "Tue", date: "18/11", type: "Rest", title: "-", details: "" },
            { day: "Wed", date: "19/11", type: "Rest", title: "-", details: "" },
            { day: "Thu", date: "20/11", type: "Speed", title: "Technique & Strides", details: "15’ Easy Jog + 4x Strides (Run tall and relaxed)." },
            { day: "Fri", date: "21/11", type: "Rest", title: "Rest", details: "Rest or play other sports." },
            { day: "Sat", date: "22/11", type: "Easy", title: "Shakeout", details: "15’ Easy run + Stretching." },
            { day: "Sun", date: "23/11", type: "Race", title: "5 km Race", details: "Run by feel. Start steady, finish with a smile!" }
        ]
    },
    {
        week: 2,
        focus: "Training Week - Speed Games",
        days: [
            { day: "Mon", date: "24/11", type: "Easy", title: "Easy Run", details: "30’ Jog. Chatty pace." },
            { day: "Tue", date: "25/11", type: "Speed", title: "Speed Games", details: "8x Short Hill Sprints (30s) OR 200m Relays. Walk back recovery." },
            { day: "Wed", date: "26/11", type: "Rest", title: "Rest", details: "Rest day." },
            { day: "Thu", date: "27/11", type: "Tempo", title: "Steady Running", details: "3x 4’ Steady pace (not hard). 2’ Walk/Jog rest." },
            { day: "Fri", date: "28/11", type: "Rest", title: "Rest", details: "Rest." },
            { day: "Sat", date: "29/11", type: "Rest", title: "Active Fun", details: "Bike ride, swim, or hike." },
            { day: "Sun", date: "30/11", type: "Long", title: "Long Run", details: "8 km Run/Walk. Take breaks if needed." }
        ]
    },
    {
        week: 3,
        focus: "Race Week - 10km Challenge",
        days: [
            { day: "Mon", date: "01/12", type: "Easy", title: "Easy Run", details: "25’ Easy Jog." },
            { day: "Tue", date: "02/12", type: "Speed", title: "Fast Feet", details: "5x 100m Fast (not sprint). Focus on turnover." },
            { day: "Wed", date: "03/12", type: "Rest", title: "Rest", details: "Rest." },
            { day: "Thu", date: "04/12", type: "Easy", title: "Short Run", details: "20’ Easy + 2 Strides." },
            { day: "Fri", date: "05/12", type: "Rest", title: "Rest", details: "Rest & Hydrate." },
            { day: "Sat", date: "06/12", type: "Easy", title: "Shakeout", details: "10’ Jog + Stretching." },
            { day: "Sun", date: "07/12", type: "Race", title: "10 km Challenge", details: "Goal: Finish Strong. Pacing: 45-50 mins (approx)." }
        ]
    }
];

let currentWeek = 0;

const weekLabel = document.getElementById('currentWeekLabel');
const weekSummary = document.getElementById('weekSummary');
const scheduleGrid = document.getElementById('scheduleGrid');
const prevBtn = document.getElementById('prevWeek');
const nextBtn = document.getElementById('nextWeek');

function renderWeek(weekIndex) {
    const weekData = trainingPlan[weekIndex];

    // Update Header
    weekLabel.textContent = `Week ${weekData.week}`;
    weekSummary.innerHTML = `<h3>${weekData.focus}</h3>`;

    // Clear Grid
    scheduleGrid.innerHTML = '';

    // Render Days
    weekData.days.forEach(day => {
        const card = document.createElement('div');
        const isRest = day.type === 'Rest';
        const isPast = day.title === '-';

        card.className = `day-card ${isRest ? 'rest' : ''}`;

        // Icon logic
        let iconSvg = '';
        if (day.type === 'Race') {
            iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>';
        } else if (isRest) {
            iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 20V4"/></svg>'; // Bar chart/rest icon placeholder
        } else {
            iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>'; // Run icon
        }

        if (isPast) {
            card.innerHTML = `
                <div class="card-header">
                    <div class="activity-icon rest-icon">${iconSvg}</div>
                    <div class="header-text">
                        <div class="activity-meta">${day.date} • ${day.day}</div>
                        <div class="activity-title" style="color: var(--text-sub);">Rest / Past</div>
                    </div>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="card-header">
                    <div class="activity-icon ${isRest ? 'rest-icon' : ''}">${iconSvg}</div>
                    <div class="header-text">
                        <div class="activity-meta">${day.date} • ${day.day}</div>
                        <div class="activity-title">${day.title}</div>
                    </div>
                </div>
                <div class="card-body">
                    <div class="workout-description">${day.details}</div>
                    ${!isRest ? `
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-label">Type</span>
                            <span class="stat-value">${day.type}</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-label">Focus</span>
                            <span class="stat-value">Fun/Tech</span>
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;
        }

        scheduleGrid.appendChild(card);
    });

    // Update Buttons
    prevBtn.disabled = weekIndex === 0;
    nextBtn.disabled = weekIndex === trainingPlan.length - 1;

    prevBtn.style.opacity = weekIndex === 0 ? '0.5' : '1';
    nextBtn.style.opacity = weekIndex === trainingPlan.length - 1 ? '0.5' : '1';
}

prevBtn.addEventListener('click', () => {
    if (currentWeek > 0) {
        currentWeek--;
        renderWeek(currentWeek);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentWeek < trainingPlan.length - 1) {
        currentWeek++;
        renderWeek(currentWeek);
    }
});

// Initial Render
renderWeek(currentWeek);
