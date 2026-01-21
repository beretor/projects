// ============================
// Calculateur de Pression des Pneus
// Algorithme précis basé sur les formules de Frank Berto
// et les recherches de SRAM/Zipp
// ============================

// Configuration par type de vélo
const PRESSURE_CONFIG = {
    road: {
        name: 'Route',
        minWidth: 23,
        maxWidth: 32,
        baseMultiplier: 1.0,
        frontRearRatio: 0.42, // 42% du poids sur l'avant
        minPressure: 4.5,
        maxPressure: 8.5,
        tips: [
            { icon: '🚴', text: 'Pour la route, une pression plus élevée réduit la résistance au roulement sur bitume lisse' },
            { icon: '⚡', text: 'Descendez de 0.2-0.3 bar sur routes abîmées pour plus de confort' }
        ]
    },
    gravel: {
        name: 'Gravel',
        minWidth: 32,
        maxWidth: 50,
        baseMultiplier: 0.85,
        frontRearRatio: 0.45,
        minPressure: 2.0,
        maxPressure: 5.0,
        tips: [
            { icon: '🌲', text: 'En gravel, une pression basse améliore l\'adhérence et le confort' },
            { icon: '🔄', text: 'Ajustez selon le terrain : +0.3 bar pour le tarmac, -0.3 bar pour les chemins' }
        ]
    },
    mtb: {
        name: 'VTT',
        minWidth: 50,
        maxWidth: 100,
        baseMultiplier: 0.70,
        frontRearRatio: 0.45,
        minPressure: 1.2,
        maxPressure: 3.0,
        tips: [
            { icon: '🏔️', text: 'En VTT, privilégiez une pression basse pour maximiser l\'adhérence' },
            { icon: '🛡️', text: 'Attention aux pincements : ne descendez pas en dessous de 1.5 bar avec chambre' }
        ]
    },
    city: {
        name: 'Ville',
        minWidth: 28,
        maxWidth: 50,
        baseMultiplier: 0.95,
        frontRearRatio: 0.40,
        minPressure: 3.0,
        maxPressure: 6.0,
        tips: [
            { icon: '🏙️', text: 'En ville, une pression moyenne offre un bon compromis confort/efficacité' },
            { icon: '💡', text: 'Montez légèrement la pression si vous transportez des charges' }
        ]
    }
};

// Ajustements selon le type de pneu/jante
const TIRE_TYPE_ADJUSTMENTS = {
    clincher: {
        name: 'Chambre à air',
        multiplier: 1.0,
        minOffset: 0.3,
        maxPressureLimit: null,
        tips: [
            { icon: '⚠️', text: 'Avec chambre, ne descendez pas trop bas pour éviter les crevaisons par pincement' }
        ]
    },
    tubeless: {
        name: 'Tubeless Hooked',
        multiplier: 0.92,
        minOffset: 0,
        maxPressureLimit: null,
        tips: [
            { icon: '✨', text: 'Le tubeless permet de rouler 5-10% plus bas sans risque de pincement' },
            { icon: '💧', text: 'Vérifiez le niveau de préventif tous les 2-3 mois' }
        ]
    },
    tubeless_hookless: {
        name: 'Tubeless Hookless',
        multiplier: 0.90,
        minOffset: 0,
        maxPressureLimit: 5.0, // Limite ETRTO pour hookless
        tips: [
            { icon: '🔒', text: 'Jantes hookless : pression maximum 5 bar (73 psi) selon norme ETRTO' },
            { icon: '📏', text: 'Respectez les largeurs de pneus compatibles avec vos jantes hookless' },
            { icon: '⚠️', text: 'Ne jamais dépasser la pression max sous peine de déjantage' }
        ]
    },
    tubular: {
        name: 'Boyau',
        multiplier: 0.95,
        minOffset: 0.2,
        maxPressureLimit: null,
        tips: [
            { icon: '🏆', text: 'Les boyaux offrent une excellente qualité de roulage et adhérence' }
        ]
    }
};

