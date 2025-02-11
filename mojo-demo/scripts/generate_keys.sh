#! /bin/bash

# Generate a self-signed SSL certificate
openssl req -new -newkey rsa:4096 -days 365 -nodes -x509 \
    -subj "/C=US/ST=California/L=San Francisco/O=Your Company/OU=IT/CN=localhost" \
    -keyout ssl/key.pem -out ssl/cert.pem
