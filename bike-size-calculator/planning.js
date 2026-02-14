// ============================
// Module de Planification - Tour des Flandres 2026
// ============================

const RACE_DATE = new Date('2026-04-05T00:00:00');
const PLAN_START_DATE = new Date('2026-01-01T00:00:00');

class TrainingManager {
    constructor() {
        this.isConnected = false;
        this.constraints = {
            days: [1, 2, 4, 6], // Default: Mon, Tue, Thu, Sat
            maxHours: 10
        };

        this.cacheDOM();
        this.bindEvents();

        // Check for stored token
        const storedToken = localStorage.getItem('strava_access_token');
        if (storedToken) {
            this.tokenInput.value = storedToken;
            this.handleOAuthSuccess({
                token: storedToken,
                athlete: JSON.parse(localStorage.getItem('strava_athlete') || '{}')
            });
        }
    }

    cacheDOM() {
        this.connectBtn = document.getElementById('connectStravaBtn');
        this.statusText = document.getElementById('stravaStatus');
        this.errorText = document.getElementById('stravaError');
        this.tokenInput = document.getElementById('stravaToken'); // Hidden input
        this.dayCheckboxes = document.querySelectorAll('input[name="trainingDay"]');
        this.maxHoursInput = document.getElementById('maxHours');
        this.generateBtn = document.getElementById('generateScheduleBtn');
        this.calendarView = document.getElementById('calendarView');
        this.schedulePlaceholder = document.getElementById('schedulePlaceholder');

        // History Elements
        this.historyPlaceholder = document.getElementById('historyPlaceholder');
        this.historyContent = document.getElementById('historyContent');
    }