// Ajustements selon les conditions
const CONDITIONS_ADJUSTMENTS = {
    dry: {
        name: 'Sec',
        multiplier: 1.0,
        tips: []
    },
    mixed: {
        name: 'Mixte',
        multiplier: 0.95,
        tips: [
            { icon: '💧', text: 'Sur routes humides, une pression légèrement réduite améliore l\'adhérence' }
        ]
    },
    wet: {
        name: 'Mouillé',
        multiplier: 0.90,
        tips: [
            { icon: '🌧️', text: 'Par temps de pluie ou sur terrain meuble, réduisez la pression de 10%' },
            { icon: '🔒', text: 'Soyez prudent dans les virages, l\'adhérence est réduite' }
        ]
    }
};

// ============================
// Formule de calcul de pression
// Approche révisée: calcul basé sur poids total puis ajustement avant/arrière
// ============================
function calculateTirePressure(totalWeight, frontWidth, rearWidth, bikeType, tireType, conditions) {
    const config = PRESSURE_CONFIG[bikeType];
    const tireConfig = TIRE_TYPE_ADJUSTMENTS[tireType];
    const condConfig = CONDITIONS_ADJUSTMENTS[conditions];

    // Calcul de la pression pour chaque roue avec sa largeur spécifique
    // Nous utilisons un ratio "amorti" pour la pression car le ratio de poids pur (ex: 40/60)
    // donnerait des écarts de pression trop importants (ex: 1.5 bar) jugés "délirants" par les cyclistes.
    // On lisse le ratio vers 50/50 pour obtenir un écart typique de 0.3-0.5 bar.

    // Amortissement du ratio vers 0.5 (moyenne entre ratio réel et 50/50)
    // Facteurs 0.3/0.7 ajustés pour obtenir un delta de ~0.5-0.6 bar typique
    const dampenedRatio = config.frontRearRatio * 0.3 + 0.5 * 0.7;

    const basePressureFront = calculateBasePressure(totalWeight, frontWidth, dampenedRatio);
    const basePressureRear = calculateBasePressure(totalWeight, rearWidth, 1 - dampenedRatio);

    // Application des multiplicateurs
    let frontPressure = basePressureFront * config.baseMultiplier * tireConfig.multiplier * condConfig.multiplier;
    let rearPressure = basePressureRear * config.baseMultiplier * tireConfig.multiplier * condConfig.multiplier;

    // Application des limites min/max
    const minPressure = config.minPressure + tireConfig.minOffset;
    let maxPressure = config.maxPressure;

    // Pour hookless, appliquer la limite de pression ETRTO
    if (tireConfig.maxPressureLimit) {
        maxPressure = Math.min(maxPressure, tireConfig.maxPressureLimit);
    }

    frontPressure = Math.max(minPressure, Math.min(maxPressure, frontPressure));
    rearPressure = Math.max(minPressure, Math.min(maxPressure, rearPressure));

    return {
        front: Math.round(frontPressure * 10) / 10,
        rear: Math.round(rearPressure * 10) / 10,
        minRange: Math.round((Math.min(frontPressure, rearPressure) - 0.3) * 10) / 10,
        maxRange: Math.round((Math.max(frontPressure, rearPressure) + 0.3) * 10) / 10,
        maxPressureLimit: tireConfig.maxPressureLimit,
        config: config,
        tireConfig: tireConfig,
        condConfig: condConfig
    };
}

