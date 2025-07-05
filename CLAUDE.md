# Free@Home API Service

## Datapoint Usage

**Input Datapoints (idp):** Used to send commands to devices. These are action-oriented datapoints that trigger device operations.

**Output Datapoints (odp):** Represent the current state of devices and are read-only. These reflect the actual status of the device.

When using the `setDeviceState` function, always use input datapoints (idp) to control devices. Output datapoints (odp) should only be used for reading the current state.