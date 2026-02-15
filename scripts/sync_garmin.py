import json
import os
import sys
import time
from datetime import datetime, timedelta
from garminconnect import Garmin
from generate_plan import generate_schedule

# Configure
SPORT_TYPE = {"sportTypeId": 2, "sportTypeKey": "cycling"} # Tour des Flandres = Cycling

# Maps
STEP_TYPES = {
    "warmup": {"stepTypeId": 1, "stepTypeKey": "warmup"},
    "cooldown": {"stepTypeId": 2, "stepTypeKey": "cooldown"},
    "interval": {"stepTypeId": 3, "stepTypeKey": "interval"},
    "recovery": {"stepTypeId": 4, "stepTypeKey": "recovery"},
    "rest": {"stepTypeId": 5, "stepTypeKey": "rest"},
    "run": {"stepTypeId": 3, "stepTypeKey": "interval"}, # Mapping run to interval for generic use
    "bike": {"stepTypeId": 3, "stepTypeKey": "interval"},
}

CONDITION_TYPES = {
    "time": {"conditionTypeId": 2, "conditionTypeKey": "time"},
    "distance": {"conditionTypeId": 3, "conditionTypeKey": "distance"},
    "lap_button": {"conditionTypeId": 1, "conditionTypeKey": "lap.button"},
}

TARGET_TYPES = {
    "no_target": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target"},
    "power_zone": {"workoutTargetTypeId": 4, "workoutTargetTypeKey": "power.zone"},
    "hr_zone": {"workoutTargetTypeId": 2, "workoutTargetTypeKey": "heart.rate.zone"},
}

def build_workout_payload(workout_plan):
    """Build a Garmin-compatible workout payload."""
    steps = []
    step_order = [1]  # Use list to allow mutation in nested function
    
    def add_steps(step_defs):
        for step_def in step_defs:
            if step_def['type'] == 'repeat':
                # Build nested steps for the repeat group
                nested_steps = []
                nested_order = 1
                for substep in step_def['steps']:
                    # Handle nested repeats (e.g., 3 sets of 10x30/30)
                    if substep['type'] == 'repeat':
                        inner_nested = []
                        inner_order = 1
                        for inner_step in substep['steps']:
                            inner_nested.append(create_step_dto(inner_step, inner_order))
                            inner_order += 1
                        nested_steps.append({
                            "type": "RepeatGroupDTO",
                            "stepOrder": nested_order,
                            "numberOfIterations": substep['count'],
                            "workoutSteps": inner_nested
                        })
                    else:
                        nested_steps.append(create_step_dto(substep, nested_order))
                    nested_order += 1
                
                repeat_step = {
                    "type": "RepeatGroupDTO",
                    "stepOrder": step_order[0],
                    "numberOfIterations": step_def['count'],
                    "workoutSteps": nested_steps
                }
                steps.append(repeat_step)
            else:
                steps.append(create_step_dto(step_def, step_order[0]))
            step_order[0] += 1
    
    add_steps(workout_plan['steps'])

    return {
        "workoutName": workout_plan['title'],
        "sportType": SPORT_TYPE,
        "workoutSegments": [{
            "segmentOrder": 1,
            "sportType": SPORT_TYPE,
            "workoutSteps": steps
        }],
        "description": workout_plan.get('description', '')
    }

