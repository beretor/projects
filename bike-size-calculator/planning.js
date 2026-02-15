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

        // Check for stored token on server/local
        this.checkServerToken();
    }

    async checkServerToken() {
        try {
            // Note: In a deployed environment (GitHub Pages), this will fail unless server.py is running locally 
            // and the browser allows mixed content or the API is proxied.
            // For now, we assume server.py is running on localhost:8000.
            const apiBase = window.location.hostname === 'localhost' ? '' : 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/token`);
            if (response.ok) {
                const data = await response.json();
                if (data.access_token) {
                    console.log('✅ Found valid token from server');
                    this.handleOAuthSuccess({
                        token: data.access_token,
                        athlete: data.athlete
                    });
                    return;
                }
            }
        } catch (e) {
            console.log('Server token check failed, falling back to local storage', e);
        }

        // Fallback: Check local storage
        const storedToken = localStorage.getItem('strava_access_token');
        if (storedToken) {
            console.log('Found local token, verifying...');
            this.handleOAuthSuccess({
                token: storedToken,
                athlete: JSON.parse(localStorage.getItem('strava_athlete') || '{}')
            });
        }
    }

    cacheDOM() {
        this.connectBtn = document.getElementById('connectStravaBtn');
        this.disconnectBtn = document.getElementById('disconnectStravaBtn'); // New
        this.statusText = document.getElementById('stravaStatus');
        this.errorText = document.getElementById('stravaError');
        this.tokenInput = document.getElementById('stravaToken'); // Hidden input
        this.dayCheckboxes = document.querySelectorAll('input[name="trainingDay"]');
        this.maxHoursInput = document.getElementById('maxHours');
        this.generateBtn = document.getElementById('generateScheduleBtn');
        this.calendarView = document.getElementById('calendarView');
        this.schedulePlaceholder = document.getElementById('schedulePlaceholder');
        this.syncGarminBtn = document.getElementById('syncGarminBtn');

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
                `${window.location.hostname === 'localhost' ? '' : 'http://localhost:8000'}/oauth/authorize`,
                'StravaAuth',
                `width=${width},height=${height},top=${top},left=${left}`
            );
        });

        // Logout
        if (this.disconnectBtn) {
            this.disconnectBtn.addEventListener('click', () => this.logout());
        }

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

        // Garmin Sync
        if (this.syncGarminBtn) {
            this.syncGarminBtn.addEventListener('click', () => this.syncToGarmin());
        }
    }

    updateConstraints() {
        const selectedDays = Array.from(this.dayCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.value));

        this.constraints.days = selectedDays;
        this.constraints.maxHours = parseInt(this.maxHoursInput.value) || 10;
        this.constraints.hasHomeTrainer = document.getElementById('hasHomeTrainer')?.checked || false;
        this.constraints.hasVelotaf = document.getElementById('hasVelotaf')?.checked || false;

        if (this.constraints.hasVelotaf) {
            this.constraints.velotafDistance = parseInt(document.getElementById('velotafDistance')?.value) || 20;
            this.constraints.velotafDaysCount = parseInt(document.getElementById('velotafDaysCount')?.value) || 3;
        }
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
        this.connectBtn.classList.add('hidden'); // Hide connect button

        if (this.disconnectBtn) {
            this.disconnectBtn.classList.remove('hidden');
        }

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

        // Initial render function
        const renderRows = (limit) => {
            const rows = sortedActivities.slice(0, limit).map(a => {
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
        };

        // Render first 5
        const initialLimit = 5;
        renderRows(initialLimit);

        if (this.historyPlaceholder) this.historyPlaceholder.classList.add('hidden');
        if (this.historyContent) this.historyContent.classList.remove('hidden');

        // Handle "Show More" button
        const historyContainer = document.querySelector('.table-container');
        // Remove existing button if any
        const existingBtn = document.getElementById('toggleHistoryBtn');
        if (existingBtn) existingBtn.remove();

        if (sortedActivities.length > initialLimit) {
            const btn = document.createElement('button');
            btn.id = 'toggleHistoryBtn';
            btn.className = 'btn-text-only';
            btn.textContent = `Voir toutes les activités (${sortedActivities.length})`;
            btn.style.marginTop = '1rem';

            let expanded = false;

            btn.addEventListener('click', () => {
                expanded = !expanded;
                if (expanded) {
                    renderRows(sortedActivities.length);
                    btn.textContent = 'Voir moins';
                } else {
                    renderRows(initialLimit);
                    btn.textContent = `Voir toutes les activités (${sortedActivities.length})`;
                }
            });

            historyContainer.insertAdjacentElement('afterend', btn);
        }
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
        const startOfPlanning = this.getPreviousMonday(today);

        let currentDay = new Date(startOfPlanning);
        let weekCount = 1;

        while (currentDay <= RACE_DATE) {
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

            // Track if a long ride was already done this week
            let longRideDoneThisWeek = false;

            // First pass: check activities done this week (for the current week being processed)
            for (let i = 0; i < 7; i++) {
                const checkDate = new Date(currentDay);
                checkDate.setDate(currentDay.getDate() + i);

                if (this.allActivities) {
                    const dayActivities = this.allActivities.filter(a => {
                        const aDate = new Date(a.start_date);
                        return aDate.toDateString() === checkDate.toDateString();
                    });

                    if (dayActivities.some(a => a.distance > 50000 || a.moving_time > 9000)) { // ~2.5h or 50km
                        longRideDoneThisWeek = true;
                    }
                }
            }

            for (let i = 0; i < 7; i++) {
                const dayDate = new Date(currentDay);
                dayDate.setDate(currentDay.getDate() + i);

                if (dayDate > RACE_DATE) break;

                const dayIndex = dayDate.getDay();
                const isPast = dayDate < today && dayDate.toDateString() !== today.toDateString();
                const isToday = dayDate.toDateString() === today.toDateString();
                const isRaceDay = dayDate.toDateString() === RACE_DATE.toDateString();

                let completedActivities = [];
                if (this.allActivities) {
                    completedActivities = this.allActivities.filter(a => {
                        const aDate = new Date(a.start_date);
                        return aDate.toDateString() === dayDate.toDateString();
                    });
                }

                let workouts = [];

                if (isRaceDay) {
                    workouts.push({
                        type: 'race',
                        sport: 'race',
                        title: 'TOUR DES FLANDRES 2026',
                        description: 'Le grand jour !',
                        duration: '6h+',
                        difficulty: 'Max',
                        completed: completedActivities.length > 0
                    });
                } else {
                    const isTrainingDay = this.constraints.days.includes(dayIndex);

                    if (completedActivities.length > 0) {
                        // Group commutes
                        const commutes = completedActivities.filter(a => a.commute);
                        const others = completedActivities.filter(a => !a.commute);

                        if (commutes.length > 0) {
                            const totalDist = commutes.reduce((sum, a) => sum + a.distance, 0);
                            const totalTime = commutes.reduce((sum, a) => sum + a.moving_time, 0);
                            workouts.push({
                                type: 'commute',
                                sport: 'ride',
                                title: commutes.length > 1 ? 'Vélotaf (A/R)' : 'Vélotaf',
                                description: `${(totalDist / 1000).toFixed(1)}km total`,
                                duration: this.formatDuration(totalTime),
                                completed: true
                            });
                        }

                        others.forEach(activity => {
                            const dist = (activity.distance / 1000).toFixed(1);
                            const elev = Math.round(activity.total_elevation_gain);
                            const sport = activity.type === 'Run' ? 'run' : 'ride';
                            workouts.push({
                                type: 'base',
                                sport: sport,
                                title: activity.name,
                                description: `${dist}km | ${elev}m D+`,
                                duration: this.formatDuration(activity.moving_time),
                                completed: true
                            });
                        });
                    } else if (isTrainingDay) {
                        let workout = this.getWorkoutForDay(dayIndex, phase);

                        // Check if we should skip long ride
                        if (workout.type === 'long_ride' && longRideDoneThisWeek) {
                            workout = {
                                type: 'base',
                                sport: 'ride',
                                title: 'Récupération Active',
                                description: 'Sortie longue déjà effectuée cette semaine. Roulez souple.',
                                duration: '1h00',
                                difficulty: 'Faible'
                            };
                        }

                        if (isPast) {
                            workout.completed = false;
                            workout.title += ' (Manqué)';
                            workout.type = 'missed';
                        }
                        workouts.push(workout);
                    }

                    // Schedule future commuting if enabled
                    if (!isPast && !isRaceDay && this.constraints.hasVelotaf) {
                        // Simple logic to distribute velotaf: Mon(1), Wed(3), Fri(5), Tue(2), Thu(4)
                        const velotafOrder = [1, 3, 5, 2, 4];
                        const count = this.constraints.velotafDaysCount || 0;
                        const velotafDays = velotafOrder.slice(0, count);

                        if (velotafDays.includes(dayIndex)) {
                            const dist = this.constraints.velotafDistance || 20;
                            workouts.push({
                                type: 'commute',
                                sport: 'ride',
                                title: 'Vélotaf (Z2)',
                                description: `Entraînement Z2 | ${dist}km A/R`,
                                duration: 'Prévu',
                                difficulty: 'Faible',
                                completed: false
                            });
                        }
                    }
                }

                weekPlan.days.push({
                    date: dayDate,
                    dayName: daysOfWeek[dayIndex],
                    workouts: workouts,
                    isPast: isPast,
                    isToday: isToday,
                    isRaceDay: isRaceDay
                });
            }

            plan.push(weekPlan);
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

            let steps = [];
            if (phase === 'BUILD') {
                duration = '3h30 - 4h00';
                desc = 'Endurance avec 3x15min tempo (Z3) dans les bosses.';
                title = 'Endurance + Tempo';
                steps = [
                    { type: 'warmup', duration: '20:00', target: 'ZONE_2' },
                    {
                        type: 'repeat', count: 3, steps: [
                            { type: 'interval', duration: '15:00', target: 'ZONE_3' },
                            { type: 'recovery', duration: '5:00', target: 'ZONE_1' }
                        ]
                    },
                    { type: 'cooldown', duration: '10:00', target: 'ZONE_2' }
                ];
            } else if (phase === 'PEAK') {
                duration = '4h00+';
                desc = 'Simulation course. Enchaînement de bosses courtes à haute intensité.';
                title = 'Simulation Flandrienne';
                steps = [
                    { type: 'warmup', duration: '30:00', target: 'ZONE_2' },
                    {
                        type: 'repeat', count: 10, steps: [
                            { type: 'interval', duration: '1:00', target: 'ZONE_5' },
                            { type: 'recovery', duration: '5:00', target: 'ZONE_2' }
                        ]
                    },
                    { type: 'cooldown', duration: '30:00', target: 'ZONE_2' }
                ];
            } else if (phase === 'TAPER') {
                duration = '2h00';
                desc = 'Sortie souple, quelques accélérations courtes pour débloquer.';
                title = 'Maintien';
                steps = [
                    { type: 'warmup', duration: '15:00', target: 'ZONE_2' },
                    {
                        type: 'repeat', count: 4, steps: [
                            { type: 'interval', duration: '0:30', target: 'ZONE_5' },
                            { type: 'recovery', duration: '4:30', target: 'ZONE_1' }
                        ]
                    },
                    { type: 'cooldown', duration: '10:00', target: 'ZONE_2' }
                ];
            } else {
                steps = [
                    { type: 'warmup', duration: '10:00', target: 'ZONE_1' },
                    { type: 'interval', duration: '160:00', target: 'ZONE_2' },
                    { type: 'cooldown', duration: '10:00', target: 'ZONE_1' }
                ];
            }

            return {
                type: 'long_ride',
                sport: 'ride',
                title: title,
                description: desc,
                duration: duration,
                difficulty: phase === 'TAPER' ? 'Faible' : 'Moyenne+ ',
                steps: steps
            };
        }

        // Weekday Intervals (Tue/Thu)
        if (dayIndex === 2 || dayIndex === 4) {
            let workout = { type: 'intervals', sport: 'ride', duration: '1h00-1h30', difficulty: 'Élevée' };

            let steps = [];
            if (phase === 'BASE') {
                workout.title = 'Vélocité / Force';
                workout.description = 'Travail de cadence (100rpm+) ou force (50rpm) en Z3.';
                steps = [
                    { type: 'warmup', duration: '15:00', target: 'ZONE_1' },
                    { type: 'interval', duration: '10:00', target: 'ZONE_3', description: 'Cadence haute' },
                    { type: 'recovery', duration: '5:00', target: 'ZONE_1' },
                    { type: 'interval', duration: '10:00', target: 'ZONE_3', description: 'Force basse cadence' },
                    { type: 'cooldown', duration: '15:00', target: 'ZONE_1' }
                ];
            } else if (phase === 'BUILD') {
                workout.title = 'Seuil (Z4)';
                workout.description = '2 x 15min au seuil anaérobie. Récup 5min.';
                steps = [
                    { type: 'warmup', duration: '15:00', target: 'ZONE_1' },
                    {
                        type: 'repeat', count: 2, steps: [
                            { type: 'interval', duration: '15:00', target: 'ZONE_4' },
                            { type: 'recovery', duration: '5:00', target: 'ZONE_1' }
                        ]
                    },
                    { type: 'cooldown', duration: '15:00', target: 'ZONE_1' }
                ];
            } else if (phase === 'PEAK') {
                workout.title = 'PMA / VO2 Max';
                workout.description = 'Intervalles courts: 3 séries de (30s max / 30s récup) x 10.';
                steps = [
                    { type: 'warmup', duration: '15:00', target: 'ZONE_1' },
                    {
                        type: 'repeat', count: 3, steps: [
                            {
                                type: 'repeat', count: 10, steps: [
                                    { type: 'interval', duration: '0:30', target: 'ZONE_5' },
                                    { type: 'recovery', duration: '0:30', target: 'ZONE_1' }
                                ]
                            },
                            { type: 'recovery', duration: '5:00', target: 'ZONE_1' }
                        ]
                    },
                    { type: 'cooldown', duration: '10:00', target: 'ZONE_1' }
                ];
            } else { // Taper
                workout.title = 'Rappels d\'intensité';
                workout.description = '2 x 5min au seuil. Reste très souple.';
                workout.duration = '1h00';
                workout.difficulty = 'Moyenne';
                steps = [
                    { type: 'warmup', duration: '15:00', target: 'ZONE_1' },
                    {
                        type: 'repeat', count: 2, steps: [
                            { type: 'interval', duration: '5:00', target: 'ZONE_4' },
                            { type: 'recovery', duration: '5:00', target: 'ZONE_1' }
                        ]
                    },
                    { type: 'cooldown', duration: '10:00', target: 'ZONE_1' }
                ];
            }
            workout.steps = steps;
            return workout;
        }

        // Other days (Mon/Wed/Fri) -> Recovery or HT
        return {
            type: 'base',
            sport: 'ride',
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

        if (this.syncGarminBtn) {
            this.syncGarminBtn.classList.remove('hidden');
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

                let content = `
                    <div class="day-header">
                        <span class="day-name">${day.dayName}</span>
                        <span class="day-date">${dayNumber}</span>
                    </div>
                `;

                if (day.workouts && day.workouts.length > 0) {
                    day.workouts.forEach((w, idx) => {
                        let statusBadge = '';
                        if (w.completed) {
                            statusBadge = '<span class="status-badge completed">✅</span>';
                        } else if (w.type === 'missed') {
                            statusBadge = '<span class="status-badge missed">❌</span>';
                        } else if (w.type === 'race') {
                            statusBadge = '🏁';
                        }

                        const sportEmoji = this.getSportEmoji(w.sport || 'ride');
                        const commuteTag = w.type === 'commute' ? ' 🏢' : '';

                        if (idx > 0) {
                            content += '<hr class="workout-divider">';
                        }

                        content += `
                            <div class="workout-details">
                                <div class="workout-meta">
                                    <span class="workout-type ${w.type}">${sportEmoji} ${w.title}${commuteTag}</span>
                                    ${statusBadge}
                                </div>
                                <p class="workout-desc">${w.description}</p>
                                <div class="workout-duration">${w.duration || ''}</div>
                            </div>
                        `;
                    });
                } else {
                    content += `
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

    getSportEmoji(sport) {
        switch (sport) {
            case 'run': return '🏃';
            case 'race': return '🏁';
            case 'ride':
            default: return '🚴';
        }
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

    async logout() {
        // 1. Clear local storage
        localStorage.removeItem('strava_access_token');
        localStorage.removeItem('strava_athlete');

        // 2. Clear server storage
        try {
            const apiBase = window.location.hostname === 'localhost' ? '' : 'http://localhost:8000';
            await fetch(`${apiBase}/api/logout`);
        } catch (e) {
            console.error('Error logging out from server:', e);
        }

        // 3. Reset state
        this.isConnected = false;
        this.token = null;
        this.allActivities = [];
        this.currentWeekActivities = [];

        // 4. Update UI
        this.connectBtn.classList.remove('connected', 'hidden');
        this.connectBtn.disabled = false;
        this.connectBtn.textContent = 'Connecter avec Strava';
        this.connectBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L15.387 0 10.537 9.574h4.844" />
            </svg>
            Connecter avec Strava
        `;

        this.statusText.classList.add('hidden');
        this.disconnectBtn.classList.add('hidden');
        this.tokenInput.value = '';

        // 5. Clear Data Displays
        if (this.historyContent) this.historyContent.classList.add('hidden');
        if (this.historyPlaceholder) this.historyPlaceholder.classList.remove('hidden');
        if (this.syncGarminBtn) this.syncGarminBtn.classList.add('hidden');

        // Clear schedule or just regenerate with defaults?
        // Let's reload the page to be clean, or just re-generate empty schedule
        // Reloading is safer to clear everything
        window.location.reload();
    }

    async syncToGarmin() {
        if (!this.syncGarminBtn) return;

        // Collect plan (all future target workouts)
        const plan = this.createTrainingPlan();

        // Flatten plan to just days/workouts
        const allWorkouts = [];
        plan.forEach(week => {
            week.days.forEach(day => {
                const dateISO = day.date.toISOString().split('T')[0];
                day.workouts.forEach(w => {
                    // We only want to send non-completed, non-commute, non-race workouts 
                    // that have steps (implied by type intervals/long_ride)
                    if (w.type === 'intervals' || w.type === 'long_ride') {
                        allWorkouts.push({
                            date: dateISO,
                            title: w.title,
                            description: w.description,
                            steps: this.getStepsForWorkout(w),
                            is_race: false
                        });
                    }
                });
            });
        });

        if (allWorkouts.length === 0) {
            alert('Aucun entraînement futur à synchroniser.');
            return;
        }

        // UI state
        const originalText = this.syncGarminBtn.innerHTML;
        this.syncGarminBtn.classList.add('syncing');
        this.syncGarminBtn.innerHTML = '<span>Synchronisation</span>';
        this.syncGarminBtn.disabled = true;

        try {
            const apiBase = window.location.hostname === 'localhost' ? '' : 'http://localhost:8000';
            const response = await fetch(`${apiBase}/api/garmin/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allWorkouts)
            });

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            const successCount = result.results?.filter(r => r.status === 'success').length || 0;
            const errorCount = (result.results?.length || 0) - successCount;

            let msg = `✅ ${successCount} entraînements synchronisés avec succès.`;
            if (errorCount > 0) msg += `\n❌ ${errorCount} erreurs rencontrées.`;

            alert(msg);

        } catch (e) {
            console.error('Garmin Sync Error:', e);
            alert(`❌ Erreur lors de la synchronisation : ${e.message}`);
        } finally {
            this.syncGarminBtn.classList.remove('syncing');
            this.syncGarminBtn.innerHTML = originalText;
            this.syncGarminBtn.disabled = false;
        }
    }

    getStepsForWorkout(w) {
        // This is a bit redundant with generate_plan.py but we need it here 
        // because the frontend is the source of truth for the *user-configured* plan

        // Let's implement a simple mapping or just use titles if we don't have step details in JS object
        // Wait, the JS object in planning.js doesn't have the "steps" array like generate_plan.py!
        // I need to add them or re-generate them on the fly.

        // Let's check how getWorkoutForDay is implemented in planning.js
        // It returns { type, sport, title, description, duration, difficulty }
        // I'll update getWorkoutForDay to include steps.
        return w.steps || [];
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
