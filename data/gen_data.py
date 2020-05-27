import json
import random
from faker import Faker

fake = Faker(['en_US', 'ru_RU'])
users = []
chat = []

for user_id in range(2, 99):
    users.append({
        'id': user_id,
        'name': fake.name(),
        'hand': random.choice((True, False)),
        'cam': random.choice((True, False)),
        'mic': random.choice((True, False)),
        'chat': []
    })

# Ведущий
users.append({
    'id': 1,
    'name': 'Иванов Иван Иванович',
    'cam': True,
    'mic': True,
    'leading': True,
})

for chat_id in range(1, 99):
    dt = fake.date_time_between(start_date='-100m', end_date='now')
    chat.append({
        'id': chat_id,
        'user_id': int(random.random() * 98) + 1,
        'time': dt.strftime('%H:%M'),
        'text': fake.sentence(nb_words=int(random.random() * 20) + 1)
    })
chat.sort(key=lambda x: x['time'])

print(users)
print(chat)

with open('users.json', 'w') as f:
    json.dump(users, f)

with open('chat.json', 'w') as f:
    json.dump(chat, f)