def create_step_dto(step_def, order):
    # Determine basic types
    s_type = STEP_TYPES.get(step_def['type'], STEP_TYPES['interval'])
    
    # Condition (Duration vs Distance vs Open)
    if 'duration' in step_def:
        # duration in "MM:SS" or "HH:MM:SS" or seconds?
        # generate_plan.py output seems to be "MM:SS" strings based on my review
        # need to parse to seconds.
        seconds = parse_duration(step_def['duration'])
        condition = CONDITION_TYPES['time']
        condition_value = float(seconds)
    else:
        # Default to lap button if no duration?
        condition = CONDITION_TYPES['lap_button']
        condition_value = None

    # Target
    target = TARGET_TYPES['no_target']
    target_value_one = None
    target_value_two = None
    zone_number = None
    
    if 'target' in step_def:
        t = step_def['target']
        if t.startswith('ZONE_'):
            # Assuming Power Zone for cycling? Or HR?
            # Let's use Heart Rate Zone as safer default for general users, 
            # or Power if they have a meter. JS plan mentioned "rpm", "force", "seuil".
            # "Seuil (Z4)" -> usually HR or Power.
            # I'll default to Heart Rate Zone.
            target = TARGET_TYPES['hr_zone']
            zone_number = int(t.replace('ZONE_', ''))
    
    dto = {
        "type": "ExecutableStepDTO",
        "stepOrder": order,
        "stepType": s_type,
        "endCondition": condition,
        "targetType": target
    }
    
    if condition_value is not None:
        dto['endConditionValue'] = condition_value
        
    if zone_number is not None:
        dto['zoneNumber'] = zone_number
        
    if 'description' in step_def:
        dto['description'] = step_def['description']
        
    return dto

def parse_duration(dur_str):
    parts = list(map(int, dur_str.split(':')))
    if len(parts) == 2:
        return parts[0]*60 + parts[1]
    elif len(parts) == 3:
        return parts[0]*3600 + parts[1]*60 + parts[2]
    return 0

def init_garmin():
    try:
        print("Attempting login with stored tokens...")
        token_path_mcp = os.path.expanduser("~/.garminconnect")
        token_path_garth = os.path.expanduser("~/.garth")
        
        token_path = None
        if os.path.exists(token_path_mcp):
            token_path = token_path_mcp
        elif os.path.exists(token_path_garth):
            token_path = token_path_garth
            
        if token_path:
             print(f"Using tokens from {token_path}")
             client = Garmin()
             client.login(token_path)
             return client
        else:
            print(f"Token directories ({token_path_mcp}, {token_path_garth}) not found.")
            return None
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def main():
    print("Generating Plan...")
    plan = generate_schedule()
    print(f"Generated {len(plan)} days.")
    
    # Filter for future workouts only, excluding Vélotaf
    future_workouts = [
        d for d in plan 
        if not d['is_race'] 
        and d['steps'] 
        and datetime.fromisoformat(d['date']) >= datetime.now()
        and "Vélotaf" not in d['title']
    ]
    print(f"Found {len(future_workouts)} future workouts to sync.")
    
    client = init_garmin()
    if not client:
        print("Could not authenticate. Please run 'garmin-mcp-auth' first.")
        sys.exit(1)
        
    print("Authenticated successfully.")
    
    for workout in future_workouts:
        print(f"Syncing {workout['date']}: {workout['title']}...")
        
        payload = build_workout_payload(workout)
        
        # Add date to title to make it unique/identifiable? 
        # Garmin workouts are library items, usually added to calendar.
        # Flow: Create Workout -> Get ID -> Schedule Workout.
        # This script creates a NEW workout in the library for every session. 
        # This might clutter the library.
        # Valid strategy: Check if workout with same name exists? 
        # But 'Seuil (Z4)' repeats.
        # Better: Create distinct workouts "TdF 2026 - Date - Title"
        
        payload['workoutName'] = f"{workout['date']} - {workout['title']}"
        
        try:
            # 1. Upload (Create) Workout
            res = client.upload_workout(payload)
            workout_id = res['workoutId']
            print(f"  Created Workout ID: {workout_id}")
            
            # 2. Schedule it
            # client.schedule_workout(workout_id, workout['date'])
            # 'garminconnect' has schedule_workout? garmin-mcp implemented it manually using garth.post.
            # I'll assume garminconnect has it or use garth directly.
            # Checking dir(client) is hard.
            # I'll try client.schedule_workout. If missing, I'll use client.garth.post
            
            try:
                client.schedule_workout(workout_id, workout['date'])
                print("  Scheduled to Calendar.")
            except AttributeError:
                # Fallback
                url = f"workout-service/schedule/{workout_id}"
                client.garth.post("connectapi", url, json={"date": workout['date']})
                print("  Scheduled (via fallback).")

        except Exception as e:
            print(f"  Failed: {e}")
        
        time.sleep(1) # Rate limit kindness

if __name__ == "__main__":
    main()
