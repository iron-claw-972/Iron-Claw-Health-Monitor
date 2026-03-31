
import urllib.request
import os

url = 'http://localhost:8000/api/logs/upload'
filename = 'dummy.wpilog'
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

with open(filename, 'rb') as f:
    content = f.read()

body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
    'Content-Type: application/octet-stream\r\n\r\n'
).encode('utf-8') + content + f'\r\n--{boundary}--\r\n'.encode('utf-8')

req = urllib.request.Request(url, data=body)
req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

try:
    with urllib.request.urlopen(req) as response:
        print(f"Status: {response.status}")
        print(f"Response: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
