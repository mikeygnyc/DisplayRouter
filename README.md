# Display Router

## Summary

A system that allows one or more producers of data to feed one or more RGB LED matrix displays with a controlling router/formatter in the middle.

## Components

1. **Client API**: A set of APIs that allow various producers of data to connect to the router/formatter server, identify themselves, and send payloads for display.

2. **Router/Formatter Server**: A server that uses rules and templates to determine what client data should be formatted and routed to which display server.

3. **Display Server**: A Python-based server running on a Raspberry Pi that listens for incoming messages from clients (data producers) and renders them on an RGB LED matrix display using the `rgbmatrix` library.

4. **Management Interface**: A web-based interface for managing clients, reviewing logs, and setting rules for display priorities and transitions.

### Client API
- Provides endpoints for clients to connect, identify themselves, list their available payload types, and send data.
- Clients may specify a format or template to use for their data.

### Router/Formatter Server
- Receives data from clients, applies formatting rules, and routes the data to the appropriate display based on priority rules.
- Generates any transition data needed for the display servers to render.

### Display Server
- Listens for incoming connections from router/formatter.
- Renders messages on the RGB LED matrix display based on received payloads.

### Management Interface
- Allows administrators to manage clients, set display templates, and define rules for how data is displayed including priority to certain sources, transition types between payload (instant, delayed, etc).
- Provides logging and monitoring capabilities for the system.

## Implementation Details
- The display server will be implemented using Python, utilizing the `rgbmatrix` library's python bindings for controlling the LED matrix display. This shall run on a Raspberry Pi.
- The router/formatter server will also be implemented in Python, using a web framework such as Flask or FastAPI to handle incoming client connections and manage routing logic.
- The management interface will be a web application, potentially built with a frontend framework like React or Vite.
- The client API will be designed to allow for easy integration by various data producers, with clear documentation on how to connect and send data.

## Testing

- Unit tests will be written for each component of the system to ensure functionality and reliability.
- Integration tests will be conducted to verify that the components work together as expected, particularly the communication between the router/formatter server and the display server, as well as the client API interactions.
- End-to-end tests will be performed to simulate real-world usage scenarios, ensuring that data flows correctly from clients to the display and that the management interface functions as intended.

## Conclusion

This system will provide a flexible and scalable solution for displaying data from various producers on RGB LED matrix displays, with a robust management interface for controlling the display logic and monitoring the system's performance.
