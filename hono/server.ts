import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();
const eventBusName = "test-event-bus";
const eventBridgeClient = new EventBridgeClient({ region: "eu-west-2" });

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

// curl -X POST http://localhost:3000/publish
app.post("/publish", async (c) => {
  try {
    const event = {
      Source: "hono.api",
      DetailType: "SampleEvent",
      Detail: JSON.stringify({ message: "Hello from Hono!" }),
      EventBusName: eventBusName,
    };

    const command = new PutEventsCommand({ Entries: [event] });
    const response = await eventBridgeClient.send(command);

    if (response.FailedEntryCount === 0) {
      return c.json({ message: "Event published successfully!" });
    } else {
      return c.json(
        { message: "Failed to publish event.", details: response },
        500
      );
    }
  } catch (error) {
    return c.json({ message: "Error publishing event.", error }, 500);
  }
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
