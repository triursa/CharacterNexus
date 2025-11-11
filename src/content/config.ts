import { defineCollection, z } from 'astro:content';

const characters = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string().optional(),
  race: z.string().optional(),
  subrace: z.string().optional(),
    tags: z.array(z.string()).default([]).optional(),
    projects: z.array(z.string()).default([]).optional(),
    imageFileBase: z.string(),
  })
});

export const collections = { characters };
