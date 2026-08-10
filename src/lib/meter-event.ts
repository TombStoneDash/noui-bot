import Ajv from "ajv";
import meterEventSchema from "../../public/specs/mcp-billing-v1/meter-event.schema.json";

export type MeterEventStatus =
  | "success"
  | "error"
  | "timeout"
  | "rate_limited";

export interface MeterEventRequest {
  tool_id?: string;
  tool_name?: string;
  agent_id?: string;
  status?: MeterEventStatus;
  duration_ms?: number;
  input_tokens?: number;
  output_tokens?: number;
  metadata?: Record<string, unknown>;
}

const ajv = new Ajv({
  allErrors: true,
  strict: true,
  strictRequired: false,
});

const validate = ajv.compile<MeterEventRequest>(meterEventSchema);

export function validateMeterEventRequest(
  value: unknown,
): value is MeterEventRequest {
  return validate(value);
}
