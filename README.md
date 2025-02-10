# Mojo Demo

This is a demo for the Mojo project. It's a simple web server that displays the current, voltage and temperature of the attached Notecard.

## Getting Started

1. Clone the repository
2. Run the application:

```bash
balena build . -d raspberrypi5 -A aarch64
```

## Project Structure

- `cmd/`: Contains the main application entry points
- `internal/`: Private application and library code
- `pkg/`: Library code that's ok to use by external applications
