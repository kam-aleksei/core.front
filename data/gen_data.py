import json
import random
from faker import Faker

fake = Faker(['en_US', 'ru_RU'])
users = []
chat = {}

for user_id in range(2, 99):
    users.append({
        'id': user_id,
        'name': fake.name(),
        'hand': random.choice((True, False)),
        'cam': random.choice((True, False)),
        'mic': random.choice((True, False)),
    })

# Ведущий
users.append({
    'id': 1,
    'name': 'Иванов Иван Иванович',
    'cam': True,
    'mic': True,
    'leading': True,
})

    # user_id = int(random.random() * 100)
    # if user_id not in users.keys():

print(users)

with open('users.json', 'w') as f:
    json.dump(users, f)
