"""note-python CircuitPython example.

This file contains a complete working sample for using the note-python
library on a CircuitPython device.
"""
import sys
import time
import notecard

if sys.implementation.name != "circuitpython":
    raise Exception("Please run this example in a CircuitPython environment.")

import board  # noqa: E402
import busio  # noqa: E402
import digitalio  # noqa: E402

# Button
button = digitalio.DigitalInOut(board.BUTTON_USR)
button.direction = digitalio.Direction.INPUT
button.pull = digitalio.Pull.UP

# LED
led = digitalio.DigitalInOut(board.LED)
led.direction = digitalio.Direction.OUTPUT

# Variables to track button state
previous_state = button.value
debounce_time = 0.05  # 50ms debounce time

def configure_notecard(card, product_uid):
    """Submit a simple JSON-based request to the Notecard.

    Args:
        card (object): An instance of the Notecard class

    """
    req = {"req": "hub.set"}
    req["product"] = product_uid
    req["mode"] = "continuous"

    card.Transaction(req)


def get_mojo(card):
    req = {"req": "card.power"}
    rsp = card.Transaction(req)
    temp = rsp.get("temperature", 0)
    voltage = rsp.get("voltage", 0)
    mAh = rsp.get("milliamp_hours", 0)

    # if any of the values are 0, request the data again
    if temp == 0 or voltage == 0 or mAh == 0:
        time.sleep(1)
        return get_mojo(card)

    return temp, voltage, mAh

def check_usb_alert(card):
    req = {"req": "card.voltage"}
    rsp = card.Transaction(req)
    usb = rsp.get("usb", False)  # Default to False if "usb" key doesn't exist
    return not usb

def get_time(card):
    req = {"req": "card.time"}
    rsp = card.Transaction(req)
    time = rsp["time"]
    return time

def run_example(product_uid, card):
    """Connect to Notcard and run a transaction test."""

    # If success, configure the Notecard and send some data
    configure_notecard(card, product_uid)
    temp, voltage, mAh = get_mojo(card)

    battery_chemistry = "lipo"
    usb_alert = check_usb_alert(card)
    timestamp = get_time(card)

    req = {"req": "note.add"}
    req["sync"] = True
    req["body"] = {"temperature": temp, "voltage": voltage, "milliamp_hours": mAh, "battery_chemistry": battery_chemistry, "usb_alert": usb_alert, "timestamp": timestamp}

    card.Transaction(req)


if __name__ == "__main__":
    product_uid = "com.blues.abucknall:mojodemo"
    # Choose either UART or I2C for Notecard
    use_uart = False
    print("Opening port...")
    if use_uart:
        port = busio.UART(board.TX, board.RX, baudrate=9600,
                          receiver_buffer_size=128)
    else:
        port = busio.I2C(board.SCL, board.SDA)

    print("Opening Notecard...")
    if use_uart:
        card = notecard.OpenSerial(port, debug=True)
    else:
        card = notecard.OpenI2C(port, 0, 0, debug=True)

    last_run_time = time.monotonic()  # Initialize last_run_time
    
    while True:
        current_time = time.monotonic()  # Get current time
        current_state = button.value

        # The button is pressed when it reads False (due to pull-up configuration)
        if current_state != previous_state:
            time.sleep(debounce_time)  # Simple debounce

            # Check if the state is still different after debounce
            if button.value == current_state:
                # Button state has actually changed
                if current_state == False:
                    # Button is pressed (pulled to ground)
                    led.value = True
                    run_example(product_uid, card)
                    last_run_time = current_time  # Reset timer after manual run
                    led.value = False

        # Check if 5 minutes have passed since last run
        if current_time - last_run_time >= 10:  # 10 seconds
            led.value = True
            run_example(product_uid, card)
            last_run_time = current_time
            led.value = False

        previous_state = current_state

