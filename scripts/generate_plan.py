import datetime
import json
import os
import sys

# Configuration
RACE_DATE = datetime.date(2026, 4, 5)
START_DATE = datetime.date(2026, 1, 1) # Or today
TRAINING_DAYS = [1, 2, 4, 6] # Mon, Tue, Thu, Sat (0=Mon, 6=Sun)

def get_week_number(date):
    return date.isocalendar()[1]

def get_phase(current_date):
    weeks_until_race = (RACE_DATE - current_date).days // 7
    if weeks_until_race <= 2:
        return 'TAPER'
    elif weeks_until_race <= 6:
        return 'PEAK'
    elif weeks_until_race <= 10:
        return 'BUILD'
    else:
        return 'BASE'

def get_workout_for_day(day_index, phase):
    # Returns (title, description, duration_seconds, steps_definition)
    
    # Weekend Long Ride (Sun or Sat) -> Sat is 5, Sun is 6. JS used 0 (Sun) and 6 (Sat).
    # Python datetime.weekday(): Mon=0, Sun=6.
    # JS getDay(): Sun=0, Sat=6.
    # My TRAINING_DAYS uses Python convention? 
    # Let's align with JS logic: JS says "if dayIndex === 0 || dayIndex === 6" (Sat/Sun).
    # In Python weekday(): Sat=5, Sun=6.
    
    if day_index == 5 or day_index == 6: # Weekend
        if phase == 'BUILD':
            return "Sortie Longue - Endurance + Tempo", "Endurance avec 3x15min tempo (Z3).", 12600, [
                {"type": "warmup", "duration": "20:00", "target": "ZONE_2"},
                {"type": "repeat", "count": 3, "steps": [
                    {"type": "interval", "duration": "15:00", "target": "ZONE_3"},
                    {"type": "recovery", "duration": "5:00", "target": "ZONE_1"}
                ]},
                {"type": "cooldown", "duration": "10:00", "target": "ZONE_2"}
            ]
        elif phase == 'PEAK':
             return "Sortie Flandrienne", "Simulation course. Bosses courtes à haute intensité.", 14400, [
                {"type": "warmup", "duration": "30:00", "target": "ZONE_2"},
                {"type": "repeat", "count": 10, "steps": [ # Simulating hills
                    {"type": "interval", "duration": "1:00", "target": "ZONE_5"},
                    {"type": "recovery", "duration": "5:00", "target": "ZONE_2"}
                ]},
                {"type": "cooldown", "duration": "30:00", "target": "ZONE_2"}
            ]
        elif phase == 'TAPER':
            return "Maintien", "Sortie souple + quelques accélérations.", 7200, [
                {"type": "warmup", "duration": "15:00", "target": "ZONE_2"},
                 {"type": "repeat", "count": 4, "steps": [
                    {"type": "interval", "duration": "0:30", "target": "ZONE_5"},
                    {"type": "recovery", "duration": "4:30", "target": "ZONE_1"}
                ]},
                {"type": "cooldown", "duration": "10:00", "target": "ZONE_2"}
            ]
        else: # BASE
            return "Sortie Longue - Endurance", "Endurance fondamentale (Z2).", 10800, [
                {"type": "warmup", "duration": "10:00", "target": "ZONE_1"},
                {"type": "interval", "duration": "160:00", "target": "ZONE_2"}, # ~2h40
                {"type": "cooldown", "duration": "10:00", "target": "ZONE_1"}
            ]

    # Weekday Intervals (Tue/Thu -> 1/3)
    # JS: Tue(2), Thu(4). JS Sunday=0. So Tue=2, Thu=4.
    # Python: Tue=1, Thu=3.
    elif day_index == 1 or day_index == 3:
        if phase == 'BASE':
             return "Vélocité / Force", "Travail de cadence (100rpm+) ou force (50rpm) en Z3.", 4500, [
                {"type": "warmup", "duration": "15:00", "target": "ZONE_1"},
                {"type": "interval", "duration": "10:00", "target": "ZONE_3", "description": "Cadence haute"},
                {"type": "recovery", "duration": "5:00", "target": "ZONE_1"},
                {"type": "interval", "duration": "10:00", "target": "ZONE_3", "description": "Force basse cadence"},
                {"type": "cooldown", "duration": "15:00", "target": "ZONE_1"}
            ]
        elif phase == 'BUILD':
            return "Seuil (Z4)", "2 x 15min au seuil anaérobie.", 5400, [
                {"type": "warmup", "duration": "15:00", "target": "ZONE_1"},
                {"type": "repeat", "count": 2, "steps": [
                    {"type": "interval", "duration": "15:00", "target": "ZONE_4"},
                    {"type": "recovery", "duration": "5:00", "target": "ZONE_1"}
                ]},
                {"type": "cooldown", "duration": "15:00", "target": "ZONE_1"}
            ]
        elif phase == 'PEAK':
             return "PMA / VO2 Max", "3 séries de (30s/30s) x 10.", 4500, [
                 {"type": "warmup", "duration": "15:00", "target": "ZONE_1"},
                 {"type": "repeat", "count": 3, "steps": [
                     {"type": "repeat", "count": 10, "steps": [
                         {"type": "interval", "duration": "0:30", "target": "ZONE_5"},
                         {"type": "recovery", "duration": "0:30", "target": "ZONE_1"}
                     ]},
                     {"type": "recovery", "duration": "5:00", "target": "ZONE_1"}
                 ]},
                 {"type": "cooldown", "duration": "10:00", "target": "ZONE_1"}
             ]
        else: # TAPER
            return "Rappels d'intensité", "2 x 5min au seuil.", 3600, [
                {"type": "warmup", "duration": "15:00", "target": "ZONE_1"},
                {"type": "repeat", "count": 2, "steps": [
                    {"type": "interval", "duration": "5:00", "target": "ZONE_4"},
                    {"type": "recovery", "duration": "5:00", "target": "ZONE_1"}
                ]},
                {"type": "cooldown", "duration": "10:00", "target": "ZONE_1"}
            ]

    # Other days (Rest/Easy)
    return "Récupération", "Zone 1-2 souple.", 3600, [
        {"type": "run", "duration": "60:00", "target": "ZONE_1"}
    ]


def generate_schedule():
    plan = []
    current_date = max(datetime.date.today(), START_DATE)
    
    while current_date <= RACE_DATE:
        if current_date == RACE_DATE:
             plan.append({
                "date": current_date.isoformat(),
                "title": "TOUR DES FLANDRES 2026",
                "description": "Race Day!",
                "steps": [], # No workout steps for race
                "is_race": True
            })
        elif current_date.weekday() in TRAINING_DAYS:
            phase = get_phase(current_date)
            # Map Python weekday to logic inputs if needed, but we used python weekday in function
            title, desc, dur, steps = get_workout_for_day(current_date.weekday(), phase)
            
            plan.append({
                "date": current_date.isoformat(),
                "title": title,
                "description": desc,
                "steps": steps,
                "is_race": False
            })
        
        current_date += datetime.timedelta(days=1)
    
    return plan

if __name__ == "__main__":
    plan = generate_schedule()
    print(json.dumps(plan, indent=2))
