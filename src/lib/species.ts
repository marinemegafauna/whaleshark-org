import { z } from 'zod';
import { parse } from 'yaml';

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  help: z.string().min(1).optional(),
  swatch: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  emphasis: z.boolean().optional(),
});

const fieldSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['text']).optional(),
    help: z.string().min(1).optional(),
    required: z.boolean(),
    default: z.string().optional(),
    options: z.array(optionSchema).optional(),
  })
  .superRefine((field, context) => {
    if (field.type !== 'text' && !field.options?.length) {
      context.addIssue({ code: 'custom', message: `Field "${field.id}" must define options` });
    }
    if (field.type === 'text' && field.options) {
      context.addIssue({ code: 'custom', message: `Text field "${field.id}" cannot define options` });
    }
    const seen = new Set<string>();
    for (const option of field.options ?? []) {
      if (seen.has(option.id)) {
        context.addIssue({ code: 'custom', message: `Duplicate option id "${option.id}" in field "${field.id}"` });
      }
      seen.add(option.id);
    }
    if (field.default && !field.options?.some((option) => option.id === field.default)) {
      context.addIssue({ code: 'custom', message: `Default "${field.default}" is not an option for field "${field.id}"` });
    }
  });

export const speciesSchema = z
  .object({
    id: z.string().min(1),
    version: z.string().min(1),
    common_name: z.string().min(1),
    scientific_name: z.string().min(1),
    wildbook_taxonomy: z.string().min(1),
    fields: z.array(fieldSchema).min(1),
  })
  .superRefine((species, context) => {
    const seen = new Set<string>();
    for (const field of species.fields) {
      if (seen.has(field.id)) {
        context.addIssue({ code: 'custom', message: `Duplicate field id "${field.id}"` });
      }
      seen.add(field.id);
    }
  });

export type SpeciesOption = z.infer<typeof optionSchema>;
export type SpeciesField = z.infer<typeof fieldSchema>;
export type Species = z.infer<typeof speciesSchema>;

export function parseSpecies(source: string): Species {
  const result = speciesSchema.safeParse(parse(source));
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid species schema — ${detail}`);
  }
  return result.data;
}

const sources = import.meta.glob('../../species/*.yaml', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;

const species = new Map<string, Species>();
for (const source of Object.values(sources)) {
  const parsed = parseSpecies(source);
  species.set(parsed.id, parsed);
}

export function getSpecies(id: string): Species {
  const result = species.get(id);
  if (!result) throw new Error(`Unknown species: ${id}`);
  return result;
}

export function listSpecies(): Species[] {
  return [...species.values()];
}
