// ============================
// Calculateur de Taille de Cadre
// ============================

// Formules de calcul basées sur les standards de l'industrie
const SIZING_CONFIG = {
    road: {
        multiplier: 0.70,
        name: 'Route',
        sizeChart: [
            { max: 49, letter: 'XXS' },
            { max: 51, letter: 'XS' },
            { max: 53, letter: 'S' },
            { max: 55, letter: 'M' },
            { max: 57, letter: 'L' },
            { max: 59, letter: 'XL' },
            { max: Infinity, letter: 'XXL' }
        ],
        tips: [
            { icon: '🎯', text: 'Les cadres route sont mesurés du centre au sommet du tube de selle' },
            { icon: '📐', text: 'Considérez le stack et le reach pour affiner votre position' }
        ]
    },
    tt: {
        multiplier: 0.67,
        name: 'CLM / Triathlon',
        sizeChart: [
            { max: 47, letter: 'XXS' },
            { max: 49, letter: 'XS' },
            { max: 51, letter: 'S' },
            { max: 53, letter: 'M' },
            { max: 55, letter: 'L' },
            { max: 57, letter: 'XL' },
            { max: Infinity, letter: 'XXL' }
        ],
        tips: [
            { icon: '💨', text: 'Les vélos CLM sont plus petits pour une position aérodynamique' },
            { icon: '⚙️', text: 'Le réglage des prolongateurs est crucial pour le confort longue distance' }
        ]
    },
    mountain: {
        multiplier: 0.57,
        name: 'VTT',
        sizeChart: [
            { max: 35, letter: 'XS' },
            { max: 40, letter: 'S' },
            { max: 45, letter: 'M' },
            { max: 50, letter: 'L' },
            { max: 55, letter: 'XL' },
            { max: Infinity, letter: 'XXL' }
        ],
        tips: [
            { icon: '🏔️', text: 'Les tailles VTT sont souvent en pouces ou en S/M/L' },
            { icon: '🛡️', text: 'Un cadre légèrement plus petit offre plus de maniabilité' }
        ]
    },
    gravel: {
        multiplier: 0.685,
        name: 'Gravel',
        sizeChart: [
            { max: 49, letter: 'XXS' },
            { max: 51, letter: 'XS' },
            { max: 53, letter: 'S' },
            { max: 55, letter: 'M' },
            { max: 57, letter: 'L' },
            { max: 59, letter: 'XL' },
            { max: Infinity, letter: 'XXL' }
        ],
        tips: [
            { icon: '🌲', text: 'Les vélos gravel combinent géométrie route et VTT pour plus de polyvalence' },
            { icon: '🔧', text: 'Pensez au passage des pneus lors du choix de la taille' }
        ]
    }
};

// Ajustements selon le niveau (en cm)
const PROFICIENCY_ADJUSTMENTS = {
    beginner: {
        offset: 1,        // Légèrement plus grand pour le confort
        rangeUp: 2,
        rangeDown: 1,
        tips: [
            { icon: '😊', text: 'Un cadre légèrement plus grand offre une position plus droite et confortable' },
            { icon: '✋', text: 'Assurez-vous de pouvoir toucher le sol avec la pointe des pieds en selle' }
        ]
    },
    intermediate: {
        offset: 0,
        rangeUp: 1.5,
        rangeDown: 1.5,
        tips: [
            { icon: '⚖️', text: 'Votre taille offre un équilibre entre confort et efficacité' },
            { icon: '🔄', text: 'Pensez à essayer la taille recommandée et celle en dessous' }
        ]
    },
    advanced: {
        offset: -1,       // Légèrement plus petit pour une position agressive
        rangeUp: 1,
        rangeDown: 2,
        tips: [
            { icon: '🏁', text: 'Un cadre compact permet une position plus aérodynamique' },
            { icon: '📏', text: 'Concentrez-vous sur le stack et le reach pour un positionnement optimal' }
        ]
    }
};

// Éléments DOM
const heightInput = document.getElementById('height');
const inseamInput = document.getElementById('inseam');
const bikeTypeBtns = document.querySelectorAll('.bike-type-btn');
const proficiencyInputs = document.querySelectorAll('input[name="proficiency"]');
const calculateBtn = document.getElementById('calculateBtn');
const resultsPlaceholder = document.getElementById('resultsPlaceholder');
const resultsContent = document.getElementById('resultsContent');
const frameSizeEl = document.getElementById('frameSize');
const sizeLetterEl = document.getElementById('sizeLetter');
const sizeRangeEl = document.getElementById('sizeRange');
const fitTipsEl = document.getElementById('fitTips');

