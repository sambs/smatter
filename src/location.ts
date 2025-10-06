import * as z from "zod";

export type Location = {
  name: string;
  lat: number;
  long: number;
  elevation: number;
  tz: string;
};

const london: Location = {
  name: "London",
  lat: 51.5287398,
  long: -0.2664049,
  tz: "Europe/London",
  elevation: 15,
};

const LocationEnvSchema = z.object({
  LOCATION: z.string().optional(),
  LAT: z.coerce.number().optional(),
  LONG: z.coerce.number().optional(),
  TZ: z.string().optional(),
  ELEVATION: z.coerce.number().optional(),
});

export function locationFromEnv(): Location {
  const env = LocationEnvSchema.parse(process.env);

  return {
    name: env.LOCATION ?? london.name,
    lat: env.LAT ?? london.lat,
    long: env.LONG ?? london.long,
    tz: env.TZ ?? london.tz,
    elevation: env.ELEVATION ?? london.elevation,
  };
}
