import fitdecode
import pandas as pd

file_path = "20674933700_ACTIVITY.fit"  # nom de ton fichier .fit

records = []
with fitdecode.FitReader(file_path) as fit:
    for frame in fit:
        if frame.frame_type == fitdecode.FIT_FRAME_DATA and frame.name == "record":
            rec = {d.name: d.value for d in frame.fields}
            if rec.get("distance") and rec.get("heart_rate"):
                records.append({
                    "timestamp": rec.get("timestamp"),
                    "distance_m": rec.get("distance"),
                    "speed_mps": rec.get("speed"),
                    "hr": rec.get("heart_rate")
                })

df = pd.DataFrame(records)
df = df.sort_values("timestamp").reset_index(drop=True)
df["elapsed_s"] = (df["timestamp"] - df["timestamp"].iloc[0]).dt.total_seconds()

# Lissage de la vitesse
df["speed_smooth"] = df["speed_mps"].rolling(10, min_periods=1, center=True).mean()

# Détection des efforts
threshold = df["speed_smooth"].quantile(0.6)
df["phase"] = (df["speed_smooth"] > threshold).astype(int)

segments = []
in_effort = False
start_idx = None

for i, phase in enumerate(df["phase"]):
    if phase == 1 and not in_effort:
        in_effort = True
        start_idx = i
    elif phase == 0 and in_effort:
        in_effort = False
        end_idx = i
        dist = df["distance_m"].iloc[end_idx] - df["distance_m"].iloc[start_idx]
        if 200 < dist < 400:
            seg = df.iloc[start_idx:end_idx]
            segments.append({
                "rep": len(segments) + 1,
                "distance_m": dist,
                "duree_s": seg["elapsed_s"].iloc[-1] - seg["elapsed_s"].iloc[0],
                "vitesse_moy": dist / (seg["elapsed_s"].iloc[-1] - seg["elapsed_s"].iloc[0]),
                "fc_moy": seg["hr"].mean(),
                "fc_max": seg["hr"].max()
            })

laps = pd.DataFrame(segments)
laps["allure_sec_km"] = 1000 / laps["vitesse_moy"]
laps["allure_min_km"] = laps["allure_sec_km"] / 60

laps.to_csv("laps.csv", index=False)
print("✅ Fichier 'laps.csv' généré avec succès !")
