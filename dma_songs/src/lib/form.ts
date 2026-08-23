import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType, ZodTypeDef } from "zod";

/**
 * A zodResolver that keeps the schema's OUTPUT type.
 *
 * Why this exists: when a form uses a resolver, react-hook-form hands
 * `handleSubmit` the values the *resolver* returned, not the raw fields. Our
 * schemas transform on the way through — empty strings become `null`, numeric
 * inputs get coerced — so by the time the submit handler runs, the data is
 * already in output shape.
 *
 * That caused a real bug: the submit handlers re-parsed the values with the
 * same schema, which failed, because `null` is not valid *input* to a field
 * whose output is `null`. Every save silently turned into a ZodError and the
 * user saw only "didn't save" with no request ever reaching the database.
 *
 * The cast is needed because @hookform/resolvers v3 types zodResolver with
 * two generics and cannot express the transformed type. Passing the schema's
 * input and output separately is what makes `useForm<In, unknown, Out>` line
 * up, so the submit handler is correctly typed as receiving the output and
 * nobody is tempted to parse it twice.
 */
export function transformingResolver<TInput extends FieldValues, TOutput>(
  schema: ZodType<TOutput, ZodTypeDef, TInput>,
): Resolver<TInput, unknown, TOutput> {
  return zodResolver(schema) as unknown as Resolver<TInput, unknown, TOutput>;
}
