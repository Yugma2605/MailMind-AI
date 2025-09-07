import { Router, Request, Response } from 'express';
import { supabase } from '../supabase/config.js';
import { requireAuth } from '../utils/auth.js';

const router = Router();

// POST /categories
router.post('/', requireAuth(), async (req: Request, res: Response) => {
  const user_id = (req as any).user_id; // comes from requireAuth
  const { categories } = req.body; // expect an array of { name, description }

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'At least one category is required' });
  }

  // Validate each category
  const validCategories = categories.filter((c: any) => c.name);
  if (validCategories.length === 0) {
    return res.status(400).json({ error: 'Each category must have a name' });
  }

  // Add user_id to each category
  const categoriesToInsert = validCategories.map((c: any) => ({
    user_id,
    name: c.name,
    description: c.description || null,
  }));

  try {
    const { data, error } = await supabase
      .from('categories')
      .insert(categoriesToInsert)
      .select();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ categories: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/', requireAuth(), async (req: Request, res: Response) => {
  const user_id = (req as any).user_id;

  const { data: categories, error } = await supabase
    .from("categories")
    .select("*")
    .eq("user_id", user_id);

  if (error) {
    console.error("Supabase error fetching categories:", error.message);
    return res.status(500).json({ categories: [] }); // Always return array
  }

  if (!categories || categories.length === 0) {
    const defaultCategories = [
      {
        user_id,
        name: "Applied Jobs",
        description:
          "Emails that confirm your job applications have been received, including application IDs, dates, and position details.",
      },
      {
        user_id,
        name: "Rejected Jobs",
        description:
          "Emails notifying you about job rejections, declined applications, or closed positions.",
      },
      {
        user_id,
        name: "Next Steps",
        description:
          "Emails with follow-up instructions such as interview scheduling, coding tests, or further document requests.",
      },
      {
        user_id,
        name: "OTP Emails",
        description:
          "Emails that contain one-time passwords (OTPs) or verification codes for login, sign-up, or transaction authentication.",
      },
      {
        user_id,
        name: "New Job Matches or Recommendations",
        description:
          "Emails from job boards, recruiters, or platforms suggesting job roles aligned with your profile or previous searches.",
      },
    ];

    const { data: seeded, error: seedError } = await supabase
      .from("categories")
      .insert(defaultCategories)
      .select("*");

    if (seedError) {
      console.error("Seeding error:", seedError.message);
      return res.status(500).json({ categories: [] });
    }

    return res.json(seeded); // ✅ array
  }

  return res.json(categories); // ✅ array
});

// PUT /categories/:id
router.put('/:id', requireAuth(), async (req: Request, res: Response) => {
  const user_id = (req as any).user_id;
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    const { data, error } = await supabase
      .from('categories')
      .update({ name, description, updated_at: new Date() })
      .eq('id', id)
      .eq('user_id', user_id)
      .select();

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Category not found or not yours' });
    }

    res.json(data[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /categories/:id
router.delete('/:id', requireAuth(), async (req: Request, res: Response) => {
  const user_id = (req as any).user_id;
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


export default router;
