import requests
import json
import time

# ---- Remplace ces infos ----
CLIENT_ID = '90376'
CLIENT_SECRET = '9a31b9066c2942feb97a9a3afb7e7f4d9f1da453'
REFRESH_TOKEN = '6f959f1765a38e9c5079db68853551af701725ad'
# ----------------------------

# Étape 1 : Récupère un token d’accès en utilisant le refresh_token
def get_access_token():
    
    response = requests.post(
        url='https://www.strava.com/api/v3/oauth/token',
        data={
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'grant_type': 'refresh_token',
            'refresh_token': REFRESH_TOKEN
        }
    )
    print("Réponse token:", response.status_code)
    print(response.text)
    if response.status_code != 200:
        raise Exception("Erreur de récupération du token")
    return response.json()['access_token']

    if response.status_code != 200:
        raise Exception("Erreur de récupération du token : " + response.text)
    return response.json()['access_token']

# Étape 2 : Télécharge toutes les activités de l'utilisateur
def get_all_activities(access_token):
    activities = []
    page = 1
    per_page = 100
    print(f"Accès à la page {page}")
    print("Code HTTP:", res.status_code)
    print("Réponse brute:", res.text)

    while True:
        url = f'https://www.strava.com/api/v3/athlete/activities'
        headers = {'Authorization': f'Bearer {access_token}'}
        params = {'page': page, 'per_page': per_page}
        res = requests.get(url, headers=headers, params=params)
        data = res


