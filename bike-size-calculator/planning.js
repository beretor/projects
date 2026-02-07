// ============================
// Module de Planification - Tour des Flandres 2026
// ============================

class TrainingManager {
    constructor() {
        this.isConnected = false;
        this.constraints = {
            days: [1, 2, 4, 6], // Default: Mon, Tue, Thu, Sat
            maxHours: 10
        };

        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        this.connectBtn = document.getElementById('connectStravaBtn');
        this.statusText = document.getElementById('stravaStatus');
        this.errorText = document.getElementById('stravaError');
        this.tokenInput = document.getElementById('stravaToken');
        this.dayCheckboxes = document.querySelectorAll('input[name="trainingDay"]');
        this.maxHoursInput = document.getElementById('maxHours');
        this.generateBtn = document.getElementById('generateScheduleBtn');
        this.calendarView = document.getElementById('calendarView');
        this.schedulePlaceholder = document.getElementById('schedulePlaceholder');

        // Last Week Elements
        this.lastWeekPlaceholder = document.getElementById('lastWeekPlaceholder');
        this.lastWeekContent = document.getElementById('lastWeekContent');
        this.lastWeekDist = document.getElementById('lastWeekDist');
        this.lastWeekTime = document.getElementById('lastWeekTime');
        this.lastWeekElev = document.getElementById('lastWeekElev');
        this.lastWeekTableBody = document.getElementById('lastWeekTableBody');
    }

    bindEvents() {
        this.connectBtn.addEventListener('click', () => this.handleStravaAuth());
        this.generateBtn.addEventListener('click', () => this.generateSchedule());

        // Listen for constraint changes
        this.dayCheckboxes.forEach(cb => {
            cb.addEventListener('change', () => this.updateConstraints());
        });

        this.maxHoursInput.addEventListener('change', () => this.updateConstraints());

        // Help guide toggle
        const helpToggle = document.getElementById('tokenHelpToggle');
        const helpGuide = document.getElementById('tokenHelpGuide');
        if (helpToggle && helpGuide) {
            helpToggle.addEventListener('click', () => {
                helpGuide.classList.toggle('hidden');
                helpToggle.textContent = helpGuide.classList.contains('hidden')
                    ? '❓ Comment obtenir un token ?'
                    : '✕ Fermer le guide';
            });
        }

        // OAuth link generator
        const generateLinkBtn = document.getElementById('generateAuthLink');
        const clientIdInput = document.getElementById('clientIdInput');
        const authLinkStep = document.getElementById('authLinkStep');
        const authLink = document.getElementById('authLink');

        if (generateLinkBtn && clientIdInput) {
            generateLinkBtn.addEventListener('click', () => {
                const clientId = clientIdInput.value.trim();
                if (!clientId) {
                    alert('Entrez votre Client ID');
                    return;
                }
                const oauthUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=http://localhost&scope=read,activity:read_all&approval_prompt=force`;
                authLink.href = oauthUrl;
                authLinkStep.classList.remove('hidden');
            });
        }
    }

    updateConstraints() {
        const selectedDays = Array.from(this.dayCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => parseInt(cb.value));

        this.constraints.days = selectedDays;
        this.constraints.maxHours = parseInt(this.maxHoursInput.value) || 10;
    }

    async handleStravaAuth() {
        const token = this.tokenInput.value.trim();

        if (!token) {
            alert('Veuillez entrer un token d\'accès Strava.');
            return;
        }

        this.connectBtn.textContent = 'Connexion...';
        this.connectBtn.disabled = true;
        this.statusText.classList.add('hidden');
        this.errorText.classList.add('hidden');

        try {
            // Verify token by fetching athlete info
            const athleteRes = await fetch('https://www.strava.com/api/v3/athlete', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!athleteRes.ok) throw new Error('Token invalide');

            const athlete = await athleteRes.json();
            this.isConnected = true;
            this.token = token;
            this.statusText.classList.remove('hidden');
            this.statusText.innerHTML = `✅ Connecté: <strong>${athlete.firstname} ${athlete.lastname}</strong>`;

            // Now fetch activities
            await this.fetchStravaActivities();

        } catch (error) {
            console.error('Strava Auth Error:', error);
            this.errorText.classList.remove('hidden');
            this.errorText.textContent = '❌ Token invalide ou expiré';
        } finally {
            this.connectBtn.textContent = 'Synchroniser';
            this.connectBtn.disabled = false;
        }
    }

