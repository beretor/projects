// ============================
// Plan d'Entrainement - Tour des Flandres
// Date de la course : 5 Avril
// ============================

const TRAINING_PLAN = [
    // Semaine 1 - Base & Force
    { date: '2025-02-11', type: 'recovery', title: 'Récupération Active', description: 'Rouler souple pour faire tourner les jambes.', mywhoosh: 'Free Ride (Zone 1)' },
    { date: '2025-02-12', type: 'key', title: 'Intervalles Seuil', description: '3x10min au seuil (95-100% FTP). Récup 5min.', mywhoosh: 'Threshold > 3x10min FTP' },
    { date: '2025-02-13', type: 'endurance', title: 'Endurance Fondamentale', description: 'Sortie longue à rythme régulier (Zone 2).', mywhoosh: 'Endurance > Classic 60' },
    { date: '2025-02-14', type: 'recovery', title: 'Repos / Stretching', description: 'Journée sans vélo ou yoga.', mywhoosh: '-' },
    { date: '2025-02-15', type: 'key', title: 'Sortie Longue + Bosses', description: '3h avec du dénivelé. Simuler les monts.', mywhoosh: 'World > Belgium > Hilly Route' },
    { date: '2025-02-16', type: 'day-off', title: 'Repos', description: 'Repos complet.', mywhoosh: '-' },

    // Semaine 2 - Intensité & PMA
    { date: '2025-02-17', type: 'recovery', title: 'Récupération Active', description: '1h très souple.', mywhoosh: 'Free Ride (Zone 1)' },
    { date: '2025-02-18', type: 'key', title: 'PMA Courts (30/30)', description: '3 séries de 10x(30s à 120% / 30s récup).', mywhoosh: 'VO2 Max > 30/30s Microbursts' },
    { date: '2025-02-19', type: 'endurance', title: 'Endurance Zone 2', description: '1h30 régulier.', mywhoosh: 'Endurance > Zone 2 Builder' },
    { date: '2025-02-20', type: 'key', title: 'Force Sous-Max', description: 'Montées assis grand plateau, cadence 50-60rpm.', mywhoosh: 'Strength > High Torque Hills' },
    { date: '2025-02-21', type: 'recovery', title: 'Repos', description: 'Repos complet.', mywhoosh: '-' },
    { date: '2025-02-22', type: 'key', title: 'Simulation Course', description: 'Sortie rythmée avec efforts explosifs.', mywhoosh: 'UAE Team Emirates > Race Simulation' },
    { date: '2025-02-23', type: 'day-off', title: 'Repos / Balade famille', description: 'Détente.', mywhoosh: '-' },

    // Semaine 3 - Volume & Seuil
    { date: '2025-02-24', type: 'recovery', title: 'Récupération Active', description: '45min souple.', mywhoosh: 'Free Ride (Zone 1)' },
    { date: '2025-02-25', type: 'key', title: 'Sweetspot', description: '2x20min à 90% FTP.', mywhoosh: 'Sweetspot > 2x20min' },
    { date: '2025-02-26', type: 'endurance', title: 'Endurance', description: '2h Zone 2.', mywhoosh: 'Endurance > Long Ride' },
    { date: '2025-02-27', type: 'key', title: 'Over-Under', description: '3x10min (2min 95% / 1min 105%).', mywhoosh: 'Threshold > Over/Unders' },
    { date: '2025-02-28', type: 'recovery', title: 'Repos', description: 'Repos complet.', mywhoosh: '-' },
    { date: '2025-03-01', type: 'key', title: 'Sortie Longue Endurance', description: '4h Zone 2, tester l\'alimentation.', mywhoosh: 'Sunday Club Ride' },
    { date: '2025-03-02', type: 'day-off', title: 'Repos', description: 'Repos complet.', mywhoosh: '-' },

    // Semaine 4 - Assimilation (Semaine cool)
    { date: '2025-03-03', type: 'recovery', title: 'Récupération', description: '1h souple', mywhoosh: 'Free Ride' },
    { date: '2025-03-04', type: 'endurance', title: 'Vélocité', description: '1h avec sprints 10s.', mywhoosh: 'Cadence Drills' },
    { date: '2025-03-05', type: 'recovery', title: 'Repos', description: 'Repos.', mywhoosh: '-' },
    { date: '2025-03-06', type: 'endurance', title: 'Petit déblocage', description: '1h avec 2-3 efforts seuil 3min.', mywhoosh: 'Opener' },
    { date: '2025-03-07', type: 'recovery', title: 'Repos', description: 'Repos.', mywhoosh: '-' },
    { date: '2025-03-08', type: 'endurance', title: 'Sortie Plaisir', description: '2h sans contrainte.', mywhoosh: 'Social Ride' },
    { date: '2025-03-09', type: 'day-off', title: 'Repos', description: 'Repos.', mywhoosh: '-' },

    // Semaine 5 - Intensité Spécifique Flandrienne
    { date: '2025-03-10', type: 'key', title: 'Force Explosive', description: 'Départs arrêtés et sprints en côte.', mywhoosh: 'Sprint > Power Starts' },
    { date: '2025-03-11', type: 'endurance', title: 'Endurance', description: '1h30 tranquille.', mywhoosh: 'Zone 2' },
    { date: '2025-03-12', type: 'key', title: 'AC / Anaérobie', description: '10x1min à fond / 2min récup.', mywhoosh: 'Anaerobic > 1min Killers' },
    { date: '2025-03-13', type: 'recovery', title: 'Repos', description: 'Stretching.', mywhoosh: '-' },
    { date: '2025-03-14', type: 'key', title: 'Enchaînement Monts', description: 'Sortie vallonnée, monter les bosses au seuil.', mywhoosh: 'Hilly Route' },
    { date: '2025-03-15', type: 'endurance', title: 'Sortie Longue', description: '3h30 Zone 2/3.', mywhoosh: 'Endurance' },
    { date: '2025-03-16', type: 'day-off', title: 'Repos', description: 'Sieste.', mywhoosh: '-' },

    // Semaine 6 - Affûtage (Début)
    { date: '2025-03-17', type: 'recovery', title: 'Récupération Active', description: '45min.', mywhoosh: 'Free Ride' },
    { date: '2025-03-18', type: 'key', title: 'Rappel Seuil', description: '2x15min Seuil.', mywhoosh: 'Threshold > 2x15' },
    { date: '2025-03-19', type: 'endurance', title: 'Endurance', description: '1h30.', mywhoosh: 'Zone 2' },
    { date: '2025-03-20', type: 'key', title: 'PMA Courte', description: '2 séries 8x(40/20).', mywhoosh: 'VO2 Max > 40/20' },
    { date: '2025-03-21', type: 'recovery', title: 'Repos', description: 'Repos complet.', mywhoosh: '-' },
    { date: '2025-03-22', type: 'key', title: 'Dernière Longue', description: '4h avec allure course sur 30min.', mywhoosh: 'Long Ride > Tempo' },
    { date: '2025-03-23', type: 'day-off', title: 'Repos', description: 'Repos.', mywhoosh: '-' },

    // Semaine 7 - Affûtage & Course
    { date: '2025-03-24', type: 'recovery', title: 'Récupération', description: '1h souple.', mywhoosh: 'Free Ride' },
    { date: '2025-03-25', type: 'key', title: 'Rappel Intensité', description: '1h avec 3x3min Pmax.', mywhoosh: 'Openers' },
    { date: '2025-03-26', type: 'endurance', title: 'Sortie Café', description: '1h tranquille.', mywhoosh: 'Coffee Ride' },
    { date: '2025-03-27', type: 'recovery', title: 'Repos', description: 'Repos.', mywhoosh: '-' },
    { date: '2025-03-28', type: 'key', title: 'Déblocage', description: '1h avec 3 sprints et 5min rythme.', mywhoosh: 'Pre-Race Activation' },
    { date: '2025-03-29', type: 'day-off', title: 'Voyage / Repos', description: 'Trajet vers la course.', mywhoosh: '-' },
    { date: '2025-03-30', type: 'race', title: 'TOUR DES FLANDRES', description: 'JOUR J ! Bonne chance 🦁', mywhoosh: '-' },

    // Semaine Post-Course (Récup)
    { date: '2025-03-31', type: 'recovery', title: 'Récupération', description: 'Grasse matinée.', mywhoosh: '-' },
    { date: '2025-04-01', type: 'recovery', title: 'Décrassage', description: '30min très souple si envie.', mywhoosh: 'Free Ride' },
    { date: '2025-04-02', type: 'day-off', title: 'Repos', description: 'Repos.', mywhoosh: '-' },
    { date: '2025-04-03', type: 'endurance', title: 'Reprise', description: '1h plaisir.', mywhoosh: 'Social Ride' },
    { date: '2025-04-04', type: 'recovery', title: 'Repos', description: 'Repos.', mywhoosh: '-' },
    { date: '2025-04-05', type: 'endurance', title: 'Sortie Club', description: 'Rouler avec les amis.', mywhoosh: 'Group Ride' }
];

