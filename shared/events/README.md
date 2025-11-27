# Event Definitions

Shared event schemas for asynchronous communication between services.

## Events

### Irrigation Events
- `irrigation.scheduled` - New irrigation scheduled
- `irrigation.started` - Irrigation started
- `irrigation.completed` - Irrigation completed
- `irrigation.cancelled` - Irrigation cancelled

### Sensor Events
- `sensor.reading` - New sensor reading received
- `sensor.alert` - Sensor threshold alert

### Forecast Events
- `forecast.generated` - New forecast generated
- `forecast.alert` - Risk alert generated

### Optimization Events
- `optimization.recommendation` - New crop recommendation
- `optimization.planb` - Plan B triggered
