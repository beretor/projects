const trainingPlan = [
    {
        week: 1,
        focus: "Semaine 5 km (20 → 23 novembre)",
        days: [
            { day: "Mon", date: "17/11", type: "Rest", title: "-", details: "" },
            { day: "Tue", date: "18/11", type: "Rest", title: "-", details: "" },
            { day: "Wed", date: "19/11", type: "Rest", title: "-", details: "" },
            { day: "Thu", date: "20/11", type: "Speed", title: "Activation 5 km", details: "20’ EF + 2×6’ @ 3’50/km (r=3’) + 10’ RC" },
            { day: "Fri", date: "21/11", type: "Rest", title: "Repos", details: "Repos complet." },
            { day: "Sat", date: "22/11", type: "Easy", title: "Footing léger", details: "20–25’ @ 5’00/km + 2 lignes droites." },
            { day: "Sun", date: "23/11", type: "Race", title: "Course 5 km (Ni Rose)", details: "Objectif 3’33–3’36/km (17’45–18’00)." }
        ]
    },
    {
        week: 2,
        focus: "Semaine 10 km cool (24 → 30 novembre)",
        days: [
            { day: "Mon", date: "24/11", type: "Easy", title: "Footing EF", details: "45–50’ @ 4’50–5’00/km." },
            { day: "Tue", date: "25/11", type: "Speed", title: "VMA longue", details: "4×1000 m @ 3’36–3’38 (r=1’30–1’40) + échauffement / retour au calme." },
            { day: "Wed", date: "26/11", type: "Easy", title: "Footing EF", details: "40’ @ 5’00/km." },
            { day: "Thu", date: "27/11", type: "Tempo", title: "AS10 « cool »", details: "2×10’ @ 4’15–4’20/km." },
            { day: "Fri", date: "28/11", type: "Rest", title: "Repos", details: "Repos complet." },
            { day: "Sat", date: "29/11", type: "Rest", title: "Repos / Footing", details: "Repos recommandé. Option : 20’ très facile si bonnes sensations." },
            { day: "Sun", date: "30/11", type: "Race", title: "10 km cool", details: "Objectif 43–44 min (4’18–4’22/km)." }
        ]
    },
    {
        week: 3,
        focus: "Semaine d’affûtage 10 km (1 → 7 décembre)",
        days: [
            { day: "Mon", date: "01/12", type: "Easy", title: "Footing EF", details: "45’ @ 4’50/km." },
            { day: "Tue", date: "02/12", type: "Speed", title: "Tonicité", details: "8×300 m @ 3’20/km (r=1’10–1’15) + échauffement / retour au calme." },
            { day: "Wed", date: "03/12", type: "Easy", title: "Footing EF", details: "35–40’ @ 5’00/km." },
            { day: "Thu", date: "04/12", type: "Tempo", title: "AS10 courte", details: "2×6’ @ 3’45/km (r=3’)." },
            { day: "Fri", date: "05/12", type: "Rest", title: "Repos total", details: "Repos complet, focus fraîcheur." },
            { day: "Sat", date: "06/12", type: "Easy", title: "Footing très léger", details: "20’ + 2 lignes droites, très facile." },
            { day: "Sun", date: "07/12", type: "Race", title: "10 km objectif", details: "Objectif 3’44–3’47/km (37’20–38’00)." }
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
                            <span class="stat-label">Distance</span>
                            <span class="stat-value">-- km</span>
                        </div>
                         <div class="stat-box">
                            <span class="stat-label">Pace</span>
                            <span class="stat-value">-- /km</span>
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