// Formule de calcul de pression révisée
// Basée sur les recommandations SRAM/Zipp et Silca
function calculateBasePressure(totalWeight, tireWidth, weightRatio) {
    // Pression de référence pour 80kg sur pneu 28mm = ~6.5 bar arrière
    // Cette formule donne des résultats cohérents avec les calculateurs pro

    // Charge sur cette roue
    const wheelLoad = totalWeight * weightRatio;

    // Formule simplifiée et linéaire:
    // P = baseReference * (charge / chargeRef) * (largeurRef / largeur)^0.8
    const referenceLoad = 45; // kg de référence (environ 55% de 80kg)
    const referenceWidth = 28; // mm de référence
    const referencePressure = 6.5; // bar de référence

    // Facteur de charge (linéaire pour éviter les écarts excessifs)
    const loadFactor = wheelLoad / referenceLoad;

    // Facteur de largeur (la pression diminue avec la largeur)
    // Exposant réduit à 0.8 pour des écarts plus réalistes
    const widthFactor = Math.pow(referenceWidth / tireWidth, 0.8);

    let pressure = referencePressure * loadFactor * widthFactor;

    // Ajustements pour pneus larges (>32mm = gravel/VTT)
    if (tireWidth >= 50) {
        pressure *= 0.75; // VTT: beaucoup moins de pression
    } else if (tireWidth >= 40) {
        pressure *= 0.85; // Gravel large
    } else if (tireWidth >= 35) {
        pressure *= 0.90; // Gravel
    }

    return pressure;
}

function barToPsi(bar) {
    return Math.round(bar * 14.504);
}