document.addEventListener('DOMContentLoaded', function () {
    console.log('Training script loaded');
    const tableBody = document.getElementById('trainingTableBody');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    if (tableBody) {
        // Initial Render
        renderTrainingTable('all');
    }

    if (toggleBtns) {
        // Toggle Listeners
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                toggleBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Render with new filter
                const filter = btn.dataset.filter;
                renderTrainingTable(filter);
            });
        });
    }

    function renderTrainingTable(filter) {
        if (!tableBody) return;

        // Filter data
        const filteredData = TRAINING_PLAN.filter(item => {
            if (filter === 'all') return true;
            if (filter === 'key') return item.type === 'key' || item.type === 'race';
            if (filter === 'recovery') return item.type === 'recovery' || item.type === 'day-off';
            return true;
        });

        // Generate HTML
        const today = new Date().toISOString().split('T')[0];

        tableBody.innerHTML = filteredData.map(item => {
            // Format date
            const dateObj = new Date(item.date);
            const dateStr = dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

            // Determine class
            let rowClass = '';
            if (item.date === today) rowClass = 'today';
            if (item.type === 'race') rowClass = 'race-day';

            // Type Label
            const typeLabels = {
                'key': 'Clé',
                'recovery': 'Récup',
                'endurance': 'Fonction',
                'day-off': 'Repos',
                'race': 'COURSE'
            };

            return `
                <tr class="${rowClass} type-${item.type}">
                    <td class="col-date">${dateStr}</td>
                    <td class="col-type"><span class="badge ${item.type}">${typeLabels[item.type] || item.type}</span></td>
                    <td class="col-session">
                        <strong>${item.title}</strong>
                        <p>${item.description}</p>
                    </td>
                    <td class="col-whoosh">${item.mywhoosh !== '-' ? `⚡ ${item.mywhoosh}` : '-'}</td>
                </tr>
            `;
        }).join('');
    }
});
