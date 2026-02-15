import json
import os
import time
from datetime import datetime
from garminconnect import Garmin

# Configure
SPORT_TYPE = {"sportTypeId": 2, "sportTypeKey": "cycling"}

# Maps
STEP_TYPES = {
    "warmup": {"stepTypeId": 1, "stepTypeKey": "warmup"},
    "cooldown": {"stepTypeId": 2, "stepTypeKey": "cooldown"},
    "interval": {"stepTypeId": 3, "stepTypeKey": "interval"},
    "recovery": {"stepTypeId": 4, "stepTypeKey": "recovery"},
    "rest": {"stepTypeId": 5, "stepTypeKey": "rest"},
    "run": {"stepTypeId": 3, "stepTypeKey": "interval"},
    "ride": {"stepTypeId": 3, "stepTypeKey": "interval"},
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

def parse_duration(dur_str):
    if not isinstance(dur_str, str):
        return 0
    parts = list(map(int, dur_str.split(':')))
    if len(parts) == 2:
        return parts[0]*60 + parts[1]
    elif len(parts) == 3:
        return parts[0]*3600 + parts[1]*60 + parts[2]
    return 0

def create_step_dto(step_def, order):
    s_type = STEP_TYPES.get(step_def.get('type'), STEP_TYPES['interval'])
    
    if 'duration' in step_def:
        seconds = parse_duration(step_def['duration'])
        condition = CONDITION_TYPES['time']
        condition_value = float(seconds)
    else:
        condition = CONDITION_TYPES['lap_button']
        condition_value = None

    target = TARGET_TYPES['no_target']
    zone_number = None
    
    if 'target' in step_def:
        t = step_def['target']
        if t.startswith('ZONE_'):
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

def build_workout_payload(workout_plan):
    """Build a Garmin-compatible workout payload."""
    steps = []
    step_order = [1]
    
    def add_steps(step_defs):
        for step_def in step_defs:
            if step_def.get('type') == 'repeat':
                nested_steps = []
                nested_order = 1
                for substep in step_def['steps']:
                    if substep.get('type') == 'repeat':
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
    
    add_steps(workout_plan.get('steps', []))

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

def init_garmin():
    try:
        token_path_mcp = os.path.expanduser("~/.garminconnect")
        token_path_garth = os.path.expanduser("~/.garth")
        
        token_path = None
        if os.path.exists(token_path_mcp):
            token_path = token_path_mcp
        elif os.path.exists(token_path_garth):
            token_path = token_path_garth
            
        if token_path:
             client = Garmin()
             client.login(token_path)
             return client
        return None
    except Exception as e:
        print(f"DEBUG: Garmin login failed: {e}")
        return None

def sync_workouts(plan_data):
    """
    Syncs the provided list of workouts to Garmin.
    plan_data: list of dicts with {date, title, description, steps, is_race}
    """
    client = init_garmin()
    if not client:
        return {"error": "Authentication failed. Check tokens in ~/.garminconnect"}

    results = []
    today = datetime.now().date()
    
    # Filter: future, has steps, not race, not vélotaf
    future_workouts = []
    for d in plan_data:
        try:
            # Handle both ISO string and Date objects if passed somehow
            if isinstance(d['date'], str):
                d_date = datetime.fromisoformat(d['date'].split('T')[0]).date()
            else:
                d_date = d['date']
                
            if (not d.get('is_race') and 
                d.get('steps') and len(d['steps']) > 0 and
                d_date >= today and 
                "Vélotaf" not in d['title']):
                future_workouts.append(d)
        except Exception:
            continue

    for workout in future_workouts:
        try:
            payload = build_workout_payload(workout)
            # Add date to title to make it unique
            payload['workoutName'] = f"{workout['date']} - {workout['title']}"
            
            res = client.upload_workout(payload)
            workout_id = res['workoutId']
            
            try:
                client.schedule_workout(workout_id, workout['date'])
            except AttributeError:
                url = f"workout-service/schedule/{workout_id}"
                client.garth.post("connectapi", url, json={"date": workout['date']})
            
            results.append({"title": workout['title'], "date": workout['date'], "status": "success"})
            time.sleep(0.5)
        except Exception as e:
            results.append({"title": workout['title'], "date": workout['date'], "status": "error", "message": str(e)})

    return {"status": "done", "results": results}