let selectedBikeType = 'road';

// Initialisation de la sélection du type de vélo
bikeTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        bikeTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedBikeType = btn.dataset.type;

        // Recalculer si nous avons déjà des résultats
        if (!resultsContent.classList.contains('hidden')) {
            calculateSize();
        }
    });
});

// Gestionnaire de clic du bouton calculer
calculateBtn.addEventListener('click', calculateSize);

// Calculer aussi avec la touche Entrée
[heightInput, inseamInput].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            calculateSize();
        }
    });
});

// Recalculer au changement de niveau si les résultats sont visibles
proficiencyInputs.forEach(input => {
    input.addEventListener('change', () => {
        if (!resultsContent.classList.contains('hidden')) {
            calculateSize();
        }
    });
});

function calculateSize() {
    const height = parseFloat(heightInput.value);
    const inseam = parseFloat(inseamInput.value);
    const proficiency = document.querySelector('input[name="proficiency"]:checked').value;

    // Validation
    if (!height || !inseam) {
        shakeElement(calculateBtn);
        highlightMissingInputs(height, inseam);
        return;
    }

    if (inseam >= height) {
        alert('L\'entrejambe ne peut pas être supérieur ou égal à la taille. Veuillez vérifier vos mesures.');
        return;
    }

    const bikeConfig = SIZING_CONFIG[selectedBikeType];
    const proficiencyConfig = PROFICIENCY_ADJUSTMENTS[proficiency];

    // Calculer la taille de base
    let baseSize = inseam * bikeConfig.multiplier;

    // Appliquer l'ajustement selon le niveau
    let adjustedSize = baseSize + proficiencyConfig.offset;

    // Arrondir à l'entier le plus proche pour l'affichage
    const recommendedSize = Math.round(adjustedSize);

    // Calculer la plage
    const minSize = Math.round(adjustedSize - proficiencyConfig.rangeDown);
    const maxSize = Math.round(adjustedSize + proficiencyConfig.rangeUp);

    // Déterminer la taille en lettres
    const letterSize = getLetterSize(recommendedSize, bikeConfig.sizeChart);

    // Mettre à jour l'interface
    showResults(recommendedSize, letterSize, minSize, maxSize, bikeConfig, proficiencyConfig);
}

function getLetterSize(size, sizeChart) {
    for (const entry of sizeChart) {
        if (size <= entry.max) {
            return entry.letter;
        }
    }
    return 'XXL';
}

function showResults(size, letter, min, max, bikeConfig, proficiencyConfig) {
    // Masquer le placeholder, afficher les résultats
    resultsPlaceholder.classList.add('hidden');
    resultsContent.classList.remove('hidden');

    // Animer les nombres
    animateValue(frameSizeEl, 0, size, 600);
    sizeLetterEl.textContent = letter;
    sizeRangeEl.textContent = `${min} à ${max} cm`;

    // Construire les conseils
    const allTips = [...bikeConfig.tips, ...proficiencyConfig.tips];
    fitTipsEl.innerHTML = allTips.map(tip => `
        <div class="tip-item">
            <span class="tip-icon">${tip.icon}</span>
            <span class="tip-text">${tip.text}</span>
        </div>
    `).join('');

    // Défiler vers les résultats
    setTimeout(() => {
        document.getElementById('results').scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }, 300);
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + range * easeOut);

        element.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function shakeElement(element) {
    element.style.animation = 'none';
    element.offsetHeight; // Forcer le reflow
    element.style.animation = 'shake 0.5s ease';
}

function highlightMissingInputs(height, inseam) {
    if (!height) {
        heightInput.focus();
        heightInput.style.borderColor = '#e91e63';
        setTimeout(() => heightInput.style.borderColor = '', 2000);
    } else if (!inseam) {
        inseamInput.focus();
        inseamInput.style.borderColor = '#e91e63';
        setTimeout(() => inseamInput.style.borderColor = '', 2000);
    }
}

// Ajouter l'animation shake dynamiquement
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(8px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(style);
