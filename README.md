# free@home MCP Server

A TypeScript-based MCP (Model Context Protocol) server that provides AI agents with access to ABB/Busch-Jaeger free@home smart home system data and control capabilities.

## Features

- Connect to the free@home System Access Point via the [`freeathome-api`](https://github.com/henry-spanka/freeathome-api) package (XMPP/WebSocket)
- Real-time device state updates from the SysAP
- Expose free@home functionality through MCP tools for AI agents
- Get device information and status
- Control devices and set datapoints
- TypeScript support with full type safety

## Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

Set the following environment variables:

- `FREEATHOME_HOSTNAME`: IP address or hostname of your free@home System Access Point (required)
- `FREEATHOME_USERNAME`: Username configured on the SysAP (default: `admin`)
- `FREEATHOME_PASSWORD`: Password for authentication (required)

Example:

```bash
export FREEATHOME_HOSTNAME=192.168.1.100
export FREEATHOME_USERNAME=Installer
export FREEATHOME_PASSWORD=your-password
```

**Note:** The user must be created on the System Access Point's web interface. The library communicates over XMPP/WebSocket and requires SysAP firmware >= 2.3.1.

## Usage

### Running the MCP Server

```bash
npm start
```

The server will connect to the SysAP, wait for the initial device data, then start listening for MCP connections on HTTP (default port 3000).

### Development Mode

```bash
npm run dev
```

## Available MCP Tools

The server provides the following tools for AI agents:

### `get_devices`

Get all devices from the free@home system.

**Parameters:** None

**Returns:** JSON array of all devices with their channels, including display names, rooms, and floors.

### `get_device_info`

Get detailed information about a specific device.

**Parameters:**

- `deviceId` (string): The serial number of the device

**Returns:** JSON object with device details and channel metadata.

### `set_device_state`

Control a device by setting its state.

**Parameters:**

- `deviceId` (string): The serial number of the device
- `channelId` (string): The channel ID (e.g., `ch0000`)
- `datapoint` (string): The datapoint to set (e.g., `idp0000`)
- `value` (string): The value to set (e.g., `1` for on, `0` for off)

**Important:** Use input datapoints (`idp`) to send commands to devices. Output datapoints (`odp`) represent the current state and are read-only.

**Returns:** Success status

### `get_datapoints`

Get all datapoints for a specific device and channel.

**Parameters:**

- `deviceId` (string): The serial number of the device
- `channelId` (string): The channel ID (e.g., `ch0000`)

**Returns:** JSON object with `inputs` (idp) and `outputs` (odp) datapoints and their current values.

## Integration with AI Agents

This MCP server can be integrated with AI agents that support the Model Context Protocol. The server provides a standardized way for AI agents to:

1. Discover available smart home devices
2. Query device status and capabilities
3. Control devices and modify their state
4. Access detailed device information and datapoints

## Development

### Scripts

- `npm run build` - Build the TypeScript project
- `npm run start` - Start the compiled server
- `npm run dev` - Start in development mode with hot reload
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Project Structure

- `src/index.ts` - Main MCP server implementation with HTTP transport
- `src/freehome-service.ts` - free@home connection and API wrapper using `freeathome-api`
- `dist/` - Compiled JavaScript output
- `package.json` - Project configuration and dependencies

## Requirements

- Node.js >= 18.0.0
- TypeScript 5.0+
- ABB/Busch-Jaeger free@home System Access Point with firmware >= 2.3.1

## License

MIT