    async fetchStravaActivities() {
        const now = new Date();
        const fourteenDaysAgo = new Date(now);
        fourteenDaysAgo.setDate(now.getDate() - 14);
        const afterTimestamp = Math.floor(fourteenDaysAgo.getTime() / 1000);

        try {
            const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=50`, {
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
            this.showNotification(`✅ ${activities.length} activités récupérées des 14 derniers jours !`);
            this.processActivities(activities);

        } catch (error) {
            console.error('Fetch Activities Error:', error);
            this.errorText.classList.remove('hidden');
            this.errorText.textContent = `❌ ${error.message}`;
        }
    }

    processActivities(activities) {
        // Calculate week boundaries
        const today = new Date();
        const startOfCurrentWeek = this.getPreviousMonday(today);

        const endOfLastWeek = new Date(startOfCurrentWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
        endOfLastWeek.setHours(23, 59, 59);

        const startOfLastWeek = new Date(endOfLastWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 6);
        startOfLastWeek.setHours(0, 0, 0);

        // Filter for last week
        const lastWeekActivities = activities.filter(a => {
            const d = new Date(a.start_date);
            return d >= startOfLastWeek && d <= endOfLastWeek;
        });

        this.renderLastWeekStatsFromAPI(lastWeekActivities);

        // Store current week activities for schedule
        this.currentWeekActivities = activities.filter(a => {
            const d = new Date(a.start_date);
            return d >= startOfCurrentWeek;
        });

        // Refresh schedule if visible
        if (!this.calendarView.classList.contains('hidden')) {
            this.generateSchedule();
        }
    }

    renderLastWeekStatsFromAPI(activities) {
        let totalDist = 0;
        let totalTime = 0;
        let totalElev = 0;

        const rows = activities.map(a => {
            totalDist += a.distance;
            totalTime += a.moving_time;
            totalElev += a.total_elevation_gain;

            const date = new Date(a.start_date);
            const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit' });
            const h = Math.floor(a.moving_time / 3600);
            const m = Math.floor((a.moving_time % 3600) / 60);

            return `
                <tr>
                    <td>${dateStr}</td>
                    <td><span class="activity-name">${a.name}</span></td>
                    <td>${(a.distance / 1000).toFixed(1)} km</td>
                    <td>${h}h${m < 10 ? '0' : ''}${m}</td>
                    <td>${Math.round(a.total_elevation_gain)} m</td>
                </tr>
            `;
        }).join('');

        this.lastWeekPlaceholder.classList.add('hidden');
        this.lastWeekContent.classList.remove('hidden');

        // Summary
        this.lastWeekDist.textContent = Math.round(totalDist / 1000);
        const th = Math.floor(totalTime / 3600);
        const tm = Math.floor((totalTime % 3600) / 60);
        this.lastWeekTime.textContent = `${th}h${tm < 10 ? '0' : ''}${tm}`;
        this.lastWeekElev.textContent = Math.round(totalElev);

        // Table
        this.lastWeekTableBody.innerHTML = rows || '<tr><td colspan="5">Aucune activité la semaine dernière</td></tr>';
    }

    renderLastWeekStats(stats) {
        this.lastWeekPlaceholder.classList.add('hidden');
        this.lastWeekContent.classList.remove('hidden');

        // Update Summary
        this.lastWeekDist.textContent = stats.totalDist;
        this.lastWeekTime.textContent = stats.totalTime;
        this.lastWeekElev.textContent = stats.totalElev;

        // Update Table
        this.lastWeekTableBody.innerHTML = stats.activities.map(activity => `
            <tr>
                <td>${activity.date}</td>
                <td>
                    <span class="activity-name">${activity.name}</span>
                </td>
                <td>${activity.dist}</td>
                <td>${activity.time}</td>
                <td>${activity.elev}</td>
            </tr>
        `).join('');
    }

    generateSchedule() {
        if (this.constraints.days.length < 3) {
            alert("Il est recommandé de s'entraîner au moins 3 jours par semaine pour le Tour des Flandres.");
            return;
        }

        this.renderSchedule(this.createWeeklyPlan());

        // Scroll to results
        document.getElementById('scheduleCard').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    createWeeklyPlan() {
        const plan = [];
        const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

        // Calculate the start of the current week (Monday)
        const today = new Date();
        const startOfWeek = this.getPreviousMonday(today);

        // Generate a 7-day schedule for the CURRENT week
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            date.setHours(0, 0, 0, 0);
            const dayIndex = date.getDay(); // 0 = Sunday

            // Check if this date is in the past
            const isPast = date < today && date.getDate() !== today.getDate();
            const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();

            const isTrainingDay = this.constraints.days.includes(dayIndex);

            // Check for real Strava activity on this day
            let completedActivity = null;
            if (this.currentWeekActivities) {
                completedActivity = this.currentWeekActivities.find(a => {
                    const aDate = new Date(a.start_date);
                    return aDate.getDate() === date.getDate() && aDate.getMonth() === date.getMonth();
                });
            }

            let workout = null;
            if (isTrainingDay) {
                workout = this.getWorkoutForDay(dayIndex);

                if (completedActivity) {
                    // Real activity found - use Strava data
                    workout.completed = true;
                    workout.title = completedActivity.name;
                    const dist = (completedActivity.distance / 1000).toFixed(1);
                    const elev = Math.round(completedActivity.total_elevation_gain);
                    workout.description = `Strava: ${dist}km | ${elev}m D+`;
                    workout.duration = this.formatDuration(completedActivity.moving_time);
                } else if (isPast) {
                    // Past day with no activity = missed
                    workout.completed = false;
                    workout.title += ' (Non réalisé)';
                }
            } else if (completedActivity) {
                // Unplanned ride
                workout = {
                    type: 'base',
                    title: completedActivity.name,
                    description: `Non planifié: ${(completedActivity.distance / 1000).toFixed(1)}km`,
                    duration: this.formatDuration(completedActivity.moving_time),
                    difficulty: 'N/A',
                    completed: true
                };
            }

            plan.push({
                date: date,
                dayName: daysOfWeek[dayIndex],
                workout: workout,
                isPast: isPast,
                isToday: isToday
            });
        }

        return plan;
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

    getWorkoutForDay(dayIndex) {
        // Simple logic for Tour des Flandres Prep
        // Weekend: Long Ride (Endurance/Cobbles simulation)
        // Weekdays: Intervals or Recovery

        if (dayIndex === 0 || dayIndex === 6) { // Weekend
            return {
                type: 'long_ride',
                title: 'Sortie Longue - Endurance',
                description: 'Focus sur l\'endurance fondamentale. Intégrez des sections pavées ou des chemins si possible. Cadence 85-95 rpm.',
                duration: '3h00 - 4h00',
                difficulty: 'Moyenne',
                completed: false
            };
        } else if (dayIndex === 2 || dayIndex === 4) { // Tue/Thu -> Intensity
            return {
                type: 'intervals',
                title: 'Intervalles au Seuil',
                description: 'Echauffement 20min. 3 x 10min au seuil (Z4) avec 5min de récupération. Retour au calme 15min.',
                duration: '1h30',
                difficulty: 'Elevée',
                completed: false
            };
        } else {
            return {
                type: 'base',
                title: 'Endurance de Base',
                description: 'Sortie souple pour accumuler du volume sans fatigue excessive. Restez en Z2.',
                duration: '2h00',
                difficulty: 'Faible',
                completed: false
            };
        }
    }

    renderSchedule(plan) {
        this.schedulePlaceholder.classList.add('hidden');
        this.calendarView.classList.remove('hidden');
        this.calendarView.innerHTML = '';

        plan.forEach(day => {
            const card = document.createElement('div');
            card.className = 'training-day-card';
            if (day.isPast) card.classList.add('day-past');
            if (day.isToday) card.classList.add('day-today');

            const dayNumber = day.date.getDate();

            let statusBadge = '';
            if (day.workout && day.workout.completed) {
                statusBadge = '<span class="status-badge completed">✅ Réalisé</span>';
            } else if (day.workout) {
                statusBadge = '<span class="status-badge planned">📅 Prévu</span>';
            }

            if (day.workout) {
                card.innerHTML = `
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
                        <div class="workout-duration">${day.workout.duration}</div>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="day-header">
                        <span class="day-name">${day.dayName}</span>
                        <span class="day-date">${dayNumber}</span>
                    </div>
                    <div class="workout-details">
                        <span class="workout-type rest">Repos</span>
                        <p class="workout-desc">Récupération complète. Hydratez-vous bien.</p>
                    </div>
                `;
            }

            this.calendarView.appendChild(card);
        });
    }

    showNotification(message) {
        // Simple alert for now, could be a toast
        alert(message);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Handle Tab Switching globally (since it affects this module)
    const trainingTabBtn = document.querySelector('button[data-tab="training-plan"]');

    if (trainingTabBtn) {
        trainingTabBtn.addEventListener('click', () => {
            // Check if manager is already initialized
            if (!window.trainingManager) {
                window.trainingManager = new TrainingManager();
            }
        });
    }

    setupTabNavigation();
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