    bindEvents() {
        // OAuth 1-Click Connection
        this.connectBtn.addEventListener('click', () => {
            const width = 600, height = 700;
            const left = (window.innerWidth / 2) - (width / 2);
            const top = (window.innerHeight / 2) - (height / 2);

            window.open(
                '/oauth/authorize',
                'StravaAuth',
                `width=${width},height=${height},top=${top},left=${left}`
            );
        });

        // Listen for token from popup
        window.addEventListener('message', (event) => {
            if (event.data.type === 'STRAVA_TOKEN') {
                this.handleOAuthSuccess(event.data);
            }
        });

        // Generate schedule trigger (if button still exists, or auto-update on changes)
        // We'll auto-update if already generated once.
        if (this.generateBtn) {
            this.generateBtn.addEventListener('click', () => this.generateSchedule());
        }

        // Listen for constraint changes
        this.dayCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                this.updateConstraints();
                if (!this.calendarView.classList.contains('hidden')) this.generateSchedule();
            });
        });

        this.maxHoursInput.addEventListener('change', () => {
            this.updateConstraints();
            if (!this.calendarView.classList.contains('hidden')) this.generateSchedule();
        });

        // Home Trainer toggle
        const htToggle = document.getElementById('hasHomeTrainer');
        const htDays = document.getElementById('homeTrainerDays');
        if (htToggle && htDays) {
            htToggle.addEventListener('change', () => {
                htDays.classList.toggle('hidden', !htToggle.checked);
                if (!this.calendarView.classList.contains('hidden')) this.generateSchedule();
            });
        }

        // Velotaf toggle
        const velotafToggle = document.getElementById('hasVelotaf');
        const velotafOptions = document.getElementById('velotafOptions');
        const velotafDistance = document.getElementById('velotafDistance');
        const velotafDaysCount = document.getElementById('velotafDaysCount');
        const velotafWeeklyKm = document.getElementById('velotafWeeklyKm');

        if (velotafToggle && velotafOptions) {
            velotafToggle.addEventListener('change', () => {
                velotafOptions.classList.toggle('hidden', !velotafToggle.checked);
                if (!this.calendarView.classList.contains('hidden')) this.generateSchedule();
            });
        }

        // Calculate velotaf weekly km
        const updateVelotafKm = () => {
            if (velotafDistance && velotafDaysCount && velotafWeeklyKm) {
                const weekly = (parseInt(velotafDistance.value) || 0) * (parseInt(velotafDaysCount.value) || 0);
                velotafWeeklyKm.textContent = weekly;
            }
        };
        if (velotafDistance) velotafDistance.addEventListener('input', updateVelotafKm);
        if (velotafDaysCount) velotafDaysCount.addEventListener('input', updateVelotafKm);
    }

    updateConstraints() {
        const selectedDays = Array.from(this.dayCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.value));

        this.constraints.days = selectedDays;
        this.constraints.maxHours = parseInt(this.maxHoursInput.value) || 10;
        this.constraints.hasHomeTrainer = document.getElementById('hasHomeTrainer')?.checked || false;
        this.constraints.hasVelotaf = document.getElementById('hasVelotaf')?.checked || false;
    }

    handleOAuthSuccess(data) {
        if (!data.token) return;

        this.token = data.token;
        this.tokenInput.value = data.token; // Store for valid check
        this.isConnected = true;

        // Persist token
        localStorage.setItem('strava_access_token', data.token);
        if (data.athlete) {
            localStorage.setItem('strava_athlete', JSON.stringify(data.athlete));
        }

        const athlete = data.athlete || JSON.parse(localStorage.getItem('strava_athlete') || '{}');
        this.statusText.classList.remove('hidden');
        if (athlete.firstname) {
            this.statusText.innerHTML = `✅ Connecté: <strong>${athlete.firstname} ${athlete.lastname}</strong>`;
        } else {
            this.statusText.innerHTML = `✅ Connecté`;
        }

        this.errorText.classList.add('hidden');
        this.connectBtn.textContent = 'Compte Strava Connecté';
        this.connectBtn.disabled = true;
        this.connectBtn.classList.add('connected');

        // Fetch activities immediately
        this.fetchStravaActivities();
    }

    async fetchStravaActivities() {
        // Fetch last 30 days
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        const afterTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);

        try {
            const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=200`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Strava API Error:', response.status, errorData);

                if (response.status === 401) {
                    throw new Error('Token expiré ou invalide. Régénérez-le sur Strava.');
                } else if (response.status === 403) {
                    throw new Error('Permissions insuffisantes. Le token doit avoir le scope "activity:read".');
                } else {
                    throw new Error(`Erreur Strava (${response.status}): ${errorData.message || 'Inconnue'}`);
                }
            }

            const activities = await response.json();
            this.allActivities = activities; // Store all activities
            this.showNotification(`✅ ${activities.length} activités récupérées des 30 derniers jours !`);

            this.processActivities(activities);

        } catch (error) {
            console.error('Fetch Activities Error:', error);
            this.errorText.classList.remove('hidden');
            this.errorText.textContent = `❌ ${error.message}`;
        }
    }

    processActivities(activities) {
        // Render History Table (All fetched activities)
        this.renderHistoryTable(activities);

        // Calculate week boundaries for Planning
        const today = new Date();
        const startOfCurrentWeek = this.getPreviousMonday(today);

        // Store current week activities for schedule logic
        this.currentWeekActivities = activities.filter(a => {
            const d = new Date(a.start_date);
            return d >= startOfCurrentWeek;
        });

        // Always generate schedule
        this.generateSchedule();
    }

    renderHistoryTable(activities) {
        if (!activities || activities.length === 0) {
            if (this.historyPlaceholder) this.historyPlaceholder.classList.remove('hidden');
            if (this.historyContent) this.historyContent.classList.add('hidden');
            return;
        }

        const tableBody = document.getElementById('historyTableBody');
        if (!tableBody) return;

        // Sort descending
        const sortedActivities = [...activities].sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

        const rows = sortedActivities.map(a => {
            const date = new Date(a.start_date);
            const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });

            const isRun = a.type === 'Run';
            const icon = isRun ? '🏃' : '🚴';

            const dist = (a.distance / 1000).toFixed(1);
            const elev = Math.round(a.total_elevation_gain);

            const h = Math.floor(a.moving_time / 3600);
            const m = Math.floor((a.moving_time % 3600) / 60);
            const timeStr = `${h}h${m < 10 ? '0' : ''}${m}`;

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><span class="activity-icon">${icon}</span> ${a.name}</td>
                    <td>${dist} km</td>
                    <td>${elev} m</td>
                    <td>${timeStr}</td>
                </tr>
            `;
        }).join('');

        tableBody.innerHTML = rows;

        if (this.historyPlaceholder) this.historyPlaceholder.classList.add('hidden');
        if (this.historyContent) this.historyContent.classList.remove('hidden');
    }

    generateSchedule() {
        if (this.constraints.days.length < 3) {
            // Only alert if user explicitly clicks generate, not on auto-updates
            // alert("Il est recommandé de s'entraîner au moins 3 jours par semaine pour le Tour des Flandres.");
            // return;
        }

        const plan = this.createTrainingPlan();
        this.renderSchedule(plan);
    }

    createTrainingPlan() {
        const plan = [];
        const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        const today = new Date();
        // Start from current week monday
        const startOfPlanning = this.getPreviousMonday(today);

        // Loop week by week
        let currentDay = new Date(startOfPlanning);
        let weekCount = 1;

        while (currentDay <= RACE_DATE) {
            const weekNumber = this.getWeekNumber(currentDay);
            const isRaceWeek = currentDay > new Date(RACE_DATE.getTime() - 7 * 24 * 60 * 60 * 1000); // Rough check

            // Phase determination
            const weeksUntilRace = Math.floor((RACE_DATE - currentDay) / (7 * 24 * 60 * 60 * 1000));
            let phase = 'BASE';
            let phaseDesc = 'Fondation & Endurance';

            if (weeksUntilRace <= 2) {
                phase = 'TAPER';
                phaseDesc = 'Affûtage & Fraîcheur';
            } else if (weeksUntilRace <= 6) {
                phase = 'PEAK';
                phaseDesc = 'Intensité Spécifique & Monts';
            } else if (weeksUntilRace <= 10) {
                phase = 'BUILD';
                phaseDesc = 'Seuil & Force';
            }

            const weekPlan = {
                weekStart: new Date(currentDay),
                weekEnd: new Date(currentDay),
                weekNumber: weekCount,
                phase: phase,
                phaseDesc: phaseDesc,
                days: []
            };
            weekPlan.weekEnd.setDate(currentDay.getDate() + 6);

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(currentDay);
                dayDate.setDate(currentDay.getDate() + i);

                if (dayDate > RACE_DATE) break; // Don't go past race day

                const dayIndex = dayDate.getDay();
                const isPast = dayDate < today && dayDate.getDate() !== today.getDate();
                const isToday = dayDate.getDate() === today.getDate() && dayDate.getMonth() === today.getMonth();
                const isRaceDay = dayDate.getTime() === RACE_DATE.getTime();

                let workout = null;
                let completedActivity = null;

                // Find Strava activity
                if (this.allActivities) {
                    completedActivity = this.allActivities.find(a => {
                        const aDate = new Date(a.start_date);
                        return aDate.getDate() === dayDate.getDate() &&
                            aDate.getMonth() === dayDate.getMonth() &&
                            aDate.getFullYear() === dayDate.getFullYear();
                    });
                }

                if (isRaceDay) {
                    workout = {
                        type: 'race',
                        title: 'TOUR DES FLANDRES 2026',
                        description: 'Le grand jour ! Pensez à l\'alimentation et profitez de l\'ambiance.',
                        duration: '6h+',
                        difficulty: 'Max',
                        completed: !!completedActivity
                    };
                } else {
                    const isTrainingDay = this.constraints.days.includes(dayIndex);

                    if (isTrainingDay) {
                        workout = this.getWorkoutForDay(dayIndex, phase);

                        if (completedActivity) {
                            workout.completed = true;
                            workout.title = completedActivity.name; // Use actual name
                            const dist = (completedActivity.distance / 1000).toFixed(1);
                            const elev = Math.round(completedActivity.total_elevation_gain);
                            workout.description = `Strava: ${dist}km | ${elev}m D+`;
                            workout.duration = this.formatDuration(completedActivity.moving_time);
                        } else if (isPast) {
                            workout.completed = false;
                            workout.title += ' (Manqué)';
                            workout.type = 'missed';
                        }
                    } else if (completedActivity) {
                        // Unplanned ride
                        workout = {
                            type: 'base',
                            title: completedActivity.name,
                            description: `Sortie libre: ${(completedActivity.distance / 1000).toFixed(1)}km | ${Math.round(completedActivity.total_elevation_gain)}m D+`,
                            duration: this.formatDuration(completedActivity.moving_time),
                            difficulty: 'N/A',
                            completed: true
                        };
                    }
                }

                weekPlan.days.push({
                    date: dayDate,
                    dayName: daysOfWeek[dayIndex],
                    workout: workout,
                    isPast: isPast,
                    isToday: isToday,
                    isRaceDay: isRaceDay
                });
            }

            plan.push(weekPlan);

            // Advance to next week
            currentDay.setDate(currentDay.getDate() + 7);
            weekCount++;
        }

        return plan;
    }

    getWorkoutForDay(dayIndex, phase) {
        // Customize based on Phase

        // Weekend Long Ride logic
        if (dayIndex === 0 || dayIndex === 6) {
            let duration = '3h00';
            let desc = 'Endurance fondamentale (Z2).';
            let title = 'Sortie Longue';

            if (phase === 'BUILD') {
                duration = '3h30 - 4h00';
                desc = 'Endurance avec 3x15min tempo (Z3) dans les bosses.';
                title = 'Endurance + Tempo';
            } else if (phase === 'PEAK') { // Peak
                duration = '4h00+';
                desc = 'Simulation course. Enchaînement de bosses courtes à haute intensité.';
                title = 'Simulation Flandrienne';
            } else if (phase === 'TAPER') {
                duration = '2h00';
                desc = 'Sortie souple, quelques accélérations courtes pour débloquer.';
                title = 'Maintien';
            }

            return {
                type: 'long_ride',
                title: title,
                description: desc,
                duration: duration,
                difficulty: phase === 'TAPER' ? 'Faible' : 'Moyenne+ '
            };
        }

        // Weekday Intervals (Tue/Thu)
        if (dayIndex === 2 || dayIndex === 4) {
            let workout = { type: 'intervals', duration: '1h00-1h30', difficulty: 'Elevée' };

            if (phase === 'BASE') {
                workout.title = 'Vélocité / Force';
                workout.description = 'Travail de cadence (100rpm+) ou force (50rpm) en Z3.';
            } else if (phase === 'BUILD') {
                workout.title = 'Seuil (Z4)';
                workout.description = '2 x 15min au seuil anaérobie. Récup 5min.';
            } else if (phase === 'PEAK') {
                workout.title = 'PMA / VO2 Max';
                workout.description = 'Intervalles courts: 3 séries de (30s max / 30s récup) x 10.';
            } else { // Taper
                workout.title = 'Rappels d\'intensité';
                workout.description = '2 x 5min au seuil. Reste très souple.';
                workout.duration = '1h00';
                workout.difficulty = 'Moyenne';
            }
            return workout;
        }

        // Other days (Mon/Wed/Fri) -> Recovery or HT
        return {
            type: 'base',
            title: 'Récupération / Endurance',
            description: 'Zone 1-2 stricte. Tournez les jambes.',
            duration: '1h00 - 1h30',
            difficulty: 'Faible'
        };
    }

    renderSchedule(plan) {
        if (this.schedulePlaceholder) this.schedulePlaceholder.classList.add('hidden');
        if (this.calendarView) {
            this.calendarView.classList.remove('hidden');
            this.calendarView.innerHTML = ''; // Clear
        }

        const container = document.createElement('div');
        container.className = 'schedule-container';

        plan.forEach(week => {
            const weekBlock = document.createElement('div');
            weekBlock.className = 'week-block';

            const startStr = week.weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
            const endStr = week.weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

            weekBlock.innerHTML = `
                <div class="week-header">
                    <span class="week-title">Semaine ${week.weekNumber}</span>
                    <span class="week-dates">${startStr} - ${endStr}</span>
                    <span class="phase-badge phase-${week.phase.toLowerCase()}">${week.phaseDesc}</span>
                </div>
                <div class="week-grid"></div>
            `;

            const grid = weekBlock.querySelector('.week-grid');

            week.days.forEach(day => {
                const dayCard = document.createElement('div');
                dayCard.className = 'training-day-card';
                if (day.isPast) dayCard.classList.add('day-past');
                if (day.isToday) dayCard.classList.add('day-today');
                if (day.isRaceDay) dayCard.classList.add('day-race');

                const dayNumber = day.date.getDate();

                let content = '';

                if (day.workout) {
                    let statusBadge = '';
                    if (day.workout.completed) {
                        statusBadge = '<span class="status-badge completed">✅</span>';
                    } else if (day.workout.type === 'missed') {
                        statusBadge = '<span class="status-badge missed">❌</span>';
                    } else if (day.isRaceDay) {
                        statusBadge = '🏁';
                    }

                    content = `
                        <div class="day-header">
                            <span class="day-name">${day.dayName}</span>
                            <span class="day-date">${dayNumber}</span>
                        </div>
                        <div class="workout-details">
                            <div class="workout-meta">
                                <span class="workout-type ${day.workout.type}">${day.workout.title}</span>
                                ${statusBadge}
                            </div>
                            <p class="workout-desc">${day.workout.description}</p>
                            <div class="workout-duration">${day.workout.duration || ''}</div>
                        </div>
                    `;
                } else {
                    content = `
                        <div class="day-header">
                            <span class="day-name">${day.dayName}</span>
                            <span class="day-date">${dayNumber}</span>
                        </div>
                        <div class="workout-details">
                            <span class="workout-type rest">Repos</span>
                        </div>
                    `;
                }

                dayCard.innerHTML = content;
                grid.appendChild(dayCard);
            });

            container.appendChild(weekBlock);
        });

        this.calendarView.appendChild(container);
    }

    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h${m < 10 ? '0' : ''}${m}`;
    }

    getPreviousMonday(date) {
        const prevMonday = new Date(date);
        const day = prevMonday.getDay();
        const diff = prevMonday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        prevMonday.setDate(diff);
        prevMonday.setHours(0, 0, 0, 0);
        return prevMonday;
    }

    getWeekNumber(d) {
        // ISO week date helpers could be used, but rough counter is fine for this context
        return 0; // Not critical for display, we use loop index
    }

    showNotification(message) {
        // Simple alert for now, could be a toast
        // alert(message); // Annoying if frequent
        console.log(message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();

    // Init Manager if tab is active OR on click
    const trainingTabBtn = document.querySelector('button[data-tab="training-plan"]');
    const trainingContent = document.getElementById('training-plan');

    const ensureManager = () => {
        if (!window.trainingManager) {
            console.log('Initializing TrainingManager...');
            window.trainingManager = new TrainingManager();
        }
    };

    if (trainingTabBtn) {
        trainingTabBtn.addEventListener('click', ensureManager);
    }

    // Auto-init if already active (default state)
    if (trainingContent && trainingContent.classList.contains('active')) {
        ensureManager();
    }
});

function setupTabNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            // Add active to clicked
            tab.classList.add('active');

            // Show content
            const targetId = tab.dataset.tab;
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}
