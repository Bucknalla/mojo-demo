# Mojo Demo

This is a demo for the Mojo project. It's a simple web server that displays the current, voltage and temperature of the attached Notecard.

## Getting Started

1. Clone the repository
2. Build the application:

```bash
docker build --platform linux/amd64 -t mojo-demo .
```

3. Run the application:

```bash
docker run -p 8080:8080 -p 8443:8443 mojo-demo
```

The project is also hosted on [digitalocean](https://jellyfish-app-x52i3.ondigitalocean.app/) so there's no need to host it yourself.

## Project Structure

- `server`: Golang web server
  - `cmd/`: Contains the main application entry points
  - `internal/`: Private application and library code
  - `pkg/`: Library code that's ok to use by external applications
  - `static/`: Javascript, CSS and HTML
- `firmware/`: Firmware for Swan
  - `cpy/`: CircuitPython Firmware (use this one)
  - `zephyr/`: Zephyr Firmware
