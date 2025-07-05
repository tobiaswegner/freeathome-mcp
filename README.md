# free@home MCP Server

A TypeScript-based MCP (Model Context Protocol) server that provides AI agents with access to Busch-Jaeger free@home smart home system data and control capabilities.

## Features

- Connect to free@home system via the official `@busch-jaeger/free-at-home` package
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

- `FREEHOME_HOST`: IP address or hostname of your free@home system (default: localhost)
- `FREEHOME_USERNAME`: Username for authentication (default: installer)
- `FREEHOME_PASSWORD`: Password for authentication (required)

Example:

```bash
export FREEHOME_HOST=192.168.1.100
export FREEHOME_USERNAME=installer
export FREEHOME_PASSWORD=your-password
```

## Usage

### Running the MCP Server

```bash
npm start
```

The server will start and listen for MCP connections via stdio.

### Development Mode

```bash
npm run dev
```

## Available MCP Tools

The server provides the following tools for AI agents:

### `get_devices`

Get all devices from the free@home system.

**Parameters:** None

**Returns:** JSON object containing all devices

### `get_device_info`

Get detailed information about a specific device.

**Parameters:**

- `deviceId` (string): The ID of the device

**Returns:** JSON object with device details

### `set_device_state`

Control a device by setting its state.

**Parameters:**

- `deviceId` (string): The ID of the device
- `channelId` (string): The channel ID of the device
- `datapoint` (string): The datapoint to set (e.g., "idp0000" for executing a command)
- `value` (string): The value to set

**Important:** Use input datapoints (idp) to send commands to devices. Output datapoints (odp) represent the current state and are read-only.

**Returns:** Success status

### `get_datapoints`

Get all datapoints for a specific device and channel.

**Parameters:**

- `deviceId` (string): The ID of the device
- `channelId` (string): The channel ID

**Returns:** JSON object with input and output datapoints

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

- `src/index.ts` - Main MCP server implementation
- `src/freehome-service.ts` - free@home connection and API wrapper
- `dist/` - Compiled JavaScript output
- `package.json` - Project configuration and dependencies

## Requirements

- Node.js >= 18.0.0
- TypeScript 5.0+
- Access to a Busch-Jaeger free@home system

## License

MIT