// ============================
// Initialisation DOM
// ============================
document.addEventListener('DOMContentLoaded', function () {
    // Tab navigation
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });

    // DOM Elements for pressure calculator
    const riderWeightInput = document.getElementById('riderWeight');
    const clothingWeightInput = document.getElementById('clothingWeight');
    const bikeWeightInput = document.getElementById('bikeWeight');
    const tireWidthFrontInput = document.getElementById('tireWidthFront');
    const tireWidthRearInput = document.getElementById('tireWidthRear');
    const syncTireWidthsCheckbox = document.getElementById('syncTireWidths');
    const bikeTypePressureBtns = document.querySelectorAll('.bike-type-btn-pressure');
    const tireTypeInputs = document.querySelectorAll('input[name="tireType"]');
    const conditionsInputs = document.querySelectorAll('input[name="conditions"]');
    const calculatePressureBtn = document.getElementById('calculatePressureBtn');

    let selectedBikeTypePressure = 'road';

    // Weight example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const weight = parseFloat(btn.dataset.weight);
            const targetId = btn.dataset.target;
            const targetInput = document.getElementById(targetId);
            if (targetInput) {
                targetInput.value = weight;
                // Update active state
                btn.parentElement.querySelectorAll('.example-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Bike type selection for pressure
    bikeTypePressureBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            bikeTypePressureBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedBikeTypePressure = btn.dataset.type;
            updateTirePresetsForBikeType(selectedBikeTypePressure);
            recalculateIfResultsVisible();
        });
    });

    // Sync tire widths
    if (tireWidthFrontInput && tireWidthRearInput && syncTireWidthsCheckbox) {
        tireWidthFrontInput.addEventListener('input', () => {
            if (syncTireWidthsCheckbox.checked) {
                tireWidthRearInput.value = tireWidthFrontInput.value;
            }
            updateMiniPresetStates();
        });

        tireWidthRearInput.addEventListener('input', () => {
            if (syncTireWidthsCheckbox.checked) {
                tireWidthFrontInput.value = tireWidthRearInput.value;
            }
            updateMiniPresetStates();
        });
    }

    // Mini preset buttons
    document.querySelectorAll('.mini-presets').forEach(container => {
        container.querySelectorAll('.mini-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const width = btn.dataset.width;
                const targetId = container.dataset.target;
                const targetInput = document.getElementById(targetId);
                if (targetInput) {
                    targetInput.value = width;
                    if (syncTireWidthsCheckbox && syncTireWidthsCheckbox.checked) {
                        tireWidthFrontInput.value = width;
                        tireWidthRearInput.value = width;
                    }
                    updateMiniPresetStates();
                    recalculateIfResultsVisible();
                }
            });
        });
    });

    // Tire preset buttons (front/rear combinations)
    const tirePresetContainer = document.getElementById('tirePresetButtons');
    if (tirePresetContainer) {
        tirePresetContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.preset-btn');
            if (btn) {
                const front = btn.dataset.front;
                const rear = btn.dataset.rear;
                if (tireWidthFrontInput) tireWidthFrontInput.value = front;
                if (tireWidthRearInput) tireWidthRearInput.value = rear;

                // Update checkbox based on whether front/rear match
                if (syncTireWidthsCheckbox) {
                    syncTireWidthsCheckbox.checked = (front === rear);
                }

                // Update active states
                tirePresetContainer.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                updateMiniPresetStates();
                recalculateIfResultsVisible();
            }
        });
    }

    function updateMiniPresetStates() {
        // Update front presets
        const frontContainer = document.querySelector('.mini-presets[data-target="tireWidthFront"]');
        const rearContainer = document.querySelector('.mini-presets[data-target="tireWidthRear"]');

        if (frontContainer && tireWidthFrontInput) {
            frontContainer.querySelectorAll('.mini-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.width === tireWidthFrontInput.value);
            });
        }
        if (rearContainer && tireWidthRearInput) {
            rearContainer.querySelectorAll('.mini-preset-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.width === tireWidthRearInput.value);
            });
        }
    }

    function updateTirePresetsForBikeType(bikeType) {
        const presets = {
            road: [
                { front: 25, rear: 25 },
                { front: 28, rear: 28 },
                { front: 28, rear: 30 },
                { front: 30, rear: 32 },
                { front: 32, rear: 32 }
            ],
            gravel: [
                { front: 38, rear: 40 },
                { front: 40, rear: 42 },
                { front: 42, rear: 42 },
                { front: 45, rear: 45 },
                { front: 50, rear: 50 }
            ],
            mtb: [
                { front: 55, rear: 55 },
                { front: 58, rear: 58 },
                { front: 60, rear: 60 },
                { front: 65, rear: 65 },
                { front: 70, rear: 70 }
            ],
            city: [
                { front: 32, rear: 32 },
                { front: 35, rear: 35 },
                { front: 40, rear: 40 },
                { front: 42, rear: 42 },
                { front: 47, rear: 47 }
            ]
        };

        const miniPresets = {
            road: [25, 28, 32],
            gravel: [38, 42, 45],
            mtb: [55, 60, 70],
            city: [32, 40, 47]
        };

        // Update combo presets
        if (tirePresetContainer) {
            const config = presets[bikeType] || presets.road;
            tirePresetContainer.innerHTML = config.map((p, i) =>
                `<button class="preset-btn${i === 1 ? ' active' : ''}" data-front="${p.front}" data-rear="${p.rear}">${p.front}/${p.rear}</button>`
            ).join('');

            // Set default values
            if (tireWidthFrontInput) tireWidthFrontInput.value = config[1].front;
            if (tireWidthRearInput) tireWidthRearInput.value = config[1].rear;
        }

        // Update mini presets
        const miniConfig = miniPresets[bikeType] || miniPresets.road;
        document.querySelectorAll('.mini-presets').forEach(container => {
            container.innerHTML = miniConfig.map((w, i) =>
                `<button class="mini-preset-btn${i === 1 ? ' active' : ''}" data-width="${w}">${w}</button>`
            ).join('');
        });

        // Re-attach mini preset listeners
        document.querySelectorAll('.mini-presets').forEach(container => {
            container.querySelectorAll('.mini-preset-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const width = btn.dataset.width;
                    const targetId = container.dataset.target;
                    const targetInput = document.getElementById(targetId);
                    if (targetInput) {
                        targetInput.value = width;
                        if (syncTireWidthsCheckbox && syncTireWidthsCheckbox.checked) {
                            tireWidthFrontInput.value = width;
                            tireWidthRearInput.value = width;
                        }
                        updateMiniPresetStates();
                        recalculateIfResultsVisible();
                    }
                });
            });
        });
    }

    // Recalculate on option changes
    [...(tireTypeInputs || []), ...(conditionsInputs || [])].forEach(input => {
        input.addEventListener('change', recalculateIfResultsVisible);
    });

    // Calculate button
    if (calculatePressureBtn) {
        calculatePressureBtn.addEventListener('click', calculatePressure);
    }

    // Enter key triggers calculation
    [riderWeightInput, clothingWeightInput, bikeWeightInput, tireWidthFrontInput, tireWidthRearInput].forEach(input => {
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') calculatePressure();
            });
        }
    });

    function recalculateIfResultsVisible() {
        const pressureContent = document.getElementById('pressureContent');
        if (pressureContent && !pressureContent.classList.contains('hidden')) {
            calculatePressure();
        }
    }

    function calculatePressure() {
        const riderWeight = parseFloat(riderWeightInput?.value) || 0;
        const clothingWeight = parseFloat(clothingWeightInput?.value) || 1.5;
        const bikeWeight = parseFloat(bikeWeightInput?.value) || 8;
        const frontWidth = parseFloat(tireWidthFrontInput?.value) || 28;
        const rearWidth = parseFloat(tireWidthRearInput?.value) || 28;
        const tireType = document.querySelector('input[name="tireType"]:checked')?.value || 'clincher';
        const conditions = document.querySelector('input[name="conditions"]:checked')?.value || 'dry';

        // Validation
        if (!riderWeight) {
            shakeButton(calculatePressureBtn);
            if (riderWeightInput) {
                riderWeightInput.focus();
                riderWeightInput.style.borderColor = '#e91e63';
                setTimeout(() => riderWeightInput.style.borderColor = '', 2000);
            }
            return;
        }

        const totalWeight = riderWeight + clothingWeight + bikeWeight;

        // Calculate
        const result = calculateTirePressure(
            totalWeight,
            frontWidth,
            rearWidth,
            selectedBikeTypePressure,
            tireType,
            conditions
        );

        showPressureResults(result, totalWeight);
    }

    function showPressureResults(result, totalWeight) {
        const placeholder = document.getElementById('pressurePlaceholder');
        const content = document.getElementById('pressureContent');

        if (placeholder) placeholder.classList.add('hidden');
        if (content) content.classList.remove('hidden');

        const frontEl = document.getElementById('frontPressure');
        const rearEl = document.getElementById('rearPressure');
        const frontPsiEl = document.getElementById('frontPressurePsi');
        const rearPsiEl = document.getElementById('rearPressurePsi');
        const rangeEl = document.getElementById('pressureRange');
        const tipsEl = document.getElementById('pressureTips');

        if (frontEl) animatePressureValue(frontEl, result.front);
        if (rearEl) animatePressureValue(rearEl, result.rear);
        if (frontPsiEl) frontPsiEl.textContent = `${barToPsi(result.front)} psi`;
        if (rearPsiEl) rearPsiEl.textContent = `${barToPsi(result.rear)} psi`;

        // Show range with hookless warning if applicable
        let rangeText = `${result.minRange} à ${result.maxRange} bar`;
        if (result.maxPressureLimit) {
            rangeText += ` (max ${result.maxPressureLimit} bar hookless)`;
        }
        if (rangeEl) rangeEl.textContent = rangeText;

        // Build tips with total weight info
        if (tipsEl) {
            const weightTip = {
                icon: '⚖️',
                text: `Poids total calculé : ${Math.round(totalWeight)} kg (cycliste + vêtements + vélo)`
            };
            const allTips = [
                weightTip,
                ...result.config.tips,
                ...result.tireConfig.tips,
                ...result.condConfig.tips
            ];

            tipsEl.innerHTML = allTips.map(tip => `
                <div class="tip-item">
                    <span class="tip-icon">${tip.icon}</span>
                    <span class="tip-text">${tip.text}</span>
                </div>
            `).join('');
        }

        // Scroll to results
        setTimeout(() => {
            const resultsSection = document.getElementById('pressureResults');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
    }

    function animatePressureValue(element, targetValue) {
        const duration = 600;
        const startTime = performance.now();
        const startValue = parseFloat(element.textContent) || 0;
        const range = targetValue - startValue;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = startValue + range * easeOut;
            element.textContent = current.toFixed(1);
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    function shakeButton(btn) {
        if (btn) {
            btn.style.animation = 'none';
            btn.offsetHeight;
            btn.style.animation = 'shake 0.5s ease';
        }
    }
});
